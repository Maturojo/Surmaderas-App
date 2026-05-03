import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useEffect } from "react";
import CameraImageUploadField from "../features/presupuestos/components/CameraImageUploadField";
import { listPresupuestoDrafts, savePresupuestoDraft } from "../services/presupuestos";

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTelefono(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);

  if (digits.startsWith("11")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isTelefonoValido(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^\d{10}$/.test(digits);
}

function emptyForm() {
  return {
    cliente: "",
    fecha: formatDateYYYYMMDD(new Date()),
    telefono: "",
    detalle: "",
    materiales: "",
    imagen: null,
  };
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

export default function PresupuestosEnviar() {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(() => emptyForm());
  const [drafts, setDrafts] = useState(() => listPresupuestoDrafts());

  const pendingCount = useMemo(() => drafts.length, [drafts]);
  const telefonoValido = isTelefonoValido(form.telefono);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function refreshDrafts() {
    setDrafts(listPresupuestoDrafts());
  }

  function onSaveDraft() {
    if (!form.cliente.trim()) {
      Swal.fire("Falta cliente", "Cargá el nombre del cliente.", "warning");
      return;
    }

    if (!form.telefono.trim()) {
      Swal.fire("Falta telefono", "Cargá el teléfono del cliente.", "warning");
      return;
    }

    if (!telefonoValido) {
      Swal.fire("Telefono invalido", "Usá un formato válido, por ejemplo 223-595-4165.", "warning");
      return;
    }

    if (!form.detalle.trim()) {
      Swal.fire("Falta detalle", "Cargá el detalle del pedido.", "warning");
      return;
    }

    if (!form.materiales.trim()) {
      Swal.fire("Faltan materiales", "Indicá el material o materiales solicitados.", "warning");
      return;
    }

    savePresupuestoDraft(form);
    setForm(emptyForm());
    refreshDrafts();
    Swal.fire(
      "Carga guardada",
      "Quedó lista para verla después en Guardadas y retomarla en el generador.",
      "success"
    );
  }

  const pageStyle = {
    maxWidth: 1240,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
  const heroStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.2fr) minmax(260px,.8fr)",
    gap: 18,
    padding: isMobile ? 18 : "24px 26px",
    borderRadius: isMobile ? 18 : 28,
    border: "1px solid rgba(70,55,38,0.1)",
    background:
      "radial-gradient(circle at top right, rgba(183,213,188,0.18), transparent 24%), linear-gradient(135deg,#fff8ef,#edf5ef)",
    boxShadow: "0 18px 42px rgba(70,55,38,0.08)",
  };
  const panelStyle = {
    padding: isMobile ? 16 : 20,
    borderRadius: isMobile ? 18 : 24,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(70,55,38,0.09)",
    boxShadow: "0 14px 32px rgba(69,54,38,0.08)",
  };
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
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7e765c" }}>
            Presupuestos
          </div>
          <h1 style={{ margin: "8px 0 10px", fontSize: isMobile ? 30 : 36, lineHeight: 1, fontWeight: 900, color: "#28231d" }}>
            Cargar datos
          </h1>
          <p style={{ margin: 0, maxWidth: 700, color: "#6f655a" }}>
            Dejá cargados los datos del pedido con teléfono correcto, materiales y foto para retomarlo después desde la oficina.
          </p>
        </div>

        <div style={{ ...panelStyle, padding: 18, display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b7166" }}>
            Pendientes
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#2a241d", lineHeight: 1 }}>{pendingCount}</div>
          <div style={{ color: "#6b6155", fontSize: 14 }}>cargas disponibles para revisar en la sección Guardadas</div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#2a241d" }}>Nueva carga</div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
                Nombre del cliente
              </label>
              <input style={inputStyle} value={form.cliente} onChange={(e) => setField("cliente", e.target.value)} />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
                Fecha del dia
              </label>
              <input style={inputStyle} type="date" value={form.fecha} onChange={(e) => setField("fecha", e.target.value)} />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
                Telefono
              </label>
              <input
                style={{
                  ...inputStyle,
                  ...(form.telefono && !telefonoValido ? { border: "1px solid #c95c5c", background: "#fff6f6" } : null),
                }}
                inputMode="numeric"
                placeholder="223-595-4165"
                value={form.telefono}
                onChange={(e) => setField("telefono", formatTelefono(e.target.value))}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: form.telefono && !telefonoValido ? "#b14040" : "#7b7166" }}>
                {form.telefono && !telefonoValido ? "El teléfono debe tener 10 dígitos." : "Formato sugerido: 223-595-4165"}
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
                Material o materiales
              </label>
              <input
                style={inputStyle}
                value={form.materiales}
                onChange={(e) => setField("materiales", e.target.value)}
                placeholder="Ej: melamina blanca 18 mm, pino, herrajes..."
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Detalles del pedido
            </label>
            <textarea
              style={textAreaStyle}
              value={form.detalle}
              onChange={(e) => setField("detalle", e.target.value)}
              placeholder="Medidas, cantidad, terminaciones, colocación, tiempos o cualquier aclaración del pedido."
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#5f574d", fontWeight: 700 }}>
              Foto o adjunto
            </label>
            <CameraImageUploadField
              label="Tomar foto o adjuntar imagen"
              value={form.imagen}
              onChange={(value) => setField("imagen", value)}
              capture="environment"
              maxMB={2.5}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onSaveDraft}
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
              Guardar carga
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
