import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getPresupuestoDraft, listPresupuestoDrafts } from "../services/presupuestos";
import { exportPresupuestoPdf } from "../utils/presupuestoPdf";

function toARS(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createEmptyItem() {
  return { desc: "", cant: 1, precio: 0 };
}

function buildNumero() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return `SM-${stamp}-${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

function draftToForm(draft) {
  return {
    numero: buildNumero(),
    fecha: new Date().toISOString().slice(0, 10),
    cliente: draft?.cliente || "",
    empresa: draft?.empresa || "",
    telefono: draft?.telefono || "",
    email: draft?.email || "",
    proyecto: draft?.proyecto || "",
    detalle: draft?.detalle || "",
    entrega: draft?.entrega || "",
    observaciones: draft?.observaciones || "",
    formaPago: "",
    condiciones: "Precios sujetos a confirmacion de materiales y medidas finales.",
    validezDias: 7,
    items: [
      {
        desc: draft?.itemsTexto || draft?.detalle || draft?.proyecto || "",
        cant: 1,
        precio: 0,
      },
    ],
  };
}

export default function PresupuestosGenerar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedDrafts, setSavedDrafts] = useState(() => listPresupuestoDrafts());
  const [selectedDraftId, setSelectedDraftId] = useState(() => searchParams.get("draft") || "");
  const [form, setForm] = useState(() => draftToForm(null));
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setSavedDrafts(listPresupuestoDrafts());
  }, []);

  useEffect(() => {
    const draftId = searchParams.get("draft");
    if (!draftId) return;
    const draft = getPresupuestoDraft(draftId);
    if (!draft) return;
    setSelectedDraftId(draftId);
    setForm(draftToForm(draft));
  }, [searchParams]);

  const total = useMemo(() => {
    return form.items.reduce(
      (acc, item) => acc + Number(item.cant || 0) * Number(item.precio || 0),
      0
    );
  }, [form.items]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, patch) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  }

  function deleteItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  function loadDraft(id) {
    const draft = getPresupuestoDraft(id);
    if (!draft) return;
    setSelectedDraftId(id);
    setSearchParams({ draft: id });
    setForm(draftToForm(draft));
  }

  async function onGeneratePdf() {
    if (!form.cliente && !form.empresa) {
      Swal.fire("Falta cliente", "Cargá al menos el nombre del cliente o empresa.", "warning");
      return;
    }

    if (!form.items.some((item) => String(item.desc || "").trim())) {
      Swal.fire("Faltan items", "Agregá al menos un concepto para el presupuesto.", "warning");
      return;
    }

    setIsGenerating(true);
    try {
      await exportPresupuestoPdf(form);
      Swal.fire("PDF generado", "El presupuesto oficial ya se descargó en PDF.", "success");
    } catch (error) {
      Swal.fire("No se pudo generar", error?.message || "Probá de nuevo.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  const pageStyle = {
    maxWidth: 1240,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
  const heroStyle = {
    padding: "24px 26px",
    borderRadius: 28,
    border: "1px solid rgba(70,55,38,0.1)",
    background:
      "radial-gradient(circle at top right, rgba(214,191,160,0.22), transparent 24%), linear-gradient(135deg,#fff8ef,#f4ece1)",
    boxShadow: "0 18px 42px rgba(70,55,38,0.08)",
  };
  const panelStyle = {
    padding: 20,
    borderRadius: 24,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(70,55,38,0.09)",
    boxShadow: "0 14px 32px rgba(69,54,38,0.08)",
  };
  const grid2 = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 };
  const inputStyle = {
    width: "100%",
    minHeight: 46,
    padding: "0 14px",
    borderRadius: 14,
    border: "1px solid rgba(70,55,38,0.12)",
    background: "#fbfaf8",
    outline: "none",
  };
  const textAreaStyle = {
    ...inputStyle,
    minHeight: 110,
    padding: "12px 14px",
    resize: "vertical",
  };

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7457" }}>
          Presupuestos
        </div>
        <h1 style={{ margin: "8px 0 10px", fontSize: 36, lineHeight: 1, fontWeight: 900, color: "#28231d" }}>
          Generar presupuesto oficial
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: "#6f655a" }}>
          Armá el documento formal de Sur Maderas con tus datos, conceptos, importes y condiciones comerciales.
        </p>
      </section>

      <section style={{ ...panelStyle, display: "grid", gap: 18 }}>
        <div style={{ ...grid2, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Cargar datos guardados
            </label>
            <select
              style={inputStyle}
              value={selectedDraftId}
              onChange={(e) => loadDraft(e.target.value)}
            >
              <option value="">Seleccionar carga pendiente</option>
              {savedDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.cliente || draft.empresa || "Sin nombre"} · {draft.proyecto || "Sin proyecto"}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
            <div style={{ color: "#6b6155", fontSize: 14 }}>
              Total actual: <strong style={{ color: "#2e241b" }}>$ {toARS(total)}</strong>
            </div>
            <button
              type="button"
              onClick={onGeneratePdf}
              disabled={isGenerating}
              style={{
                minHeight: 46,
                padding: "0 18px",
                border: 0,
                borderRadius: 14,
                background: "linear-gradient(135deg,#372c22,#554231)",
                color: "#fffdf8",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {isGenerating ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>

        <div style={grid2}>
          {[
            ["Numero", "numero"],
            ["Fecha", "fecha"],
            ["Cliente", "cliente"],
            ["Empresa", "empresa"],
            ["Telefono", "telefono"],
            ["Email", "email"],
          ].map(([label, key]) => (
            <div key={key}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
                {label}
              </label>
              <input
                style={inputStyle}
                type={key === "fecha" ? "date" : "text"}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div style={grid2}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Proyecto / trabajo
            </label>
            <input style={inputStyle} value={form.proyecto} onChange={(e) => setField("proyecto", e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Entrega estimada
            </label>
            <input style={inputStyle} value={form.entrega} onChange={(e) => setField("entrega", e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
            Detalle general
          </label>
          <textarea style={textAreaStyle} value={form.detalle} onChange={(e) => setField("detalle", e.target.value)} />
        </div>

        <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(70,55,38,0.08)", fontWeight: 900 }}>
            Conceptos presupuestados
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f0e7", color: "#5f574d", fontSize: 12, textTransform: "uppercase" }}>
                  <th style={{ padding: 14, textAlign: "left" }}>Descripcion</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Cant.</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Precio</th>
                  <th style={{ padding: 14, textAlign: "left" }}>Subtotal</th>
                  <th style={{ padding: 14 }} />
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => {
                  const subtotal = Number(item.cant || 0) * Number(item.precio || 0);
                  return (
                    <tr key={index} style={{ borderTop: "1px solid rgba(70,55,38,0.08)" }}>
                      <td style={{ padding: 14 }}>
                        <input
                          style={inputStyle}
                          value={item.desc}
                          onChange={(e) => setItem(index, { desc: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: 14, width: 120 }}>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          value={item.cant}
                          onChange={(e) => setItem(index, { cant: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: 14, width: 180 }}>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          value={item.precio}
                          onChange={(e) => setItem(index, { precio: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: 14, whiteSpace: "nowrap", fontWeight: 800 }}>$ {toARS(subtotal)}</td>
                      <td style={{ padding: 14, width: 80 }}>
                        <button
                          type="button"
                          onClick={() => deleteItem(index)}
                          disabled={form.items.length === 1}
                          style={{
                            minHeight: 42,
                            padding: "0 14px",
                            borderRadius: 12,
                            border: "1px solid rgba(181,84,84,0.18)",
                            background: "#fff3f3",
                            color: "#8b2d2d",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 18 }}>
            <button
              type="button"
              onClick={addItem}
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid rgba(70,55,38,0.12)",
                background: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Agregar item
            </button>
          </div>
        </div>

        <div style={grid2}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Validez (dias)
            </label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={form.validezDias}
              onChange={(e) => setField("validezDias", e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Forma de pago
            </label>
            <input style={inputStyle} value={form.formaPago} onChange={(e) => setField("formaPago", e.target.value)} />
          </div>
        </div>

        <div style={grid2}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Observaciones
            </label>
            <textarea
              style={textAreaStyle}
              value={form.observaciones}
              onChange={(e) => setField("observaciones", e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Condiciones comerciales
            </label>
            <textarea
              style={textAreaStyle}
              value={form.condiciones}
              onChange={(e) => setField("condiciones", e.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
