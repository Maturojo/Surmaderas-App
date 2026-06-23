import { useEffect, useMemo, useState } from "react";
import { crearIvanRemito, listarIvanProductos, listarIvanRemitos } from "../services/ivan";
import "../css/ivan.css";

const EMPTY_ITEM = { productoId: "", codigo: "", nombre: "", cantidad: "1", unidad: "u", detalle: "" };
const EMPTY_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  destinatario: "",
  direccion: "",
  transporte: "",
  observaciones: "",
  items: [{ ...EMPTY_ITEM }],
};

function fmtDate(value) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR");
}

export default function IvanRemitos() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [productos, setProductos] = useState([]);
  const [remitos, setRemitos] = useState([]);
  const [createdRemito, setCreatedRemito] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalItems = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0),
    [form.items]
  );

  async function loadData() {
    const [productosData, remitosData] = await Promise.all([
      listarIvanProductos({ limit: 100 }),
      listarIvanRemitos({ limit: 20 }),
    ]);
    setProductos(productosData.items || []);
    setRemitos(remitosData.items || []);
  }

  useEffect(() => {
    loadData().catch((loadError) => setError(loadError.message || "No se pudieron cargar los datos"));
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateItem(index, name, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item
      ),
    }));
  }

  function pickProduct(index, productId) {
    const product = productos.find((item) => String(item._id || item.id) === String(productId));
    if (!product) {
      updateItem(index, "productoId", "");
      return;
    }

    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productoId: product._id || product.id,
              codigo: product.codigo || "",
              nombre: product.nombre || "",
              unidad: product.unidad || "u",
            }
          : item
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? [{ ...EMPTY_ITEM }] : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        ...form,
        items: form.items.map((item) => ({ ...item, cantidad: Number(item.cantidad || 0) })),
      };
      const data = await crearIvanRemito(payload);
      setCreatedRemito(data.remito);
      setForm(EMPTY_FORM);
      setMessage("Remito creado correctamente");
      setError("");
      await loadData();
      window.setTimeout(() => window.print(), 150);
    } catch (saveError) {
      setError(saveError.message || "No se pudo crear el remito");
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  }

  function printRemito(remito) {
    setCreatedRemito(remito);
    window.setTimeout(() => window.print(), 150);
  }

  return (
    <section className="ivan-page">
      <div className="ivan-hero ivan-noPrint">
        <div>
          <div className="dashboard-kicker">Produccion IVAN</div>
          <h1 className="dashboard-title">Generador de remitos</h1>
          <p className="dashboard-copy">Carga los datos, genera el remito y se abre listo para imprimir.</p>
        </div>
        <div className="ivan-summary">
          <span>Items</span>
          <strong>{totalItems}</strong>
        </div>
      </div>

      <div className="ivan-grid ivan-noPrint">
        <form className="ivan-card ivan-form" onSubmit={handleSubmit}>
          <div className="config-usersCardTitle">Nuevo remito</div>
          <div className="ivan-formGrid">
            <label className="config-usersField"><span>Fecha</span><input type="date" value={form.fecha} onChange={(e) => updateField("fecha", e.target.value)} required /></label>
            <label className="config-usersField"><span>Destinatario</span><input value={form.destinatario} onChange={(e) => updateField("destinatario", e.target.value)} required /></label>
            <label className="config-usersField"><span>Direccion</span><input value={form.direccion} onChange={(e) => updateField("direccion", e.target.value)} /></label>
            <label className="config-usersField"><span>Transporte</span><input value={form.transporte} onChange={(e) => updateField("transporte", e.target.value)} /></label>
          </div>

          <div className="ivan-materialsHead">
            <strong>Items del remito</strong>
            <button type="button" className="config-usersSecondaryButton" onClick={addItem}>Agregar item</button>
          </div>

          <div className="ivan-remitoItems">
            {form.items.map((item, index) => (
              <div className="ivan-remitoRow" key={index}>
                <select value={item.productoId} onChange={(e) => pickProduct(index, e.target.value)}>
                  <option value="">Producto cargado</option>
                  {productos.map((product) => (
                    <option key={product._id || product.id} value={product._id || product.id}>{product.nombre}</option>
                  ))}
                </select>
                <input placeholder="Codigo" value={item.codigo} onChange={(e) => updateItem(index, "codigo", e.target.value)} />
                <input placeholder="Descripcion" value={item.nombre} onChange={(e) => updateItem(index, "nombre", e.target.value)} required />
                <input placeholder="Cantidad" value={item.cantidad} onChange={(e) => updateItem(index, "cantidad", e.target.value)} inputMode="decimal" />
                <input placeholder="Unidad" value={item.unidad} onChange={(e) => updateItem(index, "unidad", e.target.value)} />
                <button type="button" className="config-usersDangerButton" onClick={() => removeItem(index)}>Quitar</button>
              </div>
            ))}
          </div>

          <label className="config-usersField"><span>Observaciones</span><textarea value={form.observaciones} onChange={(e) => updateField("observaciones", e.target.value)} rows="3" /></label>

          {error ? <div className="config-usersMessage error">{error}</div> : null}
          {message ? <div className="config-usersMessage success">{message}</div> : null}

          <button className="config-usersSubmit" disabled={isSaving}>{isSaving ? "Generando..." : "Generar remito"}</button>
        </form>

        <div className="ivan-card">
          <div className="config-usersCardTitle">Ultimos remitos</div>
          <div className="ivan-productList">
            {remitos.map((remito) => (
              <article className="ivan-productItem" key={remito._id || remito.id}>
                <div className="ivan-remitoNumber">R{String(remito.numero).padStart(5, "0")}</div>
                <div>
                  <strong>{remito.destinatario}</strong>
                  <span>{fmtDate(remito.fecha)} - {remito.items?.length || 0} items</span>
                </div>
                <button type="button" className="config-usersEditButton" onClick={() => printRemito(remito)}>Imprimir</button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {createdRemito ? (
        <div className="ivan-printRemito">
          <div className="ivan-printHead">
            <div>
              <img src="/logo-sur-maderas.png" alt="Sur Maderas" />
              <h2>Remito</h2>
            </div>
            <strong>R{String(createdRemito.numero).padStart(5, "0")}</strong>
          </div>
          <div className="ivan-printMeta">
            <span>Fecha: {fmtDate(createdRemito.fecha)}</span>
            <span>Destinatario: {createdRemito.destinatario}</span>
            <span>Direccion: {createdRemito.direccion || "-"}</span>
            <span>Transporte: {createdRemito.transporte || "-"}</span>
          </div>
          <table className="ivan-printTable">
            <thead><tr><th>Codigo</th><th>Descripcion</th><th>Cantidad</th><th>Unidad</th></tr></thead>
            <tbody>
              {createdRemito.items?.map((item) => (
                <tr key={item._id || `${item.nombre}-${item.codigo}`}>
                  <td>{item.codigo}</td>
                  <td>{item.nombre}</td>
                  <td>{item.cantidad}</td>
                  <td>{item.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ivan-printNotes">Observaciones: {createdRemito.observaciones || "-"}</div>
          <div className="ivan-signatures">
            <span>Entrega</span>
            <span>Recibe</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
