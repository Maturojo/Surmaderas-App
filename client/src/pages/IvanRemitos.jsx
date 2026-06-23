import { useEffect, useMemo, useState } from "react";
import { borrarIvanRemito, crearIvanRemito, listarIvanProductos, listarIvanRemitos } from "../services/ivan";
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

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function remitoNumber(remito) {
  return `R-${String(remito?.numero || 0).padStart(5, "0")}`;
}

function buildRemitoHtml(remito) {
  const rows = (remito.items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo || "-")}</td>
          <td>${escapeHtml(item.nombre || "-")}</td>
          <td>${escapeHtml(item.cantidad ?? "-")}</td>
          <td>${escapeHtml(item.unidad || "-")}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(remitoNumber(remito))}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #171411; font-family: Arial, sans-serif; background: #fff; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding: 18px 20px; border-radius: 14px; background: linear-gradient(135deg, #18130f 0%, #6d432f 100%); color: #fff; }
    .head span { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #e9d4c3; }
    .head h1 { margin: 5px 0 4px; font-size: 36px; line-height: 1; text-transform: uppercase; }
    .head p { margin: 0; max-width: 420px; font-size: 12px; color: #f4e9df; }
    .number { flex: 0 0 auto; padding: 10px 14px; border: 1px solid rgba(255,255,255,.42); border-radius: 12px; background: rgba(255,255,255,.12); font-size: 22px; font-weight: 800; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0; }
    .meta div, .notes { padding: 10px 12px; border: 1px solid #ddd5cd; border-radius: 10px; background: #faf7f3; }
    .meta div { min-height: 58px; }
    .meta span { display: block; margin-bottom: 4px; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #7c6e62; }
    .meta strong { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd5cd; padding: 10px; text-align: left; font-size: 13px; }
    th { background: #171411; color: #fff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
    tbody tr:nth-child(even) td { background: #fbf8f4; }
    .notes { margin-top: 18px; min-height: 46px; font-size: 13px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; margin-top: 70px; }
    .signatures span { border-top: 1px solid #111; padding-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <section>
    <div class="head">
      <div>
        <span>Comprobante de entrega</span>
        <h1>Remito</h1>
        <p>Documento generico para control de salida y recepcion de mercaderia.</p>
      </div>
      <div class="number">${escapeHtml(remitoNumber(remito))}</div>
    </div>
    <div class="meta">
      <div><span>Fecha</span><strong>${escapeHtml(fmtDate(remito.fecha))}</strong></div>
      <div><span>Destinatario</span><strong>${escapeHtml(remito.destinatario || "-")}</strong></div>
      <div><span>Direccion</span><strong>${escapeHtml(remito.direccion || "-")}</strong></div>
      <div><span>Transporte</span><strong>${escapeHtml(remito.transporte || "-")}</strong></div>
    </div>
    <table>
      <thead><tr><th>Codigo</th><th>Descripcion</th><th>Cantidad</th><th>Unidad</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4">Sin items</td></tr>`}</tbody>
    </table>
    <div class="notes">Observaciones: ${escapeHtml(remito.observaciones || "-")}</div>
    <div class="signatures"><span>Entrega</span><span>Recibe</span></div>
  </section>
</body>
</html>`;
}

function printRemitoDocument(remito) {
  const frame = document.createElement("iframe");
  frame.title = `Imprimir ${remitoNumber(remito)}`;
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(frame);
    window.print();
    return;
  }

  doc.open();
  doc.write(buildRemitoHtml(remito));
  doc.close();

  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 250);
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
      printRemitoDocument(data.remito);
    } catch (saveError) {
      setError(saveError.message || "No se pudo crear el remito");
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  }

  function printRemito(remito) {
    setCreatedRemito(remito);
    printRemitoDocument(remito);
  }

  async function deleteRemito(remito) {
    const remitoId = remito._id || remito.id;
    const remitoNumber = `R-${String(remito.numero).padStart(5, "0")}`;
    if (!window.confirm(`Borrar el remito ${remitoNumber}?`)) return;

    try {
      await borrarIvanRemito(remitoId);
      setRemitos((current) => current.filter((item) => String(item._id || item.id) !== String(remitoId)));
      setMessage("Remito borrado correctamente");
      setError("");
      if (String(createdRemito?._id || createdRemito?.id) === String(remitoId)) {
        setCreatedRemito(null);
      }
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo borrar el remito");
      setMessage("");
    }
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
                <div className="ivan-itemActions">
                  <button type="button" className="config-usersEditButton" onClick={() => printRemito(remito)}>Imprimir</button>
                  <button type="button" className="config-usersDangerButton" onClick={() => deleteRemito(remito)}>Borrar</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {createdRemito ? (
        <div className="ivan-card ivan-generatedRemito ivan-noPrint">
          <div>
            <div className="config-usersCardTitle">Remito listo</div>
            <p>
              R-{String(createdRemito.numero).padStart(5, "0")} - {createdRemito.destinatario || "Sin destinatario"}
            </p>
          </div>
          <button type="button" className="config-usersSubmit" onClick={() => printRemitoDocument(createdRemito)}>
            Imprimir remito
          </button>
        </div>
      ) : null}

      {createdRemito ? (
        <div className="ivan-printRemito">
          <div className="ivan-printHead">
            <div>
              <span>Comprobante de entrega</span>
              <h2>Remito</h2>
              <p>Documento generico para control de salida y recepcion de mercaderia.</p>
            </div>
            <strong>R-{String(createdRemito.numero).padStart(5, "0")}</strong>
          </div>
          <div className="ivan-printMeta">
            <div><span>Fecha</span><strong>{fmtDate(createdRemito.fecha)}</strong></div>
            <div><span>Destinatario</span><strong>{createdRemito.destinatario}</strong></div>
            <div><span>Direccion</span><strong>{createdRemito.direccion || "-"}</strong></div>
            <div><span>Transporte</span><strong>{createdRemito.transporte || "-"}</strong></div>
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
