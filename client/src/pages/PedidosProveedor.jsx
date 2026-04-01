import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { listarProveedores } from "../services/notasPedido";
import {
  actualizarPedidoProveedor,
  crearPedidoProveedor,
  eliminarPedidoProveedor,
  listarPedidosProveedor,
} from "../services/pedidosProveedor";
import {
  openPedidoProveedorPdf,
  openPedidoProveedorWhatsapp,
} from "../utils/pedidoProveedorDocumento";
import { colorProveedorPorNombre, estiloProveedor } from "../utils/proveedorColor";
import "../css/pedidos-proveedor.css";

const ESTADOS = ["Pendiente", "Pedido", "Recibido", "Cancelado"];
const RESUMEN_ESTADOS = [
  { key: "", label: "Total", field: "total" },
  { key: "Pendiente", label: "Pendientes", field: "pendientes" },
  { key: "Pedido", label: "Pedido", field: "pedidos" },
  { key: "Recibido", label: "Recibidos", field: "recibidos" },
];

function hoyYmd() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function itemVacio() {
  return { descripcion: "", cantidad: 1, unidad: "u", precioEstimado: "" };
}

export default function PedidosProveedor() {
  const [proveedores, setProveedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [form, setForm] = useState({
    proveedorId: "",
    tipo: "Material",
    fechaPedido: hoyYmd(),
    observacion: "",
    items: [itemVacio()],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proveedoresData, pedidosData] = await Promise.all([
        listarProveedores(),
        listarPedidosProveedor({ q, proveedorId: filtroProveedor, estado: filtroEstado }),
      ]);
      setProveedores(proveedoresData);
      setPedidos(pedidosData);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message || "No se pudieron cargar los pedidos a proveedor",
      });
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroProveedor, q]);

  useEffect(() => {
    load();
  }, [load]);

  const resumen = useMemo(() => {
    return {
      total: pedidos.length,
      pendientes: pedidos.filter((item) => item?.estado === "Pendiente").length,
      pedidos: pedidos.filter((item) => item?.estado === "Pedido").length,
      recibidos: pedidos.filter((item) => item?.estado === "Recibido").length,
    };
  }, [pedidos]);

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((item) => String(item._id) === String(form.proveedorId)),
    [proveedores, form.proveedorId]
  );

  function updateItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, itemVacio()] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, idx) => idx !== index),
    }));
  }

  const hayFiltrosActivos = Boolean(q || filtroProveedor || filtroEstado);

  function limpiarFiltros() {
    setQ("");
    setFiltroProveedor("");
    setFiltroEstado("");
  }

  async function submit(e) {
    e.preventDefault();
    const items = form.items
      .map((item) => ({
        descripcion: String(item.descripcion || "").trim(),
        cantidad: Number(item.cantidad || 0),
        unidad: String(item.unidad || "").trim() || "u",
        precioEstimado: Number(item.precioEstimado || 0),
      }))
      .filter((item) => item.descripcion && item.cantidad > 0);

    if (!form.proveedorId) {
      await Swal.fire({ icon: "warning", title: "Falta proveedor", text: "Seleccioná a qué proveedor va el pedido." });
      return;
    }
    if (!form.fechaPedido) {
      await Swal.fire({ icon: "warning", title: "Falta fecha", text: "Indicá la fecha del pedido." });
      return;
    }
    if (items.length === 0) {
      await Swal.fire({ icon: "warning", title: "Faltan renglones", text: "Agregá al menos un producto o material." });
      return;
    }

    try {
      setSaving(true);
      await crearPedidoProveedor({
        proveedorId: form.proveedorId,
        tipo: form.tipo,
        fechaPedido: form.fechaPedido,
        observacion: form.observacion,
        items,
      });
      setForm({
        proveedorId: "",
        tipo: "Material",
        fechaPedido: hoyYmd(),
        observacion: "",
        items: [itemVacio()],
      });
      setIsFormOpen(false);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Pedido creado",
        text: "El pedido quedó guardado para seguimiento.",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Error", text: error?.message || "No se pudo crear el pedido" });
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstado(pedido, estado) {
    try {
      await actualizarPedidoProveedor(pedido._id, { estado });
      await load();
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Error", text: error?.message || "No se pudo actualizar el estado" });
    }
  }

  async function borrarPedido(pedido) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Borrar pedido",
      text: `Se va a borrar el pedido para ${pedido?.proveedorNombre || "el proveedor"}.`,
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await eliminarPedidoProveedor(pedido._id);
      await load();
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Error", text: error?.message || "No se pudo borrar el pedido" });
    }
  }

  async function verPedido(pedido) {
    await openPedidoProveedorPdf(pedido);
  }

  async function enviarPedidoWhatsapp(pedido) {
    const proveedor = proveedores.find((item) => String(item._id) === String(pedido?.proveedorId));
    const tieneWhatsapp = openPedidoProveedorWhatsapp(pedido, proveedor);

    if (!tieneWhatsapp) {
      await Swal.fire({
        icon: "warning",
        title: "Proveedor sin telefono",
        text: "Este proveedor no tiene un telefono cargado para enviarle el pedido por WhatsApp.",
      });
      return;
    }

    await openPedidoProveedorPdf(pedido);
    await Swal.fire({
      icon: "info",
      title: "WhatsApp abierto",
      text: "Te dejamos el PDF listo para que lo adjuntes manualmente en WhatsApp.",
      timer: 2200,
      showConfirmButton: false,
    });
  }

  return (
    <div className="pp-page">
      <section className="pp-hero">
        <div>
          <div className="pp-kicker">Compras y abastecimiento</div>
          <h1 className="pp-title">Pedidos a proveedor</h1>
          <p className="pp-subtitle">
            Cargá pedidos de material o productos, vinculalos a un proveedor y seguí el estado hasta recibirlos.
          </p>
        </div>
        <div className="pp-stats">
          {RESUMEN_ESTADOS.map((item) => {
            const active = filtroEstado === item.key || (!filtroEstado && item.key === "");
            return (
              <button
                key={item.label}
                type="button"
                className={`pp-stat ${active ? "is-active" : ""}`}
                onClick={() => setFiltroEstado(item.key)}
              >
                <span>{item.label}</span>
                <strong>{resumen[item.field]}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pp-layout">
        {isFormOpen ? (
          <div className="pp-modalOverlay" onClick={() => setIsFormOpen(false)}>
            <div className="pp-modalCard" onClick={(e) => e.stopPropagation()}>
              <form className="pp-formCard pp-formCard--modal" onSubmit={submit}>
          <div className="pp-sectionHead pp-sectionHead--modal">
            <div>
              <h2>Nuevo pedido</h2>
              <p>Elegí proveedor, tipo y cargá los renglones del pedido.</p>
            </div>
            <button type="button" className="pp-closeBtn" onClick={() => setIsFormOpen(false)}>
              Cerrar
            </button>
          </div>

          <div className="pp-grid pp-grid--top">
            <label className="pp-field">
              <span>Proveedor</span>
              <select value={form.proveedorId} onChange={(e) => setForm((prev) => ({ ...prev, proveedorId: e.target.value }))}>
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((prov) => (
                  <option key={prov._id} value={prov._id}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="pp-field">
              <span>Tipo</span>
              <select value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}>
                <option value="Material">Material</option>
                <option value="Producto">Producto</option>
              </select>
            </label>

            <label className="pp-field">
              <span>Fecha</span>
              <input
                type="date"
                value={form.fechaPedido}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaPedido: e.target.value }))}
              />
            </label>
          </div>

          {proveedorSeleccionado ? (
            <div className="pp-providerPreview">
              <span
                className="pp-providerTag"
                style={estiloProveedor(proveedorSeleccionado?.color || colorProveedorPorNombre(proveedorSeleccionado?.nombre))}
              >
                {proveedorSeleccionado.nombre}
              </span>
            </div>
          ) : null}

          <div className="pp-itemsHead">
            <div>
              <h3>Renglones del pedido</h3>
              <p>
                {form.items.length} rengl{form.items.length === 1 ? "on" : "ones"} en preparacion para este pedido.
              </p>
            </div>
            <button type="button" className="pp-addBtn" onClick={addItem}>
              Agregar renglón
            </button>
          </div>

          <div className="pp-items">
            {form.items.map((item, index) => (
              <div key={`item-${index}`} className="pp-itemRow">
                <div className="pp-itemIndex">#{index + 1}</div>
                <label className="pp-field pp-field--wide">
                  <span>Detalle</span>
                  <input
                    value={item.descripcion}
                    onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                    placeholder={form.tipo === "Material" ? "Ej: MDF blanco 18mm" : "Ej: Perchero infantil"}
                  />
                </label>
                <label className="pp-field">
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                  />
                </label>
                <label className="pp-field">
                  <span>Unidad</span>
                  <input value={item.unidad} onChange={(e) => updateItem(index, "unidad", e.target.value)} />
                </label>
                <button type="button" className="pp-removeBtn" onClick={() => removeItem(index)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <label className="pp-field">
            <span>Observación</span>
            <textarea
              rows={4}
              value={form.observacion}
              onChange={(e) => setForm((prev) => ({ ...prev, observacion: e.target.value }))}
              placeholder="Ej: confirmar stock, corte a medida, plazo de entrega..."
            />
          </label>

          <div className="pp-formFooter">
            <button type="button" className="pp-addBtn" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="pp-submitBtn" disabled={saving}>
              {saving ? "Guardando..." : "Guardar pedido"}
            </button>
          </div>
              </form>
            </div>
          </div>
        ) : null}

        <section className="pp-listCard">
          <div className="pp-sectionHead">
            <div>
              <h2>Pedidos cargados</h2>
              <p>Buscá por proveedor, detalle o filtrá por estado.</p>
            </div>
            <button type="button" className="pp-newBtn" onClick={() => setIsFormOpen(true)}>
              Nuevo pedido
            </button>
          </div>

          <div className="pp-results">{loading ? "Actualizando..." : `${pedidos.length} resultado${pedidos.length === 1 ? "" : "s"}`}</div>
          <div className="pp-filters">
            <input
              className="pp-search"
              placeholder="Buscar pedido..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {proveedores.map((prov) => (
                <option key={prov._id} value={prov._id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          {hayFiltrosActivos ? (
            <div className="pp-filterBar">
              <div className="pp-filterTags">
                {q ? <span className="pp-filterTag">Busqueda: {q}</span> : null}
                {filtroProveedor ? (
                  <span className="pp-filterTag">
                    Proveedor: {proveedores.find((prov) => String(prov._id) === String(filtroProveedor))?.nombre || "Seleccionado"}
                  </span>
                ) : null}
                {filtroEstado ? <span className="pp-filterTag">Estado: {filtroEstado}</span> : null}
              </div>
              <button type="button" className="pp-clearBtn" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </div>
          ) : null}

          <div className="pp-list">
            {loading ? (
              <div className="pp-empty">Cargando pedidos...</div>
            ) : pedidos.length === 0 ? (
              <div className="pp-empty">Todavía no hay pedidos a proveedor cargados.</div>
            ) : (
              pedidos.map((pedido) => {
                const color = pedido?.proveedorColor || colorProveedorPorNombre(pedido?.proveedorNombre);

                return (
                  <article key={pedido._id} className="pp-orderCard" style={{ borderLeft: `8px solid ${color}` }}>
                    <div className="pp-orderTop">
                      <div>
                        <span className="pp-providerTag" style={estiloProveedor(color)}>
                          {pedido?.proveedorNombre}
                        </span>
                        <h3>{pedido?.tipo}</h3>
                        <div className="pp-orderMeta">
                          {pedido?.fechaPedido} · {pedido?.items?.length || 0} renglón(es)
                        </div>
                        <div className="pp-orderSubmeta">
                          {pedido?.creadoPor ? `Cargado por ${pedido.creadoPor}` : "Sin usuario registrado"}
                        </div>
                      </div>
                      <select
                        className="pp-statusSelect"
                        value={pedido?.estado || "Pendiente"}
                        onChange={(e) => cambiarEstado(pedido, e.target.value)}
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pp-orderItems">
                      {(pedido?.items || []).map((item, idx) => (
                        <div key={`${pedido._id}-${idx}`} className="pp-orderItem">
                          <strong>{item?.descripcion}</strong>
                          <span>
                            {item?.cantidad} {item?.unidad}
                          </span>
                        </div>
                      ))}
                    </div>

                    {pedido?.observacion ? <div className="pp-orderObs">{pedido.observacion}</div> : null}

                    <div className="pp-orderFooter">
                      <div className="pp-orderActions">
                        <button type="button" className="pp-viewBtn" onClick={() => verPedido(pedido)}>
                          Ver pedido
                        </button>
                        <button type="button" className="pp-whatsappBtn" onClick={() => enviarPedidoWhatsapp(pedido)}>
                          WhatsApp
                        </button>
                      </div>
                      <button type="button" className="pp-deleteBtn" onClick={() => borrarPedido(pedido)}>
                        Borrar
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
