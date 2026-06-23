import { useEffect, useMemo, useState } from "react";
import { borrarIvanProducto, guardarIvanProducto, listarIvanProductos } from "../services/ivan";
import "../css/ivan.css";

const EMPTY_MATERIAL = { tipo: "material", nombre: "", cantidad: "", unidad: "u", costoUnitario: "" };
const EMPTY_FORM = {
  codigo: "",
  nombre: "",
  descripcion: "",
  imagen: "",
  materiales: [{ ...EMPTY_MATERIAL }],
  costo: "",
  valor: "",
  stock: "",
  unidad: "u",
  observaciones: "",
  activo: true,
};

function toNumber(value) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function IvanProductos() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const costoMateriales = useMemo(
    () => form.materiales.reduce((sum, item) => sum + toNumber(item.cantidad) * toNumber(item.costoUnitario), 0),
    [form.materiales]
  );

  const margen = toNumber(form.valor) - (toNumber(form.costo) || costoMateriales);

  async function loadProductos() {
    try {
      setIsLoading(true);
      const data = await listarIvanProductos({ q: query, limit: 60 });
      setItems(data.items || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los productos");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadProductos, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateMaterial(index, name, value) {
    setForm((current) => ({
      ...current,
      materiales: current.materiales.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item
      ),
    }));
  }

  function addMaterial() {
    setForm((current) => ({ ...current, materiales: [...current.materiales, { ...EMPTY_MATERIAL }] }));
  }

  function removeMaterial(index) {
    setForm((current) => ({
      ...current,
      materiales: current.materiales.length === 1
        ? [{ ...EMPTY_MATERIAL }]
        : current.materiales.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readImageAsDataUrl(file);
    updateField("imagen", dataUrl);
  }

  function startEdit(product) {
    setEditingId(product._id || product.id);
    setForm({
      codigo: product.codigo || "",
      nombre: product.nombre || "",
      descripcion: product.descripcion || "",
      imagen: product.imagen || "",
      materiales: product.materiales?.length ? product.materiales : [{ ...EMPTY_MATERIAL }],
      costo: product.costo || "",
      valor: product.valor || "",
      stock: product.stock || "",
      unidad: product.unidad || "u",
      observaciones: product.observaciones || "",
      activo: product.activo !== false,
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError("Carga el nombre del producto");
      setMessage("");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...form,
        costo: form.costo === "" ? costoMateriales : toNumber(form.costo),
        valor: toNumber(form.valor),
        stock: toNumber(form.stock),
        materiales: form.materiales.map((item) => ({
          ...item,
          cantidad: toNumber(item.cantidad),
          costoUnitario: toNumber(item.costoUnitario),
        })),
      };
      await guardarIvanProducto(payload, editingId);
      setMessage(editingId ? "Producto actualizado correctamente" : "Producto cargado correctamente");
      setError("");
      resetForm();
      await loadProductos();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el producto");
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Borrar ${product.nombre}?`)) return;
    try {
      await borrarIvanProducto(product._id || product.id);
      setMessage("Producto borrado correctamente");
      await loadProductos();
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo borrar el producto");
    }
  }

  return (
    <section className="ivan-page">
      <div className="ivan-hero">
        <div>
          <div className="dashboard-kicker">Produccion IVAN</div>
          <h1 className="dashboard-title">Carga de productos</h1>
          <p className="dashboard-copy">Productos propios con imagen, materiales, listones, cantidades, costos y valor final.</p>
        </div>
        <div className="ivan-summary">
          <span>Productos</span>
          <strong>{items.length}</strong>
        </div>
      </div>

      <div className="ivan-grid">
        <form className="ivan-card ivan-form" onSubmit={handleSubmit}>
          <div className="config-usersCardTitle">{editingId ? "Editar producto" : "Nuevo producto"}</div>

          <div className="ivan-formGrid">
            <label className="config-usersField"><span>Codigo</span><input value={form.codigo} onChange={(e) => updateField("codigo", e.target.value)} /></label>
            <label className="config-usersField"><span>Nombre</span><input value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} required /></label>
            <label className="config-usersField"><span>Unidad</span><input value={form.unidad} onChange={(e) => updateField("unidad", e.target.value)} /></label>
            <label className="config-usersField"><span>Stock</span><input value={form.stock} onChange={(e) => updateField("stock", e.target.value)} inputMode="decimal" /></label>
          </div>

          <label className="config-usersField"><span>Descripcion</span><textarea value={form.descripcion} onChange={(e) => updateField("descripcion", e.target.value)} rows="3" /></label>

          <div className="ivan-imageRow">
            <label className="config-usersField">
              <span>Imagen</span>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </label>
            {form.imagen ? <img className="ivan-preview" src={form.imagen} alt="Vista previa" /> : <div className="ivan-preview is-empty">Sin imagen</div>}
          </div>

          <div className="ivan-materialsHead">
            <div>
              <strong>Materiales y listones</strong>
              <small>Costo calculado: {formatMoney(costoMateriales)}</small>
            </div>
            <button type="button" className="config-usersSecondaryButton" onClick={addMaterial}>Agregar item</button>
          </div>

          <div className="ivan-materials">
            {form.materiales.map((item, index) => (
              <div className="ivan-materialRow" key={index}>
                <select value={item.tipo} onChange={(e) => updateMaterial(index, "tipo", e.target.value)}>
                  <option value="material">Material</option>
                  <option value="liston">Liston</option>
                </select>
                <input placeholder="Nombre" value={item.nombre} onChange={(e) => updateMaterial(index, "nombre", e.target.value)} />
                <input placeholder="Cantidad" value={item.cantidad} onChange={(e) => updateMaterial(index, "cantidad", e.target.value)} inputMode="decimal" />
                <input placeholder="Unidad" value={item.unidad} onChange={(e) => updateMaterial(index, "unidad", e.target.value)} />
                <input placeholder="Costo unit." value={item.costoUnitario} onChange={(e) => updateMaterial(index, "costoUnitario", e.target.value)} inputMode="decimal" />
                <button type="button" className="config-usersDangerButton" onClick={() => removeMaterial(index)}>Quitar</button>
              </div>
            ))}
          </div>

          <div className="ivan-formGrid">
            <label className="config-usersField"><span>Costo</span><input value={form.costo} onChange={(e) => updateField("costo", e.target.value)} inputMode="decimal" placeholder={String(Math.round(costoMateriales))} /></label>
            <label className="config-usersField"><span>Valor</span><input value={form.valor} onChange={(e) => updateField("valor", e.target.value)} inputMode="decimal" /></label>
            <div className="ivan-metric"><span>Margen</span><strong>{formatMoney(margen)}</strong></div>
          </div>

          <label className="config-usersField"><span>Observaciones</span><textarea value={form.observaciones} onChange={(e) => updateField("observaciones", e.target.value)} rows="3" /></label>

          {error ? <div className="config-usersMessage error">{error}</div> : null}
          {message ? <div className="config-usersMessage success">{message}</div> : null}

          <div className="ivan-actions">
            <button className="config-usersSubmit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar producto"}</button>
            {editingId ? <button type="button" className="config-usersSecondaryButton" onClick={resetForm}>Cancelar edicion</button> : null}
          </div>
        </form>

        <div className="ivan-card">
          <div className="ivan-listHead">
            <div className="config-usersCardTitle">Productos cargados</div>
            <input className="ivan-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" />
          </div>
          {isLoading ? <div className="config-usersEmpty">Cargando productos...</div> : null}
          {!isLoading && !items.length ? <div className="config-usersEmpty">Todavia no hay productos.</div> : null}
          <div className="ivan-productList">
            {items.map((product) => (
              <article className="ivan-productItem" key={product._id || product.id}>
                {product.imagen ? <img src={product.imagen} alt={product.nombre} /> : <div className="ivan-thumbEmpty" />}
                <div>
                  <strong>{product.nombre}</strong>
                  <span>{product.codigo || "Sin codigo"} · {formatMoney(product.valor)} · costo {formatMoney(product.costo)}</span>
                  <small>{product.materiales?.length || 0} materiales/listones</small>
                </div>
                <div className="ivan-itemActions">
                  <button type="button" className="config-usersEditButton" onClick={() => startEdit(product)}>Editar</button>
                  <button type="button" className="config-usersDangerButton" onClick={() => handleDelete(product)}>Borrar</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
