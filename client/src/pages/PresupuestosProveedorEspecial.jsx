import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import CameraImageUploadField from "../features/presupuestos/components/CameraImageUploadField";
import { listarProveedores } from "../services/notasPedido";
import {
  actualizarPresupuestoProveedor,
  crearPresupuestoProveedor,
  eliminarPresupuestoProveedor,
  listarPresupuestosProveedor,
} from "../services/presupuestosProveedor";
import { colorProveedorPorNombre, estiloProveedor } from "../utils/proveedorColor";

function hoyYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatMonto(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatMontoOpcional(value) {
  return value === null || value === undefined || value === "" ? "Sin cargar" : formatMonto(value);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-AR");
}

function box(extra = {}) {
  return {
    padding: 22,
    borderRadius: 24,
    border: "1px solid var(--sm-dashboard-line)",
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 18px 42px var(--sm-dashboard-line)",
    ...extra,
  };
}

function btn(primary = false) {
  return primary
    ? { minHeight: 44, padding: "0 16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#5a4730,#846947)", color: "#fff", fontWeight: 800, cursor: "pointer" }
    : { minHeight: 44, padding: "0 16px", borderRadius: 14, border: "1px solid rgba(96,96,96,.18)", background: "#fff", fontWeight: 800, cursor: "pointer" };
}

const input = { minHeight: 46, borderRadius: 14, border: "1px solid #d8d0c5", padding: "0 12px", background: "#fff" };

function Overlay({ children, onClose, zIndex = 70 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex, background: "rgba(28, 24, 20, 0.62)", display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

function initialForm() {
  return {
    id: "",
    proveedorId: "",
    descripcionPedido: "",
    materiales: "",
    medidas: "",
    terminacion: "",
    monto: "",
    precioCliente: "",
    fechaPresupuesto: hoyYmd(),
    observacion: "",
    foto: null,
  };
}

function openNewPresupuesto(setForm, setDetalleAbierto, setIsModalOpen) {
  setForm(initialForm());
  setDetalleAbierto(null);
  setIsModalOpen(true);
}

function useIsMobile(maxWidth = 760) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [maxWidth]);

  return isMobile;
}

export default function PresupuestosProveedorEspecial() {
  const isMobile = useIsMobile();
  const [proveedores, setProveedores] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [q, setQ] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proveedoresData, presupuestosData] = await Promise.all([
        listarProveedores(),
        listarPresupuestosProveedor({ q, proveedorId: filtroProveedor }),
      ]);
      setProveedores(proveedoresData);
      setPresupuestos(presupuestosData);
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Error", text: error?.message || "No se pudieron cargar los presupuestos" });
    } finally {
      setLoading(false);
    }
  }, [filtroProveedor, q]);

  useEffect(() => {
    load();
  }, [load]);

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((item) => String(item._id) === String(form.proveedorId)),
    [proveedores, form.proveedorId]
  );

  const resumen = useMemo(() => ({
    cantidad: presupuestos.length,
    proveedor: presupuestos.reduce((acc, item) => acc + Number(item?.monto || 0), 0),
    cliente: presupuestos.reduce((acc, item) => acc + Number(item?.precioCliente || 0), 0),
    conFoto: presupuestos.filter((item) => item?.foto?.dataUrl).length,
  }), [presupuestos]);

  async function handleSubmit(event) {
    event.preventDefault();
    const monto = form.monto === "" ? null : Number(form.monto);
    const precioCliente = Number(form.precioCliente || 0);

    if (!form.proveedorId) return Swal.fire({ icon: "warning", title: "Falta proveedor", text: "Selecciona el proveedor." });
    if (!form.descripcionPedido.trim()) return Swal.fire({ icon: "warning", title: "Falta detalle", text: "Escribi el pedido especial." });
    if (!form.fechaPresupuesto) return Swal.fire({ icon: "warning", title: "Falta fecha", text: "Indica la fecha del presupuesto." });
    if (monto !== null && (!Number.isFinite(monto) || monto < 0)) return Swal.fire({ icon: "warning", title: "Precio proveedor invalido", text: "Si lo cargas, tiene que ser un valor valido." });
    if (!Number.isFinite(precioCliente) || precioCliente < 0) return Swal.fire({ icon: "warning", title: "Precio Final invalido", text: "Revisa el valor de Final." });

    try {
      setSaving(true);
      const payload = {
        proveedorId: form.proveedorId,
        descripcionPedido: form.descripcionPedido.trim(),
        materiales: form.materiales.trim(),
        medidas: form.medidas.trim(),
        terminacion: form.terminacion.trim(),
        monto,
        precioCliente,
        fechaPresupuesto: form.fechaPresupuesto,
        observacion: form.observacion.trim(),
        foto: form.foto,
      };

      if (form.id) {
        await actualizarPresupuestoProveedor(form.id, payload);
      } else {
        await crearPresupuestoProveedor(payload);
      }

      setForm(initialForm());
      setIsModalOpen(false);
      await load();
      if (detalleAbierto && form.id && String(detalleAbierto._id) === String(form.id)) {
        setDetalleAbierto(null);
      }
      await Swal.fire({ icon: "success", title: form.id ? "Presupuesto actualizado" : "Presupuesto guardado", text: "Quedo listo para buscar y revisar.", timer: 1500, showConfirmButton: false });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Error", text: error?.message || "No se pudo guardar el presupuesto" });
    } finally {
      setSaving(false);
    }
  }

  function editarPresupuesto(item) {
    setForm({
      id: item?._id || "",
      proveedorId: item?.proveedorId || "",
      descripcionPedido: item?.descripcionPedido || "",
      materiales: item?.materiales || "",
      medidas: item?.medidas || "",
      terminacion: item?.terminacion || "",
      monto: item?.monto === null || item?.monto === undefined ? "" : String(item.monto),
      precioCliente: String(item?.precioCliente ?? ""),
      fechaPresupuesto: item?.fechaPresupuesto || hoyYmd(),
      observacion: item?.observacion || "",
      foto: item?.foto || null,
    });
    setDetalleAbierto(null);
    setIsModalOpen(true);
  }

  async function borrarPresupuesto(item) {
    const result = await Swal.fire({ icon: "warning", title: "Eliminar presupuesto", text: `Se va a borrar el presupuesto de ${item?.proveedorNombre || "este proveedor"}.`, showCancelButton: true, confirmButtonText: "Si, borrar", cancelButtonText: "Cancelar", reverseButtons: true });
    if (!result.isConfirmed) return;
    try {
      await eliminarPresupuestoProveedor(item._id);
      if (String(detalleAbierto?._id) === String(item._id)) setDetalleAbierto(null);
      await load();
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Error", text: error?.message || "No se pudo borrar el presupuesto" });
    }
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 20 }}>
      <section style={{ ...box({ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.1fr) minmax(440px,.9fr)", gap: 18, padding: isMobile ? 18 : "26px 28px", borderRadius: isMobile ? 18 : 30 }), background: "radial-gradient(circle at top right, rgba(200,96,58,0.12), transparent 24%), linear-gradient(135deg,#ffffff,#f2f2f0)" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7d745e" }}>Presupuestos</div>
          <h1 style={{ margin: "8px 0 10px", fontSize: isMobile ? 30 : 38, lineHeight: 1.02, color: "#28231d" }}>Proveedores para pedidos especiales</h1>
          <p style={{ margin: 0, maxWidth: 720, color: "#6f655a", fontSize: 15 }}>Cada presupuesto queda en una card con miniatura, precio proveedor, precio final y una vista completa para abrir cuando lo necesites.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(160px, 220px)", gap: 12, justifyContent: isMobile ? "stretch" : "end" }}>
          <div style={box({ padding: 18, display: "grid", gap: 6 })}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7b7166", fontWeight: 800 }}>Guardado</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--sm-navy)", lineHeight: 1.05 }}>{resumen.cantidad}</div>
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <Overlay onClose={() => setIsModalOpen(false)} zIndex={70}>
          <div style={box({ width: "min(820px, calc(100vw - 24px))", maxHeight: "calc(100dvh - 24px)", overflow: "auto", display: "grid", gap: 16, padding: isMobile ? 16 : 24 })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "var(--sm-navy)" }}>{form.id ? "Editar presupuesto" : "Nuevo presupuesto"}</h2>
                <p style={{ margin: "6px 0 0", color: "#6f655a", fontSize: 14 }}>{form.id ? "Actualiza los datos del presupuesto guardado." : "Carga tanto el precio proveedor como el precio que le dijimos al cliente."}</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} style={btn(false)}>Cerrar</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Proveedor</span>
                <select value={form.proveedorId} onChange={(event) => setForm((prev) => ({ ...prev, proveedorId: event.target.value }))} style={input}>
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map((prov) => <option key={prov._id} value={prov._id}>{prov.nombre}</option>)}
                </select>
              </label>
              {proveedorSeleccionado ? <span style={{ ...estiloProveedor(proveedorSeleccionado?.color || colorProveedorPorNombre(proveedorSeleccionado?.nombre)), display: "inline-flex", width: "fit-content" }}>{proveedorSeleccionado.nombre}</span> : null}
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Pedido especial</span>
                <input value={form.descripcionPedido} onChange={(event) => setForm((prev) => ({ ...prev, descripcionPedido: event.target.value }))} placeholder="Ej: Mueble para TV con puertas corredizas" style={input} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Materiales</span>
                  <input value={form.materiales} onChange={(event) => setForm((prev) => ({ ...prev, materiales: event.target.value }))} placeholder="Ej: Melamina blanca 18mm" style={input} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Medidas</span>
                  <input value={form.medidas} onChange={(event) => setForm((prev) => ({ ...prev, medidas: event.target.value }))} placeholder="Ej: 180 x 60 x 45 cm" style={input} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Terminacion</span>
                  <input value={form.terminacion} onChange={(event) => setForm((prev) => ({ ...prev, terminacion: event.target.value }))} placeholder="Ej: Laca blanca mate" style={input} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Precio proveedor</span><input type="number" min="0" step="1" value={form.monto} onChange={(event) => setForm((prev) => ({ ...prev, monto: event.target.value }))} placeholder="Opcional" style={input} /></label>
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Precio final</span><input type="number" min="0" step="1" value={form.precioCliente} onChange={(event) => setForm((prev) => ({ ...prev, precioCliente: event.target.value }))} placeholder="450000" style={input} /></label>
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Fecha</span><input type="date" value={form.fechaPresupuesto} onChange={(event) => setForm((prev) => ({ ...prev, fechaPresupuesto: event.target.value }))} style={input} /></label>
              </div>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#655c51", fontWeight: 700 }}>Observacion</span>
                <textarea rows={4} value={form.observacion} onChange={(event) => setForm((prev) => ({ ...prev, observacion: event.target.value }))} placeholder="Ej: Incluye lustre, herrajes y demora estimada" style={{ ...input, minHeight: 120, padding: 12, resize: "vertical" }} />
              </label>
              <CameraImageUploadField label="Foto del presupuesto o referencia" value={form.foto} onChange={(foto) => setForm((prev) => ({ ...prev, foto }))} maxMB={1.5} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={btn(false)}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ ...btn(true), opacity: saving ? 0.7 : 1 }}>{saving ? (form.id ? "Actualizando..." : "Guardando...") : (form.id ? "Guardar cambios" : "Guardar presupuesto")}</button>
              </div>
            </form>
          </div>
        </Overlay>
      ) : null}

      {detalleAbierto ? (
        <Overlay onClose={() => setDetalleAbierto(null)} zIndex={75}>
          <div style={box({ width: "min(980px, calc(100vw - 24px))", maxHeight: "calc(100dvh - 24px)", overflow: "auto", display: "grid", gap: 18, padding: isMobile ? 16 : 24 })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ ...estiloProveedor(detalleAbierto?.proveedorColor || colorProveedorPorNombre(detalleAbierto?.proveedorNombre)), display: "inline-flex", width: "fit-content" }}>{detalleAbierto?.proveedorNombre}</span>
                <h2 style={{ margin: 0, fontSize: 28, color: "var(--sm-navy)" }}>{detalleAbierto?.descripcionPedido}</h2>
                <div style={{ color: "#766c61", fontSize: 14 }}>Fecha: {formatDate(detalleAbierto?.fechaPresupuesto)}</div>
              </div>
              <button type="button" onClick={() => setDetalleAbierto(null)} style={btn(false)}>Cerrar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(280px, 360px) minmax(0, 1fr)", gap: 18 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--sm-brand-gray)" }}>Referencia visual</div>
                {detalleAbierto?.foto?.dataUrl ? <img src={detalleAbierto.foto.dataUrl} alt={`Referencia de ${detalleAbierto?.descripcionPedido || "presupuesto"}`} style={{ width: "100%", borderRadius: 18, border: "1px solid var(--sm-dashboard-line)", background: "#fff", objectFit: "cover", boxShadow: "0 12px 26px var(--sm-dashboard-line)" }} /> : <div style={{ minHeight: 280, borderRadius: 18, border: "1px dashed rgba(96,96,96,.24)", display: "grid", placeItems: "center", color: "var(--sm-brand-gray)", background: "var(--sm-dashboard-soft)" }}>Sin imagen</div>}
                <div style={{ padding: 12, borderRadius: 14, background: "#f7f1e8", color: "#6b6155", fontSize: 13, lineHeight: 1.45 }}>
                  Usa esta imagen como apoyo rapido para recordar el trabajo que se cotizo.
                </div>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 18, borderRadius: 18, background: "linear-gradient(180deg,#fff4ef,#f7f3f0)", border: "1px solid var(--sm-dashboard-line)" }}><div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--sm-brand-gray)" }}>Precio proveedor</div><div style={{ marginTop: 8, fontSize: 30, fontWeight: 900, color: "var(--sm-navy)", lineHeight: 1.05 }}>{formatMontoOpcional(detalleAbierto?.monto)}</div><div style={{ marginTop: 8, fontSize: 13, color: "var(--sm-brand-gray)" }}>Valor que paso el proveedor para hacer el trabajo.</div></div>
                  <div style={{ padding: 18, borderRadius: 18, background: "linear-gradient(180deg,#ffffff,#f2f2f0)", border: "1px solid var(--sm-dashboard-line)" }}><div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--sm-brand-gray)" }}>Precio final</div><div style={{ marginTop: 8, fontSize: 30, fontWeight: 900, color: "var(--sm-navy)", lineHeight: 1.05 }}>{formatMonto(detalleAbierto?.precioCliente)}</div><div style={{ marginTop: 8, fontSize: 13, color: "var(--sm-brand-gray)" }}>Valor que se informo o se presupuestó al cliente.</div></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "var(--sm-dashboard-soft)", border: "1px solid var(--sm-dashboard-line)", display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#847869" }}>Proveedor</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--sm-navy)" }}>{detalleAbierto?.proveedorNombre}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "var(--sm-dashboard-soft)", border: "1px solid var(--sm-dashboard-line)", display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#847869" }}>Fecha</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--sm-navy)" }}>{formatDate(detalleAbierto?.fechaPresupuesto)}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "var(--sm-dashboard-soft)", border: "1px solid var(--sm-dashboard-line)", display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#847869" }}>Materiales</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sm-navy)" }}>{detalleAbierto?.materiales || "-"}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "var(--sm-dashboard-soft)", border: "1px solid var(--sm-dashboard-line)", display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#847869" }}>Medidas</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sm-navy)" }}>{detalleAbierto?.medidas || "-"}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "var(--sm-dashboard-soft)", border: "1px solid var(--sm-dashboard-line)", display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#847869" }}>Terminacion</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sm-navy)" }}>{detalleAbierto?.terminacion || "-"}</div>
                  </div>
                </div>

                <div style={{ padding: 18, borderRadius: 18, background: "var(--sm-dashboard-soft)", border: "1px solid var(--sm-dashboard-line)", display: "grid", gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--sm-brand-gray)" }}>Detalle completo</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--sm-navy)", lineHeight: 1.2 }}>{detalleAbierto?.descripcionPedido}</div>
                  <div style={{ height: 1, background: "var(--sm-dashboard-line)" }} />
                  <div style={{ color: "#5e554a", lineHeight: 1.7, fontSize: 15 }}>{detalleAbierto?.observacion || "Sin observaciones cargadas."}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", paddingTop: 4 }}>
                  <div style={{ color: "#7f7467", fontSize: 13 }}>{detalleAbierto?.creadoPor ? `Cargado por ${detalleAbierto.creadoPor}` : "Sin usuario registrado"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => editarPresupuesto(detalleAbierto)} style={btn(true)}>Editar</button>
                    <button type="button" onClick={() => setDetalleAbierto(null)} style={btn(false)}>Cerrar vista</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Overlay>
      ) : null}

      <section style={box({ display: "grid", gap: 16 })}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: "var(--sm-navy)" }}>Historial buscable</h2>
            <p style={{ margin: "6px 0 0", color: "#6f655a", fontSize: 14 }}>Cards compactas para tener muchos presupuestos y entrar a ver el detalle completo.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ color: "var(--sm-brand-gray)", fontSize: 13 }}>{loading ? "Actualizando..." : `${presupuestos.length} resultado${presupuestos.length === 1 ? "" : "s"}`}</div>
            <button type="button" onClick={() => openNewPresupuesto(setForm, setDetalleAbierto, setIsModalOpen)} style={btn(true)}>Nuevo presupuesto</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px,1fr) 240px auto", gap: 10 }}>
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar presupuesto..." style={input} />
          <select value={filtroProveedor} onChange={(event) => setFiltroProveedor(event.target.value)} style={input}>
            <option value="">Todos los proveedores</option>
            {proveedores.map((prov) => <option key={prov._id} value={prov._id}>{prov.nombre}</option>)}
          </select>
          <button type="button" onClick={() => { setQ(""); setFiltroProveedor(""); }} style={{ ...btn(false), background: q || filtroProveedor ? "#ffffff" : "var(--sm-dashboard-soft)" }}>Limpiar</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 14, alignItems: "start" }}>
          {loading ? <div style={{ color: "#6b6155" }}>Cargando presupuestos...</div> : presupuestos.length === 0 ? <div style={{ color: "#6b6155" }}>Todavia no hay presupuestos especiales cargados.</div> : presupuestos.map((item) => {
            const color = item?.proveedorColor || colorProveedorPorNombre(item?.proveedorNombre);
            const matchImporte = q && (formatMonto(item?.monto).toLowerCase().includes(q.toLowerCase()) || formatMonto(item?.precioCliente).toLowerCase().includes(q.toLowerCase()));
            return (
              <article key={item._id} style={{ borderRadius: 16, border: "1px solid var(--sm-dashboard-line)", background: "var(--sm-dashboard-soft)", padding: 10, display: "grid", gap: 8, borderLeft: `6px solid ${color}` }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "64px minmax(0,1fr)", gap: 10, alignItems: "start" }}>
                  {item?.foto?.dataUrl ? <img src={item.foto.dataUrl} alt={`Referencia de ${item?.proveedorNombre || "proveedor"}`} style={{ width: 64, height: 64, borderRadius: 10, border: "1px solid var(--sm-dashboard-line)", background: "#fff", objectFit: "cover" }} /> : <div style={{ width: 64, height: 64, borderRadius: 10, border: "1px dashed rgba(96,96,96,.22)", background: "var(--sm-dashboard-soft)", display: "grid", placeItems: "center", color: "var(--sm-brand-gray)", fontSize: 10, textAlign: "center", padding: 6, lineHeight: 1.1 }}>Sin imagen</div>}
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "grid", gap: 5 }}>
                        <span style={{ ...estiloProveedor(color), display: "inline-flex", width: "fit-content" }}>{item?.proveedorNombre}</span>
                        <div style={{ color: "#60564b", fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{item?.descripcionPedido}</div>
                      </div>
                      <div style={{ display: "grid", gap: 3, justifyItems: "end", color: "#7f7467", fontSize: 11 }}>
                        <div>Fecha: {formatDate(item?.fechaPresupuesto)}</div>
                        <div>{item?.creadoPor ? `Cargado por ${item.creadoPor}` : "Sin usuario registrado"}</div>
                        {matchImporte ? <div style={{ color: "#6b5229", fontWeight: 700 }}>Coincidio por monto</div> : null}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 8 }}>
                      <div style={{ padding: 8, borderRadius: 10, background: "#f5eee4" }}><div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7b7060", fontWeight: 800 }}>Proveedor</div><div style={{ marginTop: 3, fontSize: 16, fontWeight: 900, color: "var(--sm-navy)", lineHeight: 1.1 }}>{formatMontoOpcional(item?.monto)}</div></div>
                      <div style={{ padding: 8, borderRadius: 10, background: "#edf4e7" }}><div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sm-brand-gray)", fontWeight: 800 }}>Final</div><div style={{ marginTop: 3, fontSize: 16, fontWeight: 900, color: "var(--sm-navy)", lineHeight: 1.1 }}>{formatMonto(item?.precioCliente)}</div></div>
                    </div>
                    <div style={{ color: "#5d5449", fontSize: 12, lineHeight: 1.35 }}>{item?.observacion || "Sin observaciones cargadas."}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ color: "#8a7d70", fontSize: 10 }}>{item?.createdAt ? `Guardado el ${new Date(item.createdAt).toLocaleString("es-AR")}` : ""}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setDetalleAbierto(item)} style={{ ...btn(false), minHeight: 32, padding: "0 10px", borderRadius: 10, fontSize: 12 }}>Ver</button>
                        <button type="button" onClick={() => editarPresupuesto(item)} style={{ ...btn(false), minHeight: 32, padding: "0 10px", borderRadius: 10, fontSize: 12 }}>Editar</button>
                        <button type="button" onClick={() => borrarPresupuesto(item)} style={{ ...btn(false), minHeight: 32, padding: "0 10px", borderRadius: 10, fontSize: 12, background: "#fff2f2", border: "1px solid rgba(181,84,84,0.18)", color: "#8b2d2d" }}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
