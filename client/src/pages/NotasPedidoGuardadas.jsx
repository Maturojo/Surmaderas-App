import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  actualizarOperacionNota,
  eliminarNotaPedido,
  guardarCajaNota,
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

function parseYmd(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getEntregaUrgencyClass(entrega) {
  const entregaDate = parseYmd(entrega);
  if (!entregaDate) return "";

  const diffDays = Math.floor((entregaDate.getTime() - startOfToday().getTime()) / 86400000);
  if (diffDays < 0) return "ng-rowDue--danger";
  if (diffDays <= 3) return "ng-rowDue--warning";
  if (diffDays > 4) return "ng-rowDue--ok";
  return "";
}

function estadoOperativoClase(estado) {
  if (estado === "Finalizado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "En taller") return "bg-amber-50 text-amber-700 border-amber-200";
  if (estado === "Enviado a proveedor") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getEstadoComercial(nota) {
  const tipoCaja = String(nota?.caja?.tipo || "").toLowerCase();
  const estado = String(nota?.estado || "").toLowerCase();

  if (tipoCaja === "pago" || estado === "pagada") return "pagada";
  if (tipoCaja === "seña" || tipoCaja === "sena" || tipoCaja === "senia" || estado === "señada") return "señada";
  return "pendiente";
}

function getComprobantesCaja(caja = {}) {
  const list = Array.isArray(caja?.comprobantes) ? caja.comprobantes : [];
  const normalized = list.filter((item) => item?.dataUrl);
  if (normalized.length) return normalized;
  return caja?.comprobante?.dataUrl ? [caja.comprobante] : [];
}

function getMontoComprobantes(comprobantes = []) {
  return comprobantes.reduce((sum, item) => sum + Number(item?.monto || 0), 0);
}

function getEstadoOperativoLabel(estado) {
  if (estado === "Enviado a proveedor") return "Enviada a proveedor";
  if (estado === "En taller") return "Enviada a taller";
  if (estado === "Finalizado") return "Listo para retirar";
  return "Pendiente";
}

function EstadoComercialCell({ nota }) {
  const estado = getEstadoComercial(nota);
  const montoSena = Number(nota?.caja?.monto || 0);

  return (
    <div className="ng-stateCell">
      <span className="ng-statusPill ng-statusPill--comercial">{estado}</span>
      {estado === "señada" && montoSena > 0 ? (
        <span className="ng-stateMeta">Seña: ${toARS(montoSena)}</span>
      ) : null}
    </div>
  );
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
    `Entrega: ${nota?.entrega || "-"}`,
    `Vendedor: ${nota?.vendedor || "-"}`,
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

function construirMensajeMuebleListo(nota) {
  return [
    `Hola ${getNotaClienteNombre(nota)}, te avisamos que tu pedido ya está listo para retirar en el local.`,
    "",
    `Nota: ${nota?.numero || ""}`,
    `Total: $${toARS(getNotaTotal(nota))}`,
    "",
    "¡Esperamos verte pronto!",
  ].join("\n");
}

async function enviarNotaWhatsappConAdjunto({ nota, telefonoWhatsapp, mensaje, etiquetaDestino, printData }) {
  openWhatsappText(telefonoWhatsapp, mensaje);

  const file = await generateNotaPedidoImageFile(printData || buildNotaPedidoPrintData(nota));
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

const VIEW_CONFIG = {
  all: {
    title: "Pedidos para pasar",
    subtitle:
      "Organiza que sale al taller, que va a proveedores y que queda pendiente de derivar sin perder de vista el estado comercial de cada pedido.",
    sectionTitle: "Plan del día",
    sectionSubtitle: "Visualiza rapido destino, estado operativo y total de cada pedido.",
    emptyMessage: "No hay pedidos para pasar.",
  },
  pendientes: {
    title: "Pedidos en taller",
    subtitle: "Aca estan los pedidos que ya fueron pasados al taller.",
    sectionTitle: "Taller",
    sectionSubtitle: "Pedidos en taller que todavia no se finalizaron.",
    emptyMessage: "No hay pedidos en taller.",
  },
  deposito: {
    title: "Pedidos en depositos",
    subtitle: "Aca ves los pedidos finalizados que ya quedaron listos en deposito.",
    sectionTitle: "Depositos",
    sectionSubtitle: "Listado de pedidos que ya terminaron su circuito operativo.",
    emptyMessage: "No hay pedidos en depositos.",
  },
};

export default function NotasPedidoGuardadas({ view = "all" }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState("");
  const [detalleModoCaja, setDetalleModoCaja] = useState(false);
  const [actionsOpenId, setActionsOpenId] = useState("");
  const [actionsNota, setActionsNota] = useState(null);

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
  const [proveedorPreviewUrl, setProveedorPreviewUrl] = useState("");
  const [comprobantePreviewLoading, setComprobantePreviewLoading] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState(null);
  const [terminadoOpen, setTerminadoOpen] = useState(false);
  const [terminadoOpcion, setTerminadoOpcion] = useState(null);
  const [terminadoFoto, setTerminadoFoto] = useState(null);
  const [terminadoLoading, setTerminadoLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await listarNotasPedido({ q: "", page: 1, limit: 300, guardada: true });
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
    } catch (e) {
      setErr(e?.message || `Error cargando ${VIEW_CONFIG[view]?.title?.toLowerCase?.() || "notas guardadas"}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [view]);

  async function abrirDetalle(id) {
    setDetalleModoCaja(false);
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
    setDetalleModoCaja(false);
  }

  async function abrirEditarPago(nota) {
    cerrarAccionesNota();
    setDetalleModoCaja(true);
    setOpenId(nota._id);
    setDetalle(null);
    setDetalleError("");
    setDetalleLoading(true);

    try {
      const item = await obtenerNotaPedido(nota._id);
      setDetalle(item);
    } catch (e) {
      setDetalleError(e?.message || "Error cargando estado de pago");
    } finally {
      setDetalleLoading(false);
    }
  }

  async function abrirGestion(nota) {
    try {
      const [completa, proveedoresData] = await Promise.all([
        obtenerNotaPedido(nota._id),
        proveedores.length > 0 ? Promise.resolve(proveedores) : listarProveedores(),
      ]);
      setProveedores(proveedoresData);
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
    if (proveedorPreviewUrl) {
      URL.revokeObjectURL(proveedorPreviewUrl);
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
    setProveedorPreviewUrl("");
    setComprobantePreviewLoading(false);
    setPreviewLightbox(null);
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
        const proveedorSeleccionado = proveedores.find(
          (prov) => String(prov._id) === String(proveedorIdNuevo)
        );
        const [fileCliente, fileProveedor] = await Promise.all([
          generateNotaPedidoImageFile(buildNotaPedidoPrintData(gestionNota)),
          generateNotaPedidoImageFile(
            buildNotaPedidoPrintData(gestionNota, {
              audience: "provider",
              providerName: proveedorSeleccionado?.nombre || "",
            })
          ),
        ]);
        if (cancelled) return;

        const nextUrl = URL.createObjectURL(fileCliente);
        const nextProviderUrl = URL.createObjectURL(fileProveedor);
        setComprobantePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        setComprobantePreviewFile(fileCliente);
        setProveedorPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextProviderUrl;
        });
      } catch {
        if (!cancelled) {
          setComprobantePreviewUrl("");
          setComprobantePreviewFile(null);
          setProveedorPreviewUrl("");
        }
      } finally {
        if (!cancelled) setComprobantePreviewLoading(false);
      }
    }

    prepararPreview();

    return () => {
      cancelled = true;
    };
  }, [gestionOpen, gestionNota, proveedorIdNuevo, proveedores]);

  const guardadas = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const filteredByView = items.filter((n) => {
      if (view === "pendientes") return n?.estadoOperativo === "Enviado a proveedor";
      if (view === "deposito") return n?.estadoOperativo === "Finalizado";
      return n?.estadoOperativo !== "Enviado a proveedor";
    });

    return filteredByView
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
  }, [items, q, view]);

  const resumen = useMemo(() => {
    const totalNotas = guardadas.length;
    const enTaller = guardadas.filter((item) => item?.estadoOperativo === "En taller").length;
    const enProveedor = guardadas.filter((item) => item?.estadoOperativo === "Enviado a proveedor").length;
    const finalizadas = guardadas.filter((item) => item?.estadoOperativo === "Finalizado").length;
    return { totalNotas, enTaller, enProveedor, finalizadas };
  }, [guardadas]);

  const guardadasProveedor = useMemo(
    () => guardadas.filter((item) => item?.estadoOperativo === "Enviado a proveedor"),
    [guardadas]
  );

  const copy = VIEW_CONFIG[view] || VIEW_CONFIG.all;

  async function borrarNota(nota) {
    cerrarAccionesNota();
    const ok = window.confirm(`Se va a borrar la nota ${nota?.numero || ""}.`);
    if (!ok) return;

    await eliminarNotaPedido(nota._id);
    if (openId === nota._id) cerrarDetalle();
    if (gestionNota?._id === nota._id) cerrarGestion();
    await load();
  }

  async function guardarEstadoPago(nota, payload) {
    await guardarCajaNota(nota._id, payload);
    await load();
    await abrirEditarPago(nota);
  }

  async function marcarListoParaRetirar(nota) {
    if (!nota?._id) return;
    cerrarAccionesNota();

    const res = await Swal.fire({
      icon: "question",
      title: "¿Marcar listo para retirar?",
      text: "La nota queda en depósito/local y no se envía a proveedor ni a taller.",
      showCancelButton: true,
      confirmButtonText: "Marcar listo",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;

    try {
      await actualizarOperacionNota(nota._id, {
        estadoOperativo: "Finalizado",
        proveedores: [],
      });
      await load();
      if (gestionNota?._id === nota._id) {
        cerrarGestion();
      }
      await Swal.fire({
        icon: "success",
        title: "Listo para retirar",
        text: "La nota quedó marcada para retiro en local.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: e?.message || "No se pudo marcar la nota como lista para retirar.",
      });
    }
  }

  function abrirAccionesNota(event, nota) {
    event.stopPropagation();
    setActionsOpenId(nota?._id || nota?.id || nota?.numero || "");
    setActionsNota(nota);
  }

  function cerrarAccionesNota() {
    setActionsOpenId("");
    setActionsNota(null);
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
        const proveedorPrintData = buildNotaPedidoPrintData(gestionNota, {
          audience: "provider",
          providerName: proveedor?.nombre || "",
        });
        enviarNotaWhatsappConAdjunto({
          nota: gestionNota,
          telefonoWhatsapp,
          mensaje,
          etiquetaDestino: proveedor?.nombre || "proveedor",
          printData: proveedorPrintData,
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

  function abrirComprobantePreview(url, alt) {
    if (!url || comprobantePreviewLoading) return;
    setPreviewLightbox({ url, alt });
  }

  function cerrarComprobantePreview() {
    setPreviewLightbox(null);
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

  function abrirTerminado() {
    setTerminadoOpcion(null);
    setTerminadoFoto(null);
    setTerminadoOpen(true);
  }

  function cerrarTerminado() {
    setTerminadoOpen(false);
    setTerminadoOpcion(null);
    setTerminadoFoto(null);
  }

  function handleTerminadoFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTerminadoFoto({ dataUrl: ev.target.result, file });
    reader.readAsDataURL(file);
  }

  async function confirmarTerminadoEnLocal() {
    if (!gestionNota?._id) return;
    setTerminadoLoading(true);
    try {
      const telefonoWhatsapp = normalizarWhatsapp(gestionNota?.cliente?.telefono);
      if (telefonoWhatsapp) {
        const mensaje = construirMensajeMuebleListo(gestionNota);
        openWhatsappText(telefonoWhatsapp, mensaje);
        if (terminadoFoto?.file) {
          downloadFile(terminadoFoto.file);
        }
        await Swal.fire({
          icon: "info",
          title: "WhatsApp abierto",
          text: terminadoFoto?.file
            ? "Abrimos el chat del cliente y descargamos la foto para que la puedas adjuntar."
            : "Abrimos el chat del cliente con el mensaje listo.",
        });
      }
      await actualizarOperacionNota(gestionNota._id, {
        estadoOperativo: "Finalizado",
        proveedores: asignaciones,
      });
      await load();
      cerrarTerminado();
      cerrarGestion();
      await Swal.fire({
        icon: "success",
        title: "Nota finalizada",
        text: "La nota pasó a depósito correctamente.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Error", text: e?.message || "No se pudo finalizar la nota." });
    } finally {
      setTerminadoLoading(false);
    }
  }

  async function confirmarTerminadoEntregado() {
    if (!gestionNota?._id) return;
    setTerminadoLoading(true);
    try {
      await eliminarNotaPedido(gestionNota._id);
      await load();
      cerrarTerminado();
      cerrarGestion();
      await Swal.fire({
        icon: "success",
        title: "Nota eliminada",
        text: "La nota fue eliminada correctamente.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Error", text: e?.message || "No se pudo eliminar la nota." });
    } finally {
      setTerminadoLoading(false);
    }
  }

  return (
    <div className="ng-page">
      <section className="ng-hero">
        <div className="ng-heroCopy">
          <span className="ng-kicker">Caja y planificación</span>
          <h1 className="ng-title">{copy.title}</h1>
          <p className="ng-subtitle">{copy.subtitle}</p>
        </div>
        <div className="ng-stats">
          <article className="ng-statCard">
            <span className="ng-statLabel">Pedidos visibles</span>
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
            <h2 className="ng-sectionTitle">{copy.sectionTitle}</h2>
            <p className="ng-sectionSub">{copy.sectionSubtitle}</p>
          </div>
          <div className="ng-resultsPill">
            {guardadas.length} {guardadas.length === 1 ? "nota" : "notas"}
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
            ) : guardadas.length === 0 ? (
              <tr><td className="ng-tableMessage" colSpan={10}>{copy.emptyMessage}</td></tr>
            ) : (
                guardadas.map((n) => {
                const notaId = n?._id || n?.id || n?.numero;
                return (
                <tr key={notaId} className={getEntregaUrgencyClass(n?.entrega)}>
                  <td className="ng-cellStrong" data-label="Numero">{n?.numero ?? "-"}</td>
                  <td data-label="Fecha">{fmtDate(n?.fecha)}</td>
                  <td data-label="Entrega">{n?.entrega ?? "-"}</td>
                  <td data-label="Cliente">
                    <div className="ng-clientCell">
                      <strong>{getNotaClienteNombre(n)}</strong>
                      <span>{n?.cliente?.telefono || "Sin telefono"}</span>
                    </div>
                  </td>
                  <td data-label="Vendedor">{n?.vendedor ?? "-"}</td>
                  <td data-label="Estado">
                    <EstadoComercialCell nota={n} />
                  </td>
                  <td data-label="Operativo">
                    <span className={`ng-statusPill ${estadoOperativoClase(n?.estadoOperativo || "Pendiente")}`}>
                      {getEstadoOperativoLabel(n?.estadoOperativo)}
                    </span>
                  </td>
                  <td data-label="Destino">
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
                    ) : n?.estadoOperativo === "Finalizado" ? (
                      <span className="ng-inlineBadge ng-inlineBadge--local">Local / depósito</span>
                    ) : (
                      <span className="ng-muted">-</span>
                    )}
                  </td>
                  <td className="ng-cellStrong" data-label="Total">${toARS(getNotaTotal(n))}</td>
                  <td data-label="Acciones">
                    <div className="ng-actions">
                      <button className="ng-tableBtn" onClick={() => abrirDetalle(n._id)}>
                      Ver
                      </button>
                      <button className="ng-tableBtn ng-tableBtn--dark" onClick={() => abrirGestion(n)}>
                      Gestionar
                      </button>
                      <div className="ng-actionsMenu">
                        <button
                          type="button"
                          className="ng-tableBtn ng-tableBtn--icon"
                          aria-label="Mas acciones"
                          aria-expanded={actionsOpenId === notaId}
                          onClick={(event) => abrirAccionesNota(event, n)}
                        >
                          ...
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
          </table>
        </div>
      </section>

      {false ? (
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
                <th>Operativo</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td className="ng-tableMessage" colSpan={8}>Cargando...</td></tr>
              ) : guardadasProveedor.length === 0 ? (
                <tr><td className="ng-tableMessage" colSpan={8}>Todavía no hay notas enviadas a proveedor.</td></tr>
              ) : (
                  guardadasProveedor.map((n) => {
                  const notaId = n?._id || n?.id || n?.numero;
                  return (
                  <tr key={`prov-${notaId}`} className={getEntregaUrgencyClass(n?.entrega)}>
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
                      <EstadoComercialCell nota={n} />
                    </td>
                    <td>
                      <span className={`ng-statusPill ${estadoOperativoClase(n?.estadoOperativo || "Pendiente")}`}>
                        {getEstadoOperativoLabel(n?.estadoOperativo || "Enviado a proveedor")}
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
                        <div className="ng-actionsMenu">
                          <button
                            type="button"
                            className="ng-tableBtn ng-tableBtn--icon"
                            aria-label="Mas acciones"
                            aria-expanded={actionsOpenId === notaId}
                            onClick={(event) => abrirAccionesNota(event, n)}
                          >
                            ...
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

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
                  <button className="ng-quickBtn" onClick={abrirPromptProveedor}>
                    Enviar a
                  </button>
                  <button className="ng-quickBtn ng-quickBtn--done" onClick={abrirTerminado}>
                    Terminada
                  </button>
                  <button className="ng-quickBtn ng-quickBtn--ready" onClick={() => marcarListoParaRetirar(gestionNota)}>
                    Listo para retirar
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

                {(() => {
                  function getImgSrc(it) {
                    const img = it.imagen || it.data?.imagen;
                    return img?.dataUrl || (typeof img === "string" ? img : null);
                  }
                  const itemsConImg = (gestionNota?.items || []).filter(it => getImgSrc(it));
                  if (!itemsConImg.length) return null;
                  return (
                    <div className="ng-clientActionsCard">
                      <div className="ng-clientActionsTitle">Imágenes de referencia</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                        {itemsConImg.map((it, i) => {
                          const src = getImgSrc(it);
                          const label = it.descripcion || it.tipo || `Ítem ${i + 1}`;
                          return (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <img
                                src={src}
                                alt={label}
                                style={{ width: 80, height: 64, objectFit: "cover", borderRadius: 8, cursor: "zoom-in", border: "1px solid rgba(48,41,33,0.12)" }}
                                onClick={() => abrirComprobantePreview(src, label)}
                              />
                              <span style={{ fontSize: 11, color: "#756b61", maxWidth: 80, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {getComprobantesCaja(gestionNota?.caja).length > 0 ? (
                  <div className="ng-clientActionsCard">
                    <div className="ng-clientActionsTitle">Comprobantes de pago</div>
                    <div className="ng-clientActionsSub">
                      {gestionNota.caja.metodo && <span>{gestionNota.caja.metodo} · </span>}
                      {gestionNota.caja.tipo && <span>{gestionNota.caja.tipo} · </span>}
                      <span>${toARS(getMontoComprobantes(getComprobantesCaja(gestionNota?.caja)))}</span>
                    </div>
                    <div className="ng-proofGrid">
                      {getComprobantesCaja(gestionNota?.caja).map((item, index) => (
                        <button
                          key={`${item.nombre || "comprobante"}-${index}`}
                          type="button"
                          className="ng-clientProofThumb"
                          onClick={() => abrirComprobantePreview(item.dataUrl, `Comprobante de pago ${index + 1}`)}
                        >
                          <img src={item.dataUrl} alt={`Comprobante de pago ${index + 1}`} />
                          <span>{item.monto > 0 ? `$${toARS(item.monto)}` : `Comprobante ${index + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="ng-clientActionsCard">
                  <div className="ng-clientActionsTitle">Comprobante para cliente</div>
                  <div className="ng-clientActionsSub">
                    Antes de derivar la nota, podés enviarla por WhatsApp o imprimirla como comprobante.
                  </div>
                  <div className="ng-clientProofRow">
                    <button
                      type="button"
                      className="ng-clientProofThumb"
                      onClick={() =>
                        abrirComprobantePreview(comprobantePreviewUrl, "Comprobante para cliente en grande")
                      }
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
                            <button
                              className="ng-miniBtn ng-miniBtn--preview"
                              onClick={() =>
                                abrirComprobantePreview(
                                  proveedorPreviewUrl,
                                  `Nota para proveedor ${item.nombre || ""}`.trim()
                                )
                              }
                            >
                              Vista previa
                            </button>
                            {estadoOperativo === "Finalizado" ? (
                              <button
                                className="ng-miniBtn"
                                onClick={async () => {
                                  const res = await Swal.fire({
                                    icon: "warning",
                                    title: "¿Eliminar nota?",
                                    text: "Esta acción no se puede deshacer.",
                                    showCancelButton: true,
                                    confirmButtonText: "Eliminar",
                                    cancelButtonText: "Cancelar",
                                  });
                                  if (!res.isConfirmed) return;
                                  try {
                                    await eliminarNotaPedido(gestionNota._id);
                                    await load();
                                    cerrarGestion();
                                  } catch (e) {
                                    await Swal.fire({ icon: "error", title: "Error", text: e?.message || "No se pudo eliminar." });
                                  }
                                }}
                              >
                                Borrar nota
                              </button>
                            ) : (
                              <>
                                <button className="ng-miniBtn ng-miniBtn--done" onClick={abrirTerminado}>
                                  Terminado
                                </button>
                                <button className="ng-miniBtn" onClick={() => quitarProveedorAsignado(item.proveedorId)}>
                                  Quitar
                                </button>
                              </>
                            )}
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

      {previewLightbox?.url ? (
        <div className="ng-previewLightbox" onClick={cerrarComprobantePreview}>
          <div className="ng-previewLightboxDialog" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ng-previewLightboxClose" onClick={cerrarComprobantePreview}>
              Cerrar
            </button>
            <div className="ng-previewLightboxBody">
              <img src={previewLightbox.url} alt={previewLightbox.alt || "Vista previa en grande"} />
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
                <span>Entrega</span>
                <strong>{gestionNota?.entrega || "-"}</strong>
              </div>
              <div>
                <span>Vendedor</span>
                <strong>{gestionNota?.vendedor || "-"}</strong>
              </div>
              <div>
                <span>Items</span>
                <strong>{Array.isArray(gestionNota?.items) ? gestionNota.items.length : 0}</strong>
              </div>
            </div>

            <div className="ng-providerModalPreview">
              <button
                type="button"
                className="ng-clientProofThumb ng-clientProofThumb--modal"
                onClick={() =>
                  abrirComprobantePreview(proveedorPreviewUrl, "Vista previa para proveedor")
                }
                disabled={!proveedorPreviewUrl || comprobantePreviewLoading}
              >
                {comprobantePreviewLoading ? (
                  <div className="ng-clientProofPlaceholder">Generando comprobante...</div>
                ) : proveedorPreviewUrl ? (
                  <img src={proveedorPreviewUrl} alt="Vista previa para proveedor" />
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

      {terminadoOpen ? (
        <div className="ng-providerModalBack" onClick={cerrarTerminado}>
          <div className="ng-providerModal ng-terminadoModal" onClick={(e) => e.stopPropagation()}>
            <div className="ng-inlinePromptHead">
              <div>
                <div className="ng-inlinePromptTitle">¿Cómo se completó el pedido?</div>
                <div className="ng-inlinePromptSub">Indicá si el mueble quedó en el local o si lo entregó el proveedor directamente.</div>
              </div>
              <button className="ng-inlinePromptClose" onClick={cerrarTerminado}>Cerrar</button>
            </div>

            {!terminadoOpcion && (
              <div className="ng-terminadoOpciones">
                <button className="ng-terminadoOpcionBtn ng-terminadoOpcionBtn--local" onClick={() => setTerminadoOpcion("local")}>
                  <span className="ng-terminadoOpcionIcon">🏠</span>
                  <span>Está en el local</span>
                  <span className="ng-terminadoOpcionSub">El cliente viene a retirar</span>
                </button>
                <button className="ng-terminadoOpcionBtn ng-terminadoOpcionBtn--entregado" onClick={() => setTerminadoOpcion("entregado")}>
                  <span className="ng-terminadoOpcionIcon">🚚</span>
                  <span>Lo entregó el proveedor</span>
                  <span className="ng-terminadoOpcionSub">El proveedor lo llevó directo al cliente</span>
                </button>
              </div>
            )}

            {terminadoOpcion === "local" && (
              <div className="ng-terminadoForm">
                <p className="ng-terminadoDesc">
                  Podés agregar una foto del mueble para enviarle al cliente junto con el aviso por WhatsApp.
                </p>
                <div className="ng-terminadoFotoOpciones">
                  <label className="ng-terminadoFotoBtn">
                    📷 Sacar foto
                    <input type="file" accept="image/*" capture="environment" onChange={handleTerminadoFoto} style={{ display: "none" }} />
                  </label>
                  <label className="ng-terminadoFotoBtn ng-terminadoFotoBtn--galeria">
                    🖼️ Elegir imagen
                    <input type="file" accept="image/*" onChange={handleTerminadoFoto} style={{ display: "none" }} />
                  </label>
                </div>
                {terminadoFoto?.dataUrl && (
                  <img src={terminadoFoto.dataUrl} alt="Preview mueble" className="ng-terminadoFotoPreview" />
                )}
                <div className="ng-terminadoActions">
                  <button className="ng-actionBtn ng-actionBtn--ghost" onClick={() => setTerminadoOpcion(null)}>
                    Volver
                  </button>
                  <button className="ng-actionBtn ng-actionBtn--primary" onClick={confirmarTerminadoEnLocal} disabled={terminadoLoading}>
                    {terminadoLoading ? "Procesando..." : "Confirmar y avisar al cliente"}
                  </button>
                </div>
              </div>
            )}

            {terminadoOpcion === "entregado" && (
              <div className="ng-terminadoForm">
                <p className="ng-terminadoDesc">
                  La nota se va a eliminar permanentemente ya que el proveedor entregó el pedido directamente al cliente.
                </p>
                <div className="ng-terminadoActions">
                  <button className="ng-actionBtn ng-actionBtn--ghost" onClick={() => setTerminadoOpcion(null)}>
                    Volver
                  </button>
                  <button className="ng-actionBtn ng-actionBtn--danger" onClick={confirmarTerminadoEntregado} disabled={terminadoLoading}>
                    {terminadoLoading ? "Eliminando..." : "Eliminar nota"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {actionsNota ? (
        <div className="ng-actionsModalBack" onClick={cerrarAccionesNota}>
          <div className="ng-actionsModal" onClick={(e) => e.stopPropagation()}>
            <div className="ng-actionsModalHead">
              <div>
                <div className="ng-inlinePromptTitle">Acciones del pedido</div>
                <div className="ng-inlinePromptSub">
                  {actionsNota?.numero || "Nota"} - {getNotaClienteNombre(actionsNota)}
                </div>
              </div>
              <button className="ng-inlinePromptClose" onClick={cerrarAccionesNota}>
                Cerrar
              </button>
            </div>

            <div className="ng-actionsModalList">
              <button type="button" onClick={() => abrirEditarPago(actionsNota)}>
                <span>Modificar estado de pago</span>
                <small>Editar seña, pago o comprobante de caja.</small>
              </button>
              <button type="button" onClick={() => marcarListoParaRetirar(actionsNota)}>
                <span>Listo para retirar</span>
                <small>Dejarlo en local/depósito sin pasar por proveedor ni taller.</small>
              </button>
              <button type="button" className="danger" onClick={() => borrarNota(actionsNota)}>
                <span>Borrar pedido</span>
                <small>Eliminar esta nota de pedido.</small>
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
        onRefresh={() => (detalleModoCaja ? abrirEditarPago({ _id: openId }) : abrirDetalle(openId))}
        onGuardarCaja={guardarEstadoPago}
        soloVistaPrevia={!detalleModoCaja}
        permitirEditarCajaGuardada={detalleModoCaja}
      />
    </div>
  );
}
