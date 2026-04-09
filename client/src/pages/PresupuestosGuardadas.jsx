import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deletePresupuestoDraft,
  listPresupuestoDrafts,
} from "../services/presupuestos";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-AR");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-AR");
}

export default function PresupuestosGuardadas() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState(() => listPresupuestoDrafts());

  const pendingCount = useMemo(() => drafts.length, [drafts]);

  function refreshDrafts() {
    setDrafts(listPresupuestoDrafts());
  }

  function onDeleteDraft(id) {
    deletePresupuestoDraft(id);
    refreshDrafts();
  }

  const pageStyle = {
    maxWidth: 1240,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
  const heroStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0,1.2fr) minmax(260px,.8fr)",
    gap: 18,
    padding: "24px 26px",
    borderRadius: 28,
    border: "1px solid rgba(70,55,38,0.1)",
    background:
      "radial-gradient(circle at top right, rgba(196,205,181,0.18), transparent 24%), linear-gradient(135deg,#fff8ef,#f1f4ea)",
    boxShadow: "0 18px 42px rgba(70,55,38,0.08)",
  };
  const cardStyle = {
    padding: 20,
    borderRadius: 24,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(70,55,38,0.09)",
    boxShadow: "0 14px 32px rgba(69,54,38,0.08)",
  };

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7e765c",
            }}
          >
            Presupuestos
          </div>
          <h1
            style={{
              margin: "8px 0 10px",
              fontSize: 36,
              lineHeight: 1,
              fontWeight: 900,
              color: "#28231d",
            }}
          >
            Guardadas
          </h1>
          <p style={{ margin: 0, maxWidth: 700, color: "#6f655a" }}>
            Revisá las cargas pendientes, abrí una en el generador o eliminá las que ya no necesitás.
          </p>
        </div>

        <div style={{ ...cardStyle, padding: 18, display: "grid", gap: 8 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7b7166",
            }}
          >
            Guardadas
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#2a241d", lineHeight: 1 }}>
            {pendingCount}
          </div>
          <div style={{ color: "#6b6155", fontSize: 14 }}>
            cargas disponibles para retomar en la oficina
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle, display: "grid", gap: 14 }}>
        {drafts.length === 0 ? (
          <div style={{ color: "#6b6155", fontSize: 15 }}>Todavía no hay cargas guardadas.</div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                padding: 18,
                borderRadius: 18,
                background: "#fbf7f1",
                border: "1px solid rgba(70,55,38,0.08)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, color: "#2a241d", fontSize: 18 }}>
                    {draft.cliente || "Sin nombre"}
                  </div>
                  <div style={{ color: "#6b6155", fontSize: 14 }}>
                    {draft.materiales || "Sin materiales"}
                  </div>
                </div>
                <div style={{ color: "#8a7d70", fontSize: 12 }}>
                  Actualizado: {formatDateTime(draft.updatedAt)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "#6b6155", fontSize: 13 }}>
                <span>Fecha: {formatDate(draft.fecha)}</span>
                <span>Telefono: {draft.telefono || "-"}</span>
              </div>

              <div style={{ color: "#5f574d", fontSize: 14 }}>
                {draft.detalle || "Sin detalle cargado"}
              </div>

              {draft.imagen?.dataUrl ? (
                <img
                  src={draft.imagen.dataUrl}
                  alt="Adjunto del pedido"
                  style={{ width: 180, maxWidth: "100%", borderRadius: 14, border: "1px solid rgba(70,55,38,0.08)" }}
                />
              ) : null}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => navigate(`/presupuestos/generar?draft=${draft.id}`)}
                  style={{
                    minHeight: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(70,55,38,0.12)",
                    background: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Abrir en generador
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/presupuestos/cargar")}
                  style={{
                    minHeight: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(70,55,38,0.12)",
                    background: "#fffaf2",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Ir a cargar
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDraft(draft.id)}
                  style={{
                    minHeight: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(181,84,84,0.18)",
                    background: "#fff3f3",
                    color: "#8b2d2d",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
