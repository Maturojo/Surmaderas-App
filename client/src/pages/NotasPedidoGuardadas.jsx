import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  actualizarOperacionNota,
  eliminarNotaPedido,
  listarNotasPedido,
  listarProveedores,
  obtenerNotaPedido,
} from "../services/notasPedido";
import NotaDetalleModal from "../features/notasPedidoListado/components/NotaDetalleModal";
import { getNotaClienteNombre, getNotaTotal } from "../utils/notaPedido";
import {
  buildNotaPedidoPrintData,
  copyFileToClipboard,
  downloadFile,
  generateNotaPedidoImageFile,
  openNotaPedidoPrintWindow,
  openWhatsappText,
} from "../utils/notaPedidoPrint";
import { colorProveedorPorNombre, estiloProveedor } from "../utils/proveedorColor";
import "../css/notas-guardadas.css";

const ESTADOS_OPERATIVOS = ["Pendiente", "En taller", "Enviado a proveedor", "Finalizado"];

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(isoOrYmd) {
  if (!isoOrYmd) return "-";
  if (String(isoOrYmd).includes("-") && String(isoOrYmd).length <= 10) {
    return String(isoOrYmd).split("-").reverse().join("/");
  }
  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-AR");
}

function estadoOperativoClase(estado) {
  if (estado === "Finalizado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "En taller") return "bg-amber-50 text-amber-700 border-amber-200";
  if (estado === "Enviado a proveedor") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function normalizarWhatsapp(telefono = "") {
  const digits = String(telefono || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  return `549${digits}`;
}

function construirMensajeProveedor(nota, proveedor, observacion) {
  const items = Array.isArray(nota?.items) ? nota.items : [];
  const detalle = items
    .slice(0, 6)
    .map((item) => {
      const descripcion = item?.detalle || item?.descripcion || item?.nombre || item?.producto || "Item";
      const cantidad = Number(item?.cantidad || 1);
      return `- ${descripcion} x${cantidad}`;
    })
    .join("\n");

  const extraItems = items.length > 6 ? `\n- ... y ${items.length - 6} item(s) más` : "";
  const observacionTexto = observacion?.trim() ? `\n\nObservación:\n${observacion.trim()}` : "";

  return [
    `Hola ${proveedor?.contacto || proveedor?.nombre || ""}, te envío la nota de pedido ${nota?.numero || ""}.`,
    "",
    `Cliente: ${getNotaClienteNombre(nota)}`,
    `Entrega: ${nota?.entrega || "-"}`,
    `Vendedor: ${nota?.vendedor || "-"}`,
    `Total: $${toARS(getNotaTotal(nota))}`,
    "",
    "Detalle:",
    detalle || "- Sin items cargados",
    `${extraItems}${observacionTexto}`.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function construirMensajeCliente(nota) {
  return [
    `Hola ${getNotaClienteNombre(nota)}, te compartimos la nota de pedido ${nota?.numero || ""}.`,
    "",
    `Entrega estimada: ${nota?.entrega || "-"}`,
    `Vendedor: ${nota?.vendedor || "-"}`,
    `Total: $${toARS(getNotaTotal(nota))}`,
    "",
    "Si necesitás alguna corrección o confirmación, respondé por este medio.",
  ].join("\n");
}

async function enviarNotaWhatsappConAdjunto({ nota, telefonoWhatsapp, mensaje, etiquetaDestino }) {
  openWhatsappText(telefonoWhatsapp, mensaje);

  const file = await generateNotaPedidoImageFile(buildNotaPedidoPrintData(nota));
  const copied = await copyFileToClipboard(file);
  downloadFile(file);

  await Swal.fire({
    icon: "info",
    title: "WhatsApp abierto",
    text:
      copied
        ? `Abrimos el chat de ${etiquetaDestino} y dejamos la nota copiada al portapapeles. Pegala en WhatsApp con Ctrl+V. También la descargamos como respaldo.`
        : `Abrimos el chat de ${etiquetaDestino} y descargamos la imagen de la nota para adjuntarla en WhatsApp.`,
  });
}

export default function NotasPedidoGuardadas() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState("");

  const [gestionOpen, setGestionOpen] = useState(false);
  const [gestionNota, setGestionNota] = useState(null);
  const [estadoOperativo, setEstadoOperativo] = useState("Pendiente");
  const [asignaciones, setAsignaciones] = useState([]);
  const [proveedorIdNuevo, setProveedorIdNuevo] = useState("");
  const [observacionNueva, setObservacionNueva] = useState("");
  const [enviarWhatsappNuevo, setEnviarWhatsappNuevo] = useState(false);
  const [proveedorPromptOpen, setProveedorPromptOpen] = useState(false);
  const [savingGestion, setSavingGestion] = useState(false);
  const [comprobantePreviewUrl, setComprobantePreviewUrl] = useState("");
  const [comprobantePreviewFile, setComprobantePreviewFile] = useState(null);
  const [comprobantePreviewLoading, setComprobantePreviewLoading] = useState(false);
  const [comprobantePreviewOpen, setComprobantePreviewOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [data, proveedoresData] = await Promise.all([
        listarNotasPedido({ q: "", page: 1, limit: 300, guardada: true }),
        listarProveedores(),
      ]);
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
      setProveedores(proveedoresData);
    } catch (e) {
      setErr(e?.message || "Error cargando notas guardadas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function abrirDetalle(id) {
    setOpenId(id);
    setDetalle(null);
    setDetalleError("");
    setDetalleLoading(true);

    try {
      const item = await obtenerNotaPedido(id);
      setDetalle(item);
    } catch (e) {
      setDetalleError(e?.message || "Error cargando vista previa");
    } finally {
      setDetalleLoading(false);
    }
  }

  function cerrarDetalle() {
    setOpenId(null);
    setDetalle(null);
    setDetalleError("");
    setDetalleLoading(false);
  }

  async function abrirGestion(nota) {
    try {
      const completa = await obtenerNotaPedido(nota._id);
      setGestionNota(completa);
      setEstadoOperativo(completa?.estadoOperativo || "Pendiente");
            setAsignaciones(
        Array.isArray(completa?.proveedores)
          ? completa.proveedores.map((item) => ({
              proveedorId: item.proveedorId,
              nombre: item.nombre,
              color: item.color || colorProveedorPorNombre(item.nombre),
              observacion: item.observacion || "",
              enviadoWhatsapp: Boolean(item?.enviadoWhatsapp),
            }))
          : []
      );
      setProveedorIdNuevo("");
      setObservacionNueva("");
      setEnviarWhatsappNuevo(false);
      setProveedorPromptOpen(false);
      setGestionOpen(true);
    } catch (e) {
      setErr(e?.message || "No se pudo abrir la gestion operativa");
    }
  }

  function cerrarGestion() {
    if (comprobantePreviewUrl) {
      URL.revokeObjectURL(comprobantePreviewUrl);
    }
    setGestionOpen(false);
    setGestionNota(null);
    setEstadoOperativo("Pendiente");
    setAsignaciones([]);
    setProveedorIdNuevo("");
    setObservacionNueva("");
    setEnviarWhatsappNuevo(false);
    setProveedorPromptOpen(false);
    setSavingGestion(false);
    setComprobantePreviewUrl("");
    setComprobantePreviewFile(null);
    setComprobantePreviewLoading(false);
    setComprobantePreviewOpen(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function prepararPreview() {
      if (!gestionOpen || !gestionNota) {
        setComprobantePreviewLoading(false);
        return;
      }

      setComprobantePreviewLoading(true);

      try {
        const file = await generateNotaPedidoImageFile(buildNotaPedidoPrintData(gestionNota));
        if (cancelled) return;

        const nextUrl = URL.createObjectURL(file);
        setComprobantePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        setComprobantePreviewFile(file);
      } catch {
        if (!cancelled) {
          setComprobantePreviewUrl("");
          setComprobantePreviewFile(null);
        }
      } finally {
        if (!cancelled) setComprobantePreviewLoading(false);
      }
    }

    prepararPreview();

    return () => {
      cancelled = true;
    };
  }, [gestionOpen, gestionNota]);

  const guardadas = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((n) => {
        if (!qq) return true;
        return (
          String(n?.numero || "").toLowerCase().includes(qq) ||
          getNotaClienteNombre(n).toLowerCase().includes(qq) ||
          String(n?.vendedor || "").toLowerCase().includes(qq) ||
          String(n?.entrega || "").toLowerCase().includes(qq) ||
          String(n?.estado || "").toLowerCase().includes(qq) ||
          String(n?.estadoOperativo || "").toLowerCase().includes(qq) ||
          (Array.isArray(n?.proveedores) ? n.proveedores.some((p) => String(p?.nombre || "").toLowerCase().includes(qq)) : false)
        );
      })
      .sort((a, b) => {
        const da = new Date(a?.caja?.fecha || a?.updatedAt || 0).getTime();
        const db = new Date(b?.caja?.fecha || b?.updatedAt || 0).getTime();
        return db - da;
      });
  }, [items, q]);

  const resumen = useMemo(() => {
    const totalNotas = guardadas.length;
    const enTaller = guardadas.filter((item) => item?.estadoOperativo === "En taller").length;
    const enProveedor = guardadas.filter((item) => item?.estadoOperativo === "Enviado a proveedor").length;
    const finalizadas = guardadas.filter((item) => item?.estadoOperativo === "Finalizado").length;
    return { totalNotas, enTaller, enProveedor, finalizadas };
  }, [guardadas]);

  const guardadasPrincipales = useMemo(
    () => guardadas.filter((item) => item?.estadoOperativo !== "Enviado a proveedor"),
    [guardadas]
  );

  const guardadasProveedor = useMemo(
    () => guardadas.filter((item) => item?.estadoOperativo === "Enviado a proveedor"),
    [guardadas]
  );

  async function borrarNota(nota) {
    const ok = window.confirm(`Se va a borrar la nota ${nota?.numero || ""}.`);
    if (!ok) return;

    await eliminarNotaPedido(nota._id);
    if (openId === nota._id) cerrarDetalle();
    if (gestionNota?._id === nota._id) cerrarGestion();
    await load();
  }

  function agregarProveedorAsignado() {
    const proveedor = proveedores.find((item) => String(item._id) === String(proveedorIdNuevo));
    if (!proveedor) return;

    setAsignaciones((prev) => {
      const next = prev.filter((item) => String(item.proveedorId) !== String(proveedor._id));
      return [
        ...next,
        {
          proveedorId: proveedor._id,
          nombre: proveedor.nombre,
          color: proveedor.color || colorProveedorPorNombre(proveedor.nombre),
          observacion: observacionNueva.trim(),
          enviadoWhatsapp: enviarWhatsappNuevo,
        },
      ];
    });
    setEstadoOperativo("Enviado a proveedor");

    if (enviarWhatsappNuevo) {
      const telefonoWhatsapp = normalizarWhatsapp(proveedor?.telefono);
      if (!telefonoWhatsapp) {
        Swal.fire({
          icon: "warning",
          title: "Proveedor sin teléfono",
          text: "Este proveedor no tiene teléfono cargado para enviarle la nota por WhatsApp.",
        });
      } else if (typeof window !== "undefined") {
        const mensaje = construirMensajeProveedor(gestionNota, proveedor, observacionNueva);
        enviarNotaWhatsappConAdjunto({
          nota: gestionNota,
          telefonoWhatsapp,
          mensaje,
          etiquetaDestino: proveedor?.nombre || "proveedor",
        }).catch(async () => {
          openWhatsappText(telefonoWhatsapp, mensaje);
          await Swal.fire({
            icon: "info",
            title: "WhatsApp abierto",
            text: "No pudimos preparar la imagen automáticamente, pero dejamos el mensaje listo para enviar.",
          });
        });
      }
    }

    setProveedorIdNuevo("");
    setObservacionNueva("");
    setEnviarWhatsappNuevo(false);
    setProveedorPromptOpen(false);
  }

  function abrirPromptProveedor() {
    setEstadoOperativo("Enviado a proveedor");
    setEnviarWhatsappNuevo(false);
    setProveedorPromptOpen(true);
  }

  function enviarClienteWhatsapp() {
    const telefonoWhatsapp = normalizarWhatsapp(gestionNota?.cliente?.telefono);
    if (!telefonoWhatsapp) {
      Swal.fire({
        icon: "warning",
        title: "Cliente sin teléfono",
        text: "La nota no tiene un teléfono válido para enviar por WhatsApp.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      const mensaje = construirMensajeCliente(gestionNota);
      enviarNotaWhatsappConAdjunto({
        nota: gestionNota,
        telefonoWhatsapp,
        mensaje,
        etiquetaDestino: getNotaClienteNombre(gestionNota),
      }).catch(async () => {
        openWhatsappText(telefonoWhatsapp, mensaje);
        await Swal.fire({
          icon: "info",
          title: "WhatsApp abierto",
          text: "No pudimos preparar la imagen automáticamente, pero dejamos el mensaje listo para enviar.",
        });
      });
    }
  }

  async function imprimirComprobanteCliente() {
    if (!gestionNota) return;
    openNotaPedidoPrintWindow(buildNotaPedidoPrintData(gestionNota));
  }

  async function copiarComprobanteCliente() {
    if (!comprobantePreviewFile) {
      await Swal.fire({
        icon: "warning",
        title: "Comprobante no listo",
        text: "Esperá un segundo a que se genere la imagen y volvé a intentar.",
      });
      return;
    }

    const copied = await copyFileToClipboard(comprobantePreviewFile);
    if (copied) {
      await Swal.fire({
        icon: "success",
        title: "Imagen copiada",
        text: "Ya podés pegar el comprobante con Ctrl+V.",
        timer: 1400,
        showConfirmButton: false,
      });
      return;
    }

    downloadFile(comprobantePreviewFile);
    await Swal.fire({
      icon: "info",
      title: "No se pudo copiar",
      text: "Tu navegador no permitió copiar la imagen. La descargamos para que la uses igual.",
    });
  }

  function abrirComprobantePreview() {
    if (!comprobantePreviewUrl || comprobantePreviewLoading) return;
    setComprobantePreviewOpen(true);
  }

  function cerrarComprobantePreview() {
    setComprobantePreviewOpen(false);
  }

  function cerrarPromptProveedor() {
    setProveedorPromptOpen(false);
  }

  function quitarProveedorAsignado(proveedorId) {
    setAsignaciones((prev) => prev.filter((item) => String(item.proveedorId) !== String(proveedorId)));
  }

  async function guardarGestion() {
    if (!gestionNota?._id) return;
    if (estadoOperativo === "Enviado a proveedor" && asignaciones.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Faltan proveedores",
        text: "Si la nota va a proveedor, tenés que asignar al menos uno.",
      });
      return;
    }

    try {
      setSavingGestion(true);
      await actualizarOperacionNota(gestionNota._id, {
        estadoOperativo,
        proveedores: asignaciones,
      });
      await load();
      cerrarGestion();
      await Swal.fire({
        icon: "success",
        title: "Operacion actualizada",
        text: "La nota se actualizo correctamente.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: e?.message || "No se pudo guardar la gestion operativa",
      });
    } finally {
      setSavingGestion(false);
    }
  }

  return (
    <div className="ng-page">
      <section className="ng-hero">
        <div className="ng-heroCopy">
          <span className="ng-kicker">Caja y planificación</span>
          <h1 className="ng-title">Notas guardadas</h1>
          <p className="ng-subtitle">
            Organizá qué sale al taller, qué va a proveedores y qué ya quedó finalizado sin perder
            de vista el estado comercial de cada pedido.
          </p>
        </div>
        <div className="ng-stats">
          <article className="ng-statCard">
            <span className="ng-statLabel">Notas visibles</span>
            <strong className="ng-statValue">{resumen.totalNotas}</strong>
          </article>
          <article className="ng-statCard">
            <span className="ng-statLabel">En taller</span>
            <strong className="ng-statValue">{resumen.enTaller}</strong>
          </article>
          <article className="ng-statCard">
            <span className="ng-statLabel">A proveedor</span>
            <strong className="ng-statValue">{resumen.enProveedor}</strong>
          </article>
          <article className="ng-statCard">
            <span className="ng-statLabel">Finalizadas</span>
            <strong className="ng-statValue">{resumen.finalizadas}</strong>
          </article>
        </div>
      </section>

      <section className="ng-toolbar">
        <div className="ng-search">
          <span className="ng-searchIcon" aria-hidden="true">
            ⌕
          </span>
          <input
            className="ng-searchInput"
            placeholder="Buscar por número, cliente, vendedor, estado o proveedor"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="ng-refreshBtn" onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </section>

      {err ? (
        <div className="ng-error">
          {err}
        </div>
      ) : null}

      <section className="ng-tableCard">
        <div className="ng-tableHead">
          <div>
            <h2 className="ng-sectionTitle">Plan del día</h2>
            <p className="ng-sectionSub">Visualizá rápido destino, estado operativo y total de cada nota.</p>
          </div>
          <div className="ng-resultsPill">
            {guardadasPrincipales.length} {guardadasPrincipales.length === 1 ? "nota" : "notas"}
          </div>
        </div>

        <div className="ng-tableWrap">
          <table className="ng-table">
            <thead>
            <tr>
              <th>Numero</th>
              <th>Fecha</th>
              <th>Entrega</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Estado</th>
              <th>Operativo</th>
              <th>Destino</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td className="ng-tableMessage" colSpan={10}>Cargando...</td></tr>
            ) : guardadasPrincipales.length === 0 ? (
              <tr><td className="ng-tableMessage" colSpan={10}>No hay notas guardadas.</td></tr>
            ) : (
              guardadasPrincipales.map((n) => (
                <tr key={n?._id || n?.id || n?.numero}>
                  <td className="ng-cellStrong">{n?.numero ?? "-"}</td>
                  <td>{fmtDate(n?.fecha)}</td>
                  <td>{n?.entrega ?? "-"}</td>
                  <td>
                    <div className="ng-clientCell">
                      <strong>{getNotaClienteNombre(n)}</strong>
                      <span>{n?.cliente?.telefono || "Sin telefono"}</span>
                    </div>
                  </td>
                  <td>{n?.vendedor ?? "-"}</td>
                  <td>
                    <span className="ng-statusPill ng-statusPill--comercial">{n?.estado ?? "-"}</span>
                  </td>
                  <td>
                    <span className={`ng-statusPill ${estadoOperativoClase(n?.estadoOperativo || "Pendiente")}`}>
                      {n?.estadoOperativo || "Pendiente"}
                    </span>
                  </td>
                  <td>
                    {Array.isArray(n?.proveedores) && n.proveedores.length > 0 ? (
                      <div className="ng-destinos">
                        {n.proveedores.map((prov, idx) => (
                          <span
                            key={`${prov?.proveedorId || prov?.nombre}-${idx}`}
                            className="ng-destinoTag"
                            style={estiloProveedor(prov?.color || colorProveedorPorNombre(prov?.nombre))}
                          >
                            {prov?.nombre}{prov?.enviadoWhatsapp ? " · WhatsApp" : ""}
                          </span>
                        ))}
                      </div>
                    ) : n?.estadoOperativo === "En taller" ? (
                      <span className="ng-inlineBadge ng-inlineBadge--taller">Taller</span>
                    ) : (
                      <span className="ng-muted">-</span>
                    )}
                  </td>
                  <td className="ng-cellStrong">${toARS(getNotaTotal(n))}</td>
                  <td>
                    <div className="ng-actions">
                      <button className="ng-tableBtn" onClick={() => abrirDetalle(n._id)}>
                      Ver
                      </button>
                      <button className="ng-tableBtn ng-tableBtn--dark" onClick={() => abrirGestion(n)}>
                      Gestionar
                      </button>
                      <button className="ng-tableBtn ng-tableBtn--danger" onClick={() => borrarNota(n)}>
                      Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </section>

      <section className="ng-tableCard ng-tableCard--provider">
        <div className="ng-tableHead">
          <div>
            <h2 className="ng-sectionTitle">Enviadas a proveedor</h2>
            <p className="ng-sectionSub">Las notas con proveedor asignado se agrupan acá para seguimiento.</p>
          </div>
          <div className="ng-resultsPill ng-resultsPill--provider">
            {guardadasProveedor.length} {guardadasProveedor.length === 1 ? "nota" : "notas"}
          </div>
        </div>

        <div className="ng-tableWrap">
          <table className="ng-table">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td className="ng-tableMessage" colSpan={7}>Cargando...</td></tr>
              ) : guardadasProveedor.length === 0 ? (
                <tr><td className="ng-tableMessage" colSpan={7}>Todavía no hay notas enviadas a proveedor.</td></tr>
              ) : (
                guardadasProveedor.map((n) => (
                  <tr key={`prov-${n?._id || n?.id || n?.numero}`}>
                    <td className="ng-cellStrong">{n?.numero ?? "-"}</td>
                    <td>
                      <div className="ng-clientCell">
                        <strong>{getNotaClienteNombre(n)}</strong>
                        <span>{n?.vendedor || "Sin vendedor"}</span>
                      </div>
                    </td>
                    <td>{n?.entrega ?? "-"}</td>
                    <td>
                      <div className="ng-destinos">
                        {Array.isArray(n?.proveedores) && n.proveedores.length > 0 ? (
                          n.proveedores.map((prov, idx) => (
                            <span
                              key={`${prov?.proveedorId || prov?.nombre}-${idx}`}
                              className="ng-destinoTag"
                              style={estiloProveedor(prov?.color || colorProveedorPorNombre(prov?.nombre))}
                            >
                              {prov?.nombre}{prov?.enviadoWhatsapp ? " · WhatsApp" : ""}
                            </span>
                          ))
                        ) : (
                          <span className="ng-muted">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`ng-statusPill ${estadoOperativoClase(n?.estadoOperativo || "Pendiente")}`}>
                        {n?.estadoOperativo || "Enviado a proveedor"}
                      </span>
                    </td>
                    <td className="ng-cellStrong">${toARS(getNotaTotal(n))}</td>
                    <td>
                      <div className="ng-actions">
                        <button className="ng-tableBtn" onClick={() => abrirDetalle(n._id)}>
                          Ver
                        </button>
                        <button className="ng-tableBtn ng-tableBtn--dark" onClick={() => abrirGestion(n)}>
                          Gestionar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {gestionOpen && gestionNota ? (
        <div className="ng-modalBack">
          <div className="ng-modal">
            <div className="ng-modalHeader">
              <div>
                <span className="ng-modalKicker">Seguimiento interno</span>
                <h2 className="ng-modalTitle">Gestion operativa</h2>
                <p className="ng-modalSub">
                  {gestionNota.numero} - {getNotaClienteNombre(gestionNota)}
                </p>
              </div>
              <button className="ng-modalClose" onClick={cerrarGestion}>Cerrar</button>
            </div>

            <div className="ng-modalGrid">
              <div className="ng-panel">
                <div className="ng-panelLabel">Estado operativo</div>
                <select
                  className="ng-select"
                  value={estadoOperativo}
                  onChange={(e) => setEstadoOperativo(e.target.value)}
                >
                  {ESTADOS_OPERATIVOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>

                <div className="ng-quickActions">
                  <button className="ng-quickBtn" onClick={() => setEstadoOperativo("Pendiente")}>
                    Pendiente
                  </button>
                  <button className="ng-quickBtn" onClick={() => setEstadoOperativo("En taller")}>
                    Mandar a taller
                  </button>
                  <button className="ng-quickBtn" onClick={abrirPromptProveedor}>
                    Mandar a proveedor
                  </button>
                </div>

                <div className="ng-summaryCard">
                  <div className="ng-summaryTitle">Resumen actual</div>
                  <div className="ng-summaryGrid">
                    <div>
                      <span>Cliente</span>
                      <strong>{getNotaClienteNombre(gestionNota)}</strong>
                    </div>
                    <div>
                      <span>Entrega</span>
                      <strong>{gestionNota.entrega || "-"}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>${toARS(getNotaTotal(gestionNota))}</strong>
                    </div>
                    <div>
                      <span>Vendedor</span>
                      <strong>{gestionNota.vendedor || "-"}</strong>
                    </div>
                  </div>
                </div>

                <div className="ng-clientActionsCard">
                  <div className="ng-clientActionsTitle">Comprobante para cliente</div>
                  <div className="ng-clientActionsSub">
                    Antes de derivar la nota, podés enviarla por WhatsApp o imprimirla como comprobante.
                  </div>
                  <div className="ng-clientProofRow">
                    <button
                      type="button"
                      className="ng-clientProofThumb"
                      onClick={abrirComprobantePreview}
                      disabled={!comprobantePreviewUrl || comprobantePreviewLoading}
                    >
                      {comprobantePreviewLoading ? (
                        <div className="ng-clientProofPlaceholder">Generando comprobante...</div>
                      ) : comprobantePreviewUrl ? (
                        <img src={comprobantePreviewUrl} alt="Vista previa del comprobante" />
                      ) : (
                        <div className="ng-clientProofPlaceholder">Sin vista previa</div>
                      )}
                    </button>

                    <div className="ng-clientProofActions">
                      <button className="ng-actionBtn ng-actionBtn--ghost" onClick={copiarComprobanteCliente} disabled={comprobantePreviewLoading}>
                        Copiar
                      </button>
                      <button className="ng-actionBtn ng-actionBtn--primary" onClick={imprimirComprobanteCliente}>
                        Imprimir
                      </button>
                      <button className="ng-actionBtn ng-actionBtn--ghost" onClick={enviarClienteWhatsapp}>
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <div className="ng-panel">
                <div className="ng-panelLabel">Proveedores asignados</div>

                {estadoOperativo !== "Enviado a proveedor" ? (
                  <div className="ng-warningBox">
                    Si agregás un proveedor, la nota pasa automáticamente a la lista de enviados a proveedor.
                  </div>
                ) : null}

                <div className="ng-providerList">
                  {asignaciones.length === 0 ? (
                    <div className="ng-emptyBox">Todavía no hay proveedores asignados.</div>
                  ) : (
                    asignaciones.map((item) => (
                      <div
                        key={String(item.proveedorId)}
                        className="ng-providerCard"
                        style={{
                          borderLeft: `6px solid ${item?.color || colorProveedorPorNombre(item?.nombre)}`,
                        }}
                      >
                        <div className="ng-providerCardRow">
                          <div>
                            <div className="ng-providerNameRow">
                              <span
                                className="ng-providerColorDot"
                                style={{
                                  backgroundColor: item?.color || colorProveedorPorNombre(item?.nombre),
                                }}
                              />
                              <div className="ng-providerName">{item.nombre}</div>
                              <span
                                className="ng-destinoTag"
                                style={estiloProveedor(item?.color || colorProveedorPorNombre(item?.nombre))}
                              >
                                {item.nombre}
                              </span>
                            </div>
                            <div className="ng-providerObs">{item.observacion || "Sin observacion"}</div>
                            {item?.enviadoWhatsapp ? (
                              <div className="ng-providerMetaTag">Enviado por WhatsApp</div>
                            ) : null}
                            <div className="ng-providerNoteMeta">
                              <div>
                                <span>Nota</span>
                                <strong>{gestionNota?.numero || "-"}</strong>
                              </div>
                              <div>
                                <span>Cliente</span>
                                <strong>{getNotaClienteNombre(gestionNota)}</strong>
                              </div>
                              <div>
                                <span>Entrega</span>
                                <strong>{gestionNota?.entrega || "-"}</strong>
                              </div>
                              <div>
                                <span>Total</span>
                                <strong>${toARS(getNotaTotal(gestionNota))}</strong>
                              </div>
                            </div>
                          </div>
                          <div className="ng-providerCardActions">
                            <button className="ng-miniBtn ng-miniBtn--preview" onClick={abrirComprobantePreview}>
                              Vista previa
                            </button>
                            <button className="ng-miniBtn" onClick={() => quitarProveedorAsignado(item.proveedorId)}>
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>

            <div className="ng-modalActions">
              <button className="ng-actionBtn ng-actionBtn--ghost" onClick={cerrarGestion}>
                Cancelar
              </button>
              <button className="ng-actionBtn ng-actionBtn--primary" onClick={guardarGestion} disabled={savingGestion}>
                {savingGestion ? "Guardando..." : "Guardar gestion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {comprobantePreviewOpen && comprobantePreviewUrl ? (
        <div className="ng-previewLightbox" onClick={cerrarComprobantePreview}>
          <div className="ng-previewLightboxDialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ng-previewLightboxClose" onClick={cerrarComprobantePreview}>
              Cerrar
            </button>
            <div className="ng-previewLightboxBody">
              <img src={comprobantePreviewUrl} alt="Comprobante para cliente en grande" />
            </div>
          </div>
        </div>
      ) : null}

      {gestionOpen && gestionNota && proveedorPromptOpen ? (
        <div className="ng-providerModalBack" onClick={cerrarPromptProveedor}>
          <div className="ng-providerModal" onClick={(e) => e.stopPropagation()}>
            <div className="ng-inlinePromptHead">
              <div>
                <div className="ng-inlinePromptTitle">Mandar a proveedor</div>
                <div className="ng-inlinePromptSub">Elegí el proveedor y cargá la observación para esta nota.</div>
              </div>
              <button className="ng-inlinePromptClose" onClick={cerrarPromptProveedor}>
                Cerrar
              </button>
            </div>

            <div className="ng-providerModalNote">
              <div>
                <span>Nota</span>
                <strong>{gestionNota?.numero || "-"}</strong>
              </div>
              <div>
                <span>Cliente</span>
                <strong>{getNotaClienteNombre(gestionNota)}</strong>
              </div>
              <div>
                <span>Entrega</span>
                <strong>{gestionNota?.entrega || "-"}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>${toARS(getNotaTotal(gestionNota))}</strong>
              </div>
            </div>

            <div className="ng-providerModalPreview">
              <button
                type="button"
                className="ng-clientProofThumb ng-clientProofThumb--modal"
                onClick={abrirComprobantePreview}
                disabled={!comprobantePreviewUrl || comprobantePreviewLoading}
              >
                {comprobantePreviewLoading ? (
                  <div className="ng-clientProofPlaceholder">Generando comprobante...</div>
                ) : comprobantePreviewUrl ? (
                  <img src={comprobantePreviewUrl} alt="Vista previa para proveedor" />
                ) : (
                  <div className="ng-clientProofPlaceholder">Sin vista previa</div>
                )}
              </button>
            </div>

            <select
              className="ng-select"
              value={proveedorIdNuevo}
              onChange={(e) => setProveedorIdNuevo(e.target.value)}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((prov) => (
                <option key={prov._id} value={prov._id}>
                  {prov.nombre}
                </option>
              ))}
            </select>

            {proveedorIdNuevo ? (
              <div className="ng-selectedProviderPreview">
                {(() => {
                  const proveedorSeleccionado = proveedores.find((prov) => String(prov._id) === String(proveedorIdNuevo));
                  if (!proveedorSeleccionado) return null;
                  return (
                    <span
                      className="ng-destinoTag"
                      style={estiloProveedor(
                        proveedorSeleccionado?.color || colorProveedorPorNombre(proveedorSeleccionado?.nombre)
                      )}
                    >
                      {proveedorSeleccionado?.nombre}
                    </span>
                  );
                })()}
              </div>
            ) : null}

            <textarea
              className="ng-textarea"
              rows={3}
              placeholder="Observacion para este proveedor"
              value={observacionNueva}
              onChange={(e) => setObservacionNueva(e.target.value)}
            />

            <label className="ng-checkboxRow">
              <input
                type="checkbox"
                checked={enviarWhatsappNuevo}
                onChange={(e) => setEnviarWhatsappNuevo(e.target.checked)}
              />
              <span>Enviar por WhatsApp al agregar proveedor</span>
            </label>

            <div className="ng-inlinePromptActions">
              <button className="ng-actionBtn ng-actionBtn--ghost" onClick={cerrarPromptProveedor}>
                Después lo cargo
              </button>
              <button
                className="ng-actionBtn ng-actionBtn--primary"
                onClick={agregarProveedorAsignado}
                disabled={!proveedorIdNuevo}
              >
                Agregar proveedor
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NotaDetalleModal
        open={Boolean(openId)}
        onClose={cerrarDetalle}
        detalle={detalle}
        loading={detalleLoading}
        error={detalleError}
        onRefresh={() => abrirDetalle(openId)}
        soloVistaPrevia
      />
    </div>
  );
}
