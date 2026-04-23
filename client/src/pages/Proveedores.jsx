import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import NotaDetalleModal from "../features/notasPedidoListado/components/NotaDetalleModal";
import {
  actualizarProveedor,
  crearProveedor,
  eliminarNotaPedido,
  eliminarProveedor,
  listarNotasPedido,
  listarProveedores,
  obtenerNotaPedido,
} from "../services/notasPedido";
import { listarPedidosProveedor } from "../services/pedidosProveedor";
import { getNotaClienteNombre, getNotaTotal } from "../utils/notaPedido";
import { colorProveedorPorNombre, estiloProveedor } from "../utils/proveedorColor";

const PROVEEDORES_OPERATIVOS = ["ARIEL", "MARCELO VILA", "SILVIA", "NATA", "MARTIN PONASSO"];

function fmtDate(value) {
  if (!value) return "-";
  if (String(value).includes("-") && String(value).length <= 10) {
    return String(value).split("-").reverse().join("/");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
}

function normalizarTexto(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function estadoOperativoClase(estado) {
  if (estado === "Finalizado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "En taller") return "bg-amber-50 text-amber-700 border-amber-200";
  if (estado === "Enviado a proveedor") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function emptyForm() {
  return {
    id: "",
    nombre: "",
    telefono: "",
    contacto: "",
    nota: "",
  };
}

function getNotaItemImage(nota) {
  if (!Array.isArray(nota?.items)) return "";
  const itemConImagen = nota.items.find(
    (detalle) => detalle?.imagen?.dataUrl || detalle?.data?.imagen?.dataUrl
  );
  return itemConImagen?.imagen?.dataUrl || itemConImagen?.data?.imagen?.dataUrl || "";
}

function getDiasHastaEntrega(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;

  const entrega = new Date(year, month - 1, day);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diferencia = entrega.getTime() - inicioHoy.getTime();

  return Math.round(diferencia / 86400000);
}

export default function Proveedores() {
  const [items, setItems] = useState([]);
  const [notasGuardadas, setNotasGuardadas] = useState([]);
  const [pedidosProveedor, setPedidosProveedor] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [listQ, setListQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [openProveedorId, setOpenProveedorId] = useState("");
  const [formData, setFormData] = useState(emptyForm());
  const [openNotaId, setOpenNotaId] = useState("");
  const [notaDetalle, setNotaDetalle] = useState(null);
  const [notaDetalleLoading, setNotaDetalleLoading] = useState(false);
  const [notaDetalleError, setNotaDetalleError] = useState("");

  async function load() {
    setLoading(true);
    setLoadingExtras(false);
    setError("");
    let proveedoresOk = false;
    try {
      const proveedoresData = await listarProveedores();
      setItems(proveedoresData);
      proveedoresOk = true;
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los proveedores");
    } finally {
      setLoading(false);
    }

    if (!proveedoresOk) return;

    setLoadingExtras(true);

    const [notasData, pedidosData] = await Promise.allSettled([
      listarNotasPedido({ q: "", page: 1, limit: 500, guardada: true }),
      listarPedidosProveedor(),
    ]);

    if (notasData.status === "fulfilled") {
      const value = notasData.value;
      setNotasGuardadas(Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : []);
    } else {
      console.error("No se pudieron cargar las notas relacionadas de proveedores", notasData.reason);
      setNotasGuardadas([]);
      setError((prev) => prev || "Se cargaron los proveedores, pero no pudimos traer las notas relacionadas por ahora.");
    }

    if (pedidosData.status === "fulfilled") {
      const value = pedidosData.value;
      setPedidosProveedor(Array.isArray(value) ? value : []);
    } else {
      console.error("No se pudieron cargar los pedidos relacionados de proveedores", pedidosData.reason);
      setPedidosProveedor([]);
      setError((prev) => prev || "Se cargaron los proveedores, pero no pudimos traer los pedidos relacionados por ahora.");
    }

    setLoadingExtras(false);
  }

  useEffect(() => {
    load();
  }, []);

  const notasPorProveedor = useMemo(() => {
    const mapa = new Map();
    items.forEach((item) => {
      const relacionadas = notasGuardadas
        .filter((nota) =>
          Array.isArray(nota?.proveedores)
            ? nota.proveedores.some((prov) => String(prov?.proveedorId) === String(item?._id))
            : false
        )
        .sort((a, b) => {
          const da = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
          const db = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
          return db - da;
        });
      mapa.set(String(item._id), relacionadas);
    });
    return mapa;
  }, [items, notasGuardadas]);

  const pedidosPorProveedor = useMemo(() => {
    const mapa = new Map();
    items.forEach((item) => {
      const relacionados = pedidosProveedor
        .filter((pedido) => String(pedido?.proveedorId) === String(item?._id))
        .sort((a, b) => {
          const da = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
          const db = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
          return db - da;
        });
      mapa.set(String(item._id), relacionados);
    });
    return mapa;
  }, [items, pedidosProveedor]);

  const filteredRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((item) => {
      const esOperativo = PROVEEDORES_OPERATIVOS.includes(normalizarTexto(item?.nombre));
      const notasDelProveedor = notasPorProveedor.get(String(item._id)) || [];
      const pedidosDelProveedor = pedidosPorProveedor.get(String(item._id)) || [];
      if (!qq) return true;
      return (
        String(item?.nombre || "").toLowerCase().includes(qq) ||
        String(item?.contacto || "").toLowerCase().includes(qq) ||
        (esOperativo &&
          notasDelProveedor.some(
            (nota) =>
              String(nota?.numero || "").toLowerCase().includes(qq) ||
              getNotaClienteNombre(nota).toLowerCase().includes(qq)
          )) ||
        pedidosDelProveedor.some(
          (pedido) =>
            String(pedido?.tipo || "").toLowerCase().includes(qq) ||
            String(pedido?.estado || "").toLowerCase().includes(qq) ||
            String(pedido?.observacion || "").toLowerCase().includes(qq)
        )
      );
    });
  }, [items, notasPorProveedor, pedidosPorProveedor, q]);

  const filteredList = useMemo(() => {
    const qq = listQ.trim().toLowerCase();
    return items.filter((item) => {
      if (!qq) return true;
      return (
        String(item?.nombre || "").toLowerCase().includes(qq) ||
        String(item?.telefono || "").toLowerCase().includes(qq) ||
        String(item?.contacto || "").toLowerCase().includes(qq) ||
        String(item?.nota || "").toLowerCase().includes(qq)
      );
    });
  }, [items, listQ]);

  const totalAsignaciones = useMemo(
    () => items.reduce((acc, item) => acc + (notasPorProveedor.get(String(item._id))?.length || 0), 0),
    [items, notasPorProveedor]
  );

  const totalPedidosProveedor = useMemo(
    () => items.reduce((acc, item) => acc + (pedidosPorProveedor.get(String(item._id))?.length || 0), 0),
    [items, pedidosPorProveedor]
  );

  const pendientesTotales = useMemo(
    () =>
      items.reduce((acc, item) => {
        const notas = notasPorProveedor.get(String(item._id)) || [];
        return acc + notas.filter((nota) => nota?.estadoOperativo !== "Finalizado").length;
      }, 0),
    [items, notasPorProveedor]
  );

  function abrirNuevoProveedor() {
    setFormData(emptyForm());
    setFormOpen(true);
  }

  function abrirEdicion(item) {
    setFormData({
      id: item._id,
      nombre: item.nombre || "",
      telefono: item.telefono || "",
      contacto: item.contacto || "",
      nota: item.nota || "",
    });
    setFormOpen(true);
  }

  function cerrarFormulario() {
    setFormOpen(false);
    setFormData(emptyForm());
    setSaving(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      await Swal.fire({ icon: "warning", title: "Falta nombre", text: "Escribí el nombre del proveedor." });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        contacto: formData.contacto.trim(),
        nota: formData.nota.trim(),
      };

      if (formData.id) {
        await actualizarProveedor(formData.id, payload);
      } else {
        await crearProveedor(payload);
      }

      await load();
      cerrarFormulario();
      await Swal.fire({
        icon: "success",
        title: formData.id ? "Proveedor actualizado" : "Proveedor guardado",
        text: "El proveedor quedó disponible para asignarlo a notas guardadas.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "No se pudo guardar el proveedor",
      });
    } finally {
      setSaving(false);
    }
  }

  async function borrar(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Borrar proveedor",
      text: `Se va a ocultar ${item.nombre}.`,
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    await eliminarProveedor(item._id);
    if (formData.id === item._id) {
      cerrarFormulario();
    }
    await load();
  }

  async function abrirNotaDetalle(id) {
    setOpenNotaId(id);
    setNotaDetalle(null);
    setNotaDetalleError("");
    setNotaDetalleLoading(true);

    try {
      const detalle = await obtenerNotaPedido(id);
      setNotaDetalle(detalle);
    } catch (e) {
      setNotaDetalleError(e?.message || "No se pudo cargar la nota");
    } finally {
      setNotaDetalleLoading(false);
    }
  }

  function cerrarNotaDetalle() {
    setOpenNotaId("");
    setNotaDetalle(null);
    setNotaDetalleError("");
    setNotaDetalleLoading(false);
  }

  async function borrarNotaProveedor(nota) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Borrar nota",
      text: `Se va a borrar la nota ${nota?.numero || ""}.`,
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    await eliminarNotaPedido(nota?._id);
    if (openNotaId === nota?._id) {
      cerrarNotaDetalle();
    }
    await load();
    await Swal.fire({
      icon: "success",
      title: "Nota borrada",
      text: "La nota se eliminó del panel del proveedor.",
      timer: 1400,
      showConfirmButton: false,
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-[var(--sm-line)] bg-[linear-gradient(135deg,#fff8ee_0%,#f4efe7_100%)] p-7 shadow-[var(--sm-shadow)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8d7557]">Red externa</div>
            <h1 className="m-0 text-[34px] font-black leading-none text-[#28231d]">Proveedores</h1>
            <p className="mt-3 max-w-[720px] text-[#665d53]">
              Tené a mano quién recibe cada trabajo y qué pedidos siguen pendientes con cada proveedor.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px] rounded-[18px] border border-[rgba(70,55,38,0.08)] bg-[rgba(255,255,255,0.86)] px-4 py-3">
              <div className="mb-1 text-[12px] font-bold text-[#827669]">Proveedores activos</div>
              <div className="text-[24px] font-black text-[#231f1a]">{items.length}</div>
            </div>
            <div className="min-w-[150px] rounded-[18px] border border-[rgba(70,55,38,0.08)] bg-[rgba(255,255,255,0.86)] px-4 py-3">
              <div className="mb-1 text-[12px] font-bold text-[#827669]">Notas asignadas</div>
              <div className="text-[24px] font-black text-[#231f1a]">{totalAsignaciones}</div>
            </div>
            <div className="min-w-[150px] rounded-[18px] border border-[rgba(70,55,38,0.08)] bg-[rgba(255,255,255,0.86)] px-4 py-3">
              <div className="mb-1 text-[12px] font-bold text-[#827669]">Pendientes</div>
              <div className="text-[24px] font-black text-[#231f1a]">{pendientesTotales}</div>
            </div>
            <div className="min-w-[150px] rounded-[18px] border border-[rgba(70,55,38,0.08)] bg-[rgba(255,255,255,0.86)] px-4 py-3">
              <div className="mb-1 text-[12px] font-bold text-[#827669]">Pedidos proveedor</div>
              <div className="text-[24px] font-black text-[#231f1a]">{totalPedidosProveedor}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={abrirNuevoProveedor}
            className="min-h-[48px] rounded-[16px] border-0 bg-[linear-gradient(135deg,#372c22_0%,#554231_100%)] px-5 font-black text-[#fffdf8] shadow-[0_14px_28px_rgba(55,44,34,0.18)]"
          >
            Nuevo proveedor
          </button>
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="min-h-[48px] rounded-[16px] border border-[var(--sm-line-strong)] bg-white px-5 font-bold text-[#3b3026]"
          >
            Ver listado
          </button>
          <button
            type="button"
            onClick={load}
            className="min-h-[48px] rounded-[16px] border border-[var(--sm-line-strong)] bg-[rgba(255,255,255,0.78)] px-5 font-bold text-[#3b3026]"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--sm-line)] bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_14px_32px_rgba(69,54,38,0.06)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-extrabold text-[#2f261d]">Panel de proveedores</h2>
            <p className="mt-1 text-sm text-[var(--sm-muted)]">
              Los proveedores operativos muestran notas y pedidos; el resto, por ahora, solo pedidos a proveedor.
            </p>
          </div>

          <input
            className="min-h-[46px] w-full max-w-[360px] rounded-[14px] border border-[var(--sm-line-strong)] bg-[#fbfaf8] px-3 outline-none focus:border-[#7f6a53] focus:shadow-[0_0_0_4px_rgba(184,161,126,0.15)]"
            placeholder="Buscar por proveedor, cliente, número de nota o pedido..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {error ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && loadingExtras ? (
          <div className="mt-3 rounded-[16px] border border-[#e6d6be] bg-[#fbf6ec] p-3 text-sm text-[#6d5b45]">
            Cargando notas y pedidos relacionados...
          </div>
        ) : null}

        <div className="grid gap-3">
          {loading ? (
            <div className="rounded-[16px] border border-dashed border-[var(--sm-line)] bg-[#faf8f4] p-4 text-sm text-[var(--sm-muted)]">
              Cargando proveedores...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-[var(--sm-line)] bg-[#faf8f4] p-4 text-sm text-[var(--sm-muted)]">
              No hay proveedores para mostrar.
            </div>
          ) : (
            filteredRows.map((item) => {
              const esOperativo = PROVEEDORES_OPERATIVOS.includes(normalizarTexto(item?.nombre));
              const notas = notasPorProveedor.get(String(item._id)) || [];
              const pedidos = pedidosPorProveedor.get(String(item._id)) || [];
              const pendientes = esOperativo
                ? notas.filter((nota) => nota?.estadoOperativo !== "Finalizado")
                : [];
              const isOpen = openProveedorId === String(item._id);
              const color = item?.color || colorProveedorPorNombre(item?.nombre);

              return (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-[20px] border border-[var(--sm-line)] bg-[#fffdfa] shadow-[0_10px_24px_rgba(69,54,38,0.05)]"
                  style={{
                    borderLeft: `8px solid ${color}`,
                    background: `linear-gradient(135deg, ${color}22 0%, #fffdfa 20%, #fffdfa 100%)`,
                  }}
                >
                  <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_140px_140px_140px_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(73,58,38,0.12)]"
                          style={{ backgroundColor: color }}
                        />
                        <h3 className="text-[18px] font-black text-[#241f19]">{item.nombre}</h3>
                        <span className="rounded-full border px-3 py-1 text-xs font-bold text-[#5f4b34]" style={estiloProveedor(color)}>
                          {item.nombre}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-[var(--sm-muted)]">
                        {item.contacto || "Sin contacto"} {item.telefono ? `· ${item.telefono}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-[#5b5249]">{item.nota || "Sin notas adicionales."}</div>
                    </div>

                    <div className="rounded-[16px] border border-[rgba(70,55,38,0.08)] bg-[#faf6ef] px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8d7f70]">
                        {esOperativo ? "Notas" : "Pedidos"}
                      </div>
                      <div className="mt-1 text-[24px] font-black text-[#231f1a]">{esOperativo ? notas.length : pedidos.length}</div>
                    </div>
                    <div className="rounded-[16px] border border-[rgba(70,55,38,0.08)] bg-[#fff7ea] px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8d7f70]">
                        Pendientes
                      </div>
                      <div className="mt-1 text-[24px] font-black text-[#231f1a]">
                        {esOperativo ? pendientes.length : pedidos.filter((pedido) => pedido?.estado !== "Recibido" && pedido?.estado !== "Cancelado").length}
                      </div>
                    </div>
                    {esOperativo ? (
                      <div className="rounded-[16px] border border-[rgba(70,55,38,0.08)] bg-[#f4f7fb] px-4 py-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8d7f70]">Pedidos</div>
                        <div className="mt-1 text-[24px] font-black text-[#231f1a]">{pedidos.length}</div>
                      </div>
                    ) : (
                      <div aria-hidden="true" className="hidden lg:block" />
                    )}
                    <div className="flex items-center justify-start gap-3 lg:justify-end">
                      <span className="rounded-full border px-3 py-1 text-xs font-bold text-[#5f4b34]" style={estiloProveedor(color)}>
                        Activo
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenProveedorId(isOpen ? "" : String(item._id))}
                        className="min-h-[42px] rounded-[14px] border border-[var(--sm-line-strong)] bg-white px-4 font-bold text-[#3b3026]"
                      >
                        {isOpen ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <section
                      className="border-t border-[rgba(70,55,38,0.08)] px-5 py-4"
                      style={{
                        background: `linear-gradient(180deg, ${color}42 0%, ${color}24 100%)`,
                      }}
                    >
                      {esOperativo ? (
                        <>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[14px] font-extrabold text-[#2f261d]">Notas de pedido</div>
                              <div className="mt-1 text-xs text-[var(--sm-muted)]">
                                {pendientes.length === 0
                                  ? "No hay notas de pedido para este proveedor."
                                  : `${pendientes.length} ${pendientes.length === 1 ? "nota cargada" : "notas cargadas"}`}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2">
                            {pendientes.length === 0 ? (
                              <div className="rounded-[14px] border border-dashed border-[rgba(70,55,38,0.12)] bg-white/70 p-3 text-sm text-[var(--sm-muted)]">
                                Este proveedor no tiene notas cargadas por ahora.
                              </div>
                            ) : (
                              pendientes.map((nota) => {
                                const diasHastaEntrega = getDiasHastaEntrega(nota?.entrega);

                                return (
                                  <article
                                    key={nota._id}
                                    className="rounded-[14px] border border-[rgba(70,55,38,0.08)] bg-white/80 p-3 shadow-[0_6px_18px_rgba(69,54,38,0.04)]"
                                    style={{
                                      background: `linear-gradient(135deg, ${color}16 0%, #fffdfa 34%, #fffdfa 100%)`,
                                    }}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8d7557]">
                                          {nota?.numero || "Sin número"}
                                        </div>
                                        <div className="mt-1 text-[15px] font-black text-[#241f19]">
                                          {getNotaClienteNombre(nota)}
                                        </div>
                                        <div className="mt-1 text-[13px] text-[var(--sm-muted)]">
                                          {fmtDate(nota?.entrega)} ·{" "}
                                          {diasHastaEntrega === null
                                            ? "Sin fecha"
                                            : diasHastaEntrega < 0
                                              ? `${Math.abs(diasHastaEntrega)} día(s) de atraso`
                                              : diasHastaEntrega === 0
                                                ? "Entrega hoy"
                                                : `Faltan ${diasHastaEntrega} día(s)`}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => abrirNotaDetalle(nota._id)}
                                          className="rounded-[12px] border px-3 py-2 text-sm font-bold text-[#3b3026]"
                                        >
                                          Ver nota completa
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => borrarNotaProveedor(nota)}
                                          className="rounded-[12px] border border-[rgba(139,45,45,0.18)] bg-[#fff4f4] px-3 py-2 text-sm font-bold text-[#8b2d2d]"
                                        >
                                          Borrar nota
                                        </button>
                                      </div>
                                    </div>

                                    <div className="mt-3 h-px bg-[rgba(70,55,38,0.08)]"></div>

                                    <div className="mt-3 text-sm text-[#5d5247]">
                                      {getNotaClienteNombre(nota)} - {fmtDate(nota?.entrega)} -{" "}
                                      {diasHastaEntrega === null
                                        ? "Sin fecha de entrega"
                                        : diasHastaEntrega < 0
                                          ? `${Math.abs(diasHastaEntrega)} día(s) de atraso`
                                          : diasHastaEntrega === 0
                                            ? "Entrega hoy"
                                            : `Faltan ${diasHastaEntrega} día(s)`}
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </>
                      ) : null}

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[14px] font-extrabold text-[#2f261d]">Pedidos a proveedor</div>
                          <div className="mt-1 text-xs text-[var(--sm-muted)]">
                            {pedidos.length === 0
                              ? "No hay pedidos cargados para este proveedor."
                              : `${pedidos.length} ${pedidos.length === 1 ? "pedido cargado" : "pedidos cargados"}`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {pedidos.length === 0 ? (
                          <div className="rounded-[14px] border border-dashed border-[rgba(70,55,38,0.12)] bg-white/70 p-3 text-sm text-[var(--sm-muted)]">
                            Este proveedor no tiene pedidos cargados por ahora.
                          </div>
                        ) : (
                          pedidos.map((pedido) => (
                            <article
                              key={pedido._id}
                              className="rounded-[14px] border border-[rgba(70,55,38,0.08)] p-3 shadow-[0_6px_18px_rgba(69,54,38,0.04)]"
                              style={{
                                background: `linear-gradient(135deg, ${color}26 0%, #fffdfa 30%, #fffdfa 100%)`,
                              }}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex rounded-full border px-2 py-1 text-[11px] font-bold text-[#5f4b34]" style={estiloProveedor(color)}>
                                      {item?.nombre}
                                    </span>
                                    <div className="text-[15px] font-black text-[#241f19]">{pedido?.tipo || "Pedido"}</div>
                                  </div>
                                  <div className="mt-1 text-sm text-[var(--sm-muted)]">
                                    Fecha {fmtDate(pedido?.fechaPedido)} · {Array.isArray(pedido?.items) ? pedido.items.length : 0} renglón(es)
                                  </div>
                                </div>
                                <span className="inline-flex rounded-full border border-[#d9e5f4] bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#2f5d89]">
                                  {pedido?.estado || "Pendiente"}
                                </span>
                              </div>

                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-[12px] bg-[#eef6ff] px-3 py-2 text-sm text-[#355d85]">
                                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d90b1]">Estado</span>
                                  <strong className="mt-1 block text-[#2f5d89]">{pedido?.estado || "Pendiente"}</strong>
                                </div>
                                <div className="rounded-[12px] bg-[#f8f3ec] px-3 py-2 text-sm text-[#5d5247]">
                                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#8d7f70]">Detalle</span>
                                  <strong className="mt-1 block text-[#2a241e]">
                                    {Array.isArray(pedido?.items) && pedido.items.length > 0
                                      ? pedido.items.map((detalle) => detalle?.descripcion).filter(Boolean).slice(0, 3).join(" · ")
                                      : "Sin renglones"}
                                  </strong>
                                </div>
                                <div className="rounded-[12px] bg-[#f8f3ec] px-3 py-2 text-sm text-[#5d5247]">
                                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#8d7f70]">Observación</span>
                                  <strong className="mt-1 block text-[#2a241e]">{pedido?.observacion || "Sin observación"}</strong>
                                </div>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[620px] rounded-[28px] border border-[var(--sm-line)] bg-[rgba(255,255,255,0.98)] p-6 shadow-[0_24px_56px_rgba(29,22,17,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8d7557]">Gestión</div>
                <h2 className="mt-2 text-[26px] font-black text-[#28231d]">
                  {formData.id ? "Editar proveedor" : "Nuevo proveedor"}
                </h2>
                <p className="mt-2 text-sm text-[var(--sm-muted)]">Cargá los datos principales y dejalo listo para asignar en notas guardadas.</p>
              </div>
              <button
                type="button"
                onClick={cerrarFormulario}
                className="min-h-[42px] rounded-[14px] border border-[var(--sm-line-strong)] bg-white px-4 font-bold text-[#3b3026]"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-[13px] font-bold text-[#584f46]">Nombre</span>
                <input
                  className="min-h-[48px] rounded-[14px] border border-[var(--sm-line-strong)] bg-[#fbfaf8] px-3 outline-none focus:border-[#7f6a53] focus:shadow-[0_0_0_4px_rgba(184,161,126,0.15)]"
                  value={formData.nombre}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Maderas del Sur"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[13px] font-bold text-[#584f46]">Teléfono</span>
                  <input
                    className="min-h-[48px] rounded-[14px] border border-[var(--sm-line-strong)] bg-[#fbfaf8] px-3 outline-none focus:border-[#7f6a53] focus:shadow-[0_0_0_4px_rgba(184,161,126,0.15)]"
                    value={formData.telefono}
                    onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Opcional"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[13px] font-bold text-[#584f46]">Contacto</span>
                  <input
                    className="min-h-[48px] rounded-[14px] border border-[var(--sm-line-strong)] bg-[#fbfaf8] px-3 outline-none focus:border-[#7f6a53] focus:shadow-[0_0_0_4px_rgba(184,161,126,0.15)]"
                    value={formData.contacto}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contacto: e.target.value }))}
                    placeholder="Persona de contacto"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[13px] font-bold text-[#584f46]">Nota</span>
                <textarea
                  className="min-h-[120px] rounded-[14px] border border-[var(--sm-line-strong)] bg-[#fbfaf8] px-3 py-3 outline-none focus:border-[#7f6a53] focus:shadow-[0_0_0_4px_rgba(184,161,126,0.15)]"
                  value={formData.nota}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nota: e.target.value }))}
                  placeholder="Datos útiles, rubro o condiciones"
                />
              </label>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  className="min-h-[48px] rounded-[16px] border border-[var(--sm-line-strong)] bg-white px-5 font-bold text-[#3b3026]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[48px] rounded-[16px] border-0 bg-[linear-gradient(135deg,#372c22_0%,#554231_100%)] px-5 font-black text-[#fffdf8] shadow-[0_14px_28px_rgba(55,44,34,0.18)]"
                >
                  {saving ? "Guardando..." : formData.id ? "Guardar cambios" : "Guardar proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {listOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[920px] rounded-[28px] border border-[var(--sm-line)] bg-[rgba(255,255,255,0.98)] p-6 shadow-[0_24px_56px_rgba(29,22,17,0.24)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#8d7557]">Base</div>
                <h2 className="mt-2 text-[26px] font-black text-[#28231d]">Listado de proveedores</h2>
                <p className="mt-2 text-sm text-[var(--sm-muted)]">Edición rápida y consulta general de todos los proveedores cargados.</p>
              </div>
              <div className="flex gap-2">
                <input
                  className="min-h-[46px] w-full min-w-[240px] rounded-[14px] border border-[var(--sm-line-strong)] bg-[#fbfaf8] px-3 outline-none focus:border-[#7f6a53] focus:shadow-[0_0_0_4px_rgba(184,161,126,0.15)]"
                  placeholder="Buscar proveedor..."
                  value={listQ}
                  onChange={(e) => setListQ(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  className="min-h-[46px] rounded-[14px] border border-[var(--sm-line-strong)] bg-white px-4 font-bold text-[#3b3026]"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="mt-5 max-h-[60vh] overflow-auto rounded-[20px] border border-[var(--sm-line)]">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-[#f7f1e7]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6f665d]">Proveedor</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6f665d]">Contacto</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6f665d]">Teléfono</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6f665d]">Notas</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#6f665d]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-[var(--sm-muted)]" colSpan={5}>
                        No hay proveedores cargados.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => (
                      <tr key={item._id} className="border-t border-[var(--sm-line)] bg-white">
                        <td className="px-4 py-3 font-bold text-[#241f19]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(73,58,38,0.12)]"
                              style={{ backgroundColor: item?.color || colorProveedorPorNombre(item?.nombre) }}
                            />
                            <span>{item.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#5b5249]">{item.contacto || "-"}</td>
                        <td className="px-4 py-3 text-[#5b5249]">{item.telefono || "-"}</td>
                        <td className="px-4 py-3 text-[#5b5249]">{item.nota || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              className="rounded-[12px] border px-3 py-2 text-sm font-bold text-[#3b3026]"
                              onClick={() => {
                                setListOpen(false);
                                abrirEdicion(item);
                              }}
                            >
                              Editar
                            </button>
                            <button className="rounded-[12px] border px-3 py-2 text-sm font-bold text-[#8b2d2d]" onClick={() => borrar(item)}>
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
          </div>
        </div>
      ) : null}

      <NotaDetalleModal
        open={Boolean(openNotaId)}
        onClose={cerrarNotaDetalle}
        detalle={notaDetalle}
        loading={notaDetalleLoading}
        error={notaDetalleError}
        onRefresh={() => abrirNotaDetalle(openNotaId)}
        soloVistaPrevia
      />
    </div>
  );
}
