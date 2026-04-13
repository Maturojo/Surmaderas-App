import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const BAR_LENGTH_METERS = 3.05;
const MM_TO_SCENE = 0.0015;

const INITIAL_PROFILES = [
  {
    id: "box-20-negro",
    nombre: "Varilla Box 20 negro",
    precioMetro: 14800,
    frenteMm: 20,
    profundidadMm: 22,
    color: "#2c2f36",
  },
  {
    id: "box-25-natural",
    nombre: "Varilla Box 25 natural",
    precioMetro: 17200,
    frenteMm: 25,
    profundidadMm: 24,
    color: "#9d9c96",
  },
  {
    id: "madera-roble",
    nombre: "Varilla simil madera roble",
    precioMetro: 19600,
    frenteMm: 30,
    profundidadMm: 24,
    color: "#8b5e3c",
  },
];

const INITIAL_FORM = {
  profileId: INITIAL_PROFILES[0].id,
  anchoMm: 700,
  altoMm: 1000,
  cantidad: 1,
  orientacion: "vertical",
  vidrio: true,
  fondo: true,
  cableColgante: true,
  precioVidrioM2: 28500,
  precioFondoM2: 12800,
  precioCableMetro: 3200,
  armadoModo: "automatico",
  armadoManual: 0,
  observaciones: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function clampPositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function getArmadoSuggestion(anchoMm, altoMm) {
  const areaM2 = (clampPositiveNumber(anchoMm) * clampPositiveNumber(altoMm)) / 1000000;

  if (areaM2 <= 0.5) {
    return { etiqueta: "Chico", precio: 18000 };
  }

  if (areaM2 <= 1.2) {
    return { etiqueta: "Mediano", precio: 26000 };
  }

  return { etiqueta: "Grande", precio: 34500 };
}

function NumberField({ label, value, onChange, min = 0, step = 1, suffix, helper }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={onChange}
          style={{
            width: "100%",
            minHeight: 48,
            padding: suffix ? "0 64px 0 14px" : "0 14px",
            borderRadius: 14,
            border: "1px solid rgba(73, 58, 38, 0.14)",
            background: "#fcfbf8",
            outline: "none",
          }}
        />
        {suffix ? (
          <span
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              fontWeight: 800,
              color: "#776a5d",
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {helper ? <span style={{ fontSize: 12, color: "#7a7067" }}>{helper}</span> : null}
    </label>
  );
}

function ToggleCard({ checked, onChange, title, description }) {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        padding: 16,
        borderRadius: 18,
        border: checked ? "1px solid rgba(61, 49, 39, 0.24)" : "1px solid rgba(73, 58, 38, 0.1)",
        background: checked ? "linear-gradient(135deg, rgba(240, 231, 217, 0.9), rgba(255,255,255,0.96))" : "rgba(255,255,255,0.84)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontWeight: 900, color: "#2d241c" }}>{title}</span>
        <input type="checkbox" checked={checked} onChange={onChange} />
      </div>
      <span style={{ fontSize: 13, color: "#6f665d" }}>{description}</span>
    </label>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderTop: "1px solid rgba(73, 58, 38, 0.08)",
      }}
    >
      <span style={{ color: "#685e55", fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: strong ? 900 : 800, color: "#2f251d", fontSize: strong ? 20 : 15 }}>{value}</span>
    </div>
  );
}

function CableCylinder({ start, end, radius, color }) {
  const { position, quaternion, length } = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(endVector, startVector);
    const safeLength = Math.max(direction.length(), 0.0001);
    const midpoint = new THREE.Vector3().addVectors(startVector, endVector).multiplyScalar(0.5);
    const normalizedDirection = direction.clone().normalize();
    const rotation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normalizedDirection
    );

    return {
      position: midpoint.toArray(),
      quaternion: rotation,
      length: safeLength,
    };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 18]} />
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
    </mesh>
  );
}

function FramePreview3D({
  anchoMm,
  altoMm,
  faceMm,
  depthMm,
  color,
  orientacion,
  vidrio,
  fondo,
  cableColgante,
}) {
  const outerWidth = clampPositiveNumber(anchoMm, 700) * MM_TO_SCENE;
  const outerHeight = clampPositiveNumber(altoMm, 1000) * MM_TO_SCENE;
  const face = Math.max(clampPositiveNumber(faceMm, 20) * MM_TO_SCENE, 0.018);
  const depth = Math.max(clampPositiveNumber(depthMm, 20) * MM_TO_SCENE, 0.028);
  const innerWidth = Math.max(outerWidth - face * 2, face * 0.75);
  const innerHeight = Math.max(outerHeight - face * 2, face * 0.75);
  const soporteRadius = 0.014;
  const cableRadius = 0.0035;
  const backZ = -depth * 0.48;
  const supportY = outerHeight * 0.1;
  const supportX = outerWidth / 2 - face * 0.7;
  const cableDrop = Math.min(outerHeight * 0.18, 0.14);
  const leftSupport = [-supportX, supportY, backZ];
  const rightSupport = [supportX, supportY, backZ];
  const cablePeak = [0, supportY + cableDrop, backZ];
  const frameRotation = orientacion === "horizontal" ? [0, 0, Math.PI / 2] : [0, 0, 0];

  return (
    <>
      <color attach="background" args={["#f3ede4"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 3, 4]} intensity={1.5} castShadow />
      <directionalLight position={[-2, -1, 3]} intensity={0.5} />

      <group rotation={frameRotation}>
        <mesh position={[0, outerHeight / 2 - face / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[outerWidth, face, depth]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, -outerHeight / 2 + face / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[outerWidth, face, depth]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[-outerWidth / 2 + face / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[face, outerHeight - face * 2, depth]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[outerWidth / 2 - face / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[face, outerHeight - face * 2, depth]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.5} />
        </mesh>

        {vidrio ? (
          <mesh position={[0, 0, 0.002]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.005]} />
            <meshPhysicalMaterial color="#b7d8ec" transmission={0.72} roughness={0.08} thickness={0.03} transparent opacity={0.5} />
          </mesh>
        ) : null}

        {fondo ? (
          <mesh position={[0, 0, -depth * 0.28]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.01]} />
            <meshStandardMaterial color="#d8cbb7" roughness={0.95} />
          </mesh>
        ) : null}

        {cableColgante ? (
          <>
            <mesh position={leftSupport}>
              <cylinderGeometry args={[soporteRadius, soporteRadius, 0.016, 24]} />
              <meshStandardMaterial color="#b7bcc6" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={rightSupport}>
              <cylinderGeometry args={[soporteRadius, soporteRadius, 0.016, 24]} />
              <meshStandardMaterial color="#b7bcc6" metalness={0.9} roughness={0.2} />
            </mesh>

            <CableCylinder start={leftSupport} end={cablePeak} radius={cableRadius} color="#9ea6b2" />
            <CableCylinder start={cablePeak} end={rightSupport} radius={cableRadius} color="#9ea6b2" />
          </>
        ) : null}
      </group>

      {cableColgante ? (
        <group position={[0, 0, -0.22]}>
          <mesh position={[-0.06, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.02, 24]} />
            <meshStandardMaterial color="#8e96a3" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.02, 24]} />
            <meshStandardMaterial color="#8e96a3" metalness={0.9} roughness={0.25} />
          </mesh>
          <CableCylinder start={[-0.06, 0, 0]} end={[0, 0.04, 0]} radius={0.003} color="#8e96a3" />
          <CableCylinder start={[0, 0.04, 0]} end={[0.06, 0, 0]} radius={0.003} color="#8e96a3" />
        </group>
      ) : null}

      <mesh position={[0, 0, -0.12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 3.2]} />
        <shadowMaterial opacity={0.18} />
      </mesh>

      <OrbitControls enablePan={false} minDistance={1.2} maxDistance={5.5} />
    </>
  );
}

export default function CotizadorMarcos() {
  const [form, setForm] = useState(INITIAL_FORM);

  const selectedProfile = useMemo(
    () => INITIAL_PROFILES.find((profile) => profile.id === form.profileId) || INITIAL_PROFILES[0],
    [form.profileId]
  );

  const quote = useMemo(() => {
    const anchoMm = clampPositiveNumber(form.anchoMm, 0);
    const altoMm = clampPositiveNumber(form.altoMm, 0);
    const cantidad = Math.max(clampPositiveNumber(form.cantidad, 1), 1);
    const anchoM = anchoMm / 1000;
    const altoM = altoMm / 1000;
    const areaM2 = anchoM * altoM;

    const metrosMarcoUnitarios = (2 * (anchoMm + altoMm)) / 1000;
    const metrosMarcoTotales = metrosMarcoUnitarios * cantidad;
    const varillasNecesarias = Math.ceil(metrosMarcoTotales / BAR_LENGTH_METERS);
    const metrosFacturados = varillasNecesarias * BAR_LENGTH_METERS;
    const subtotalVarilla = metrosFacturados * clampPositiveNumber(selectedProfile.precioMetro, 0);

    const caidaCableM = Math.min(altoM * 0.18, 0.18);
    const cableLadoM = Math.sqrt(Math.pow(anchoM * 0.42, 2) + Math.pow(caidaCableM, 2));
    const metrosCableUnitarios = form.cableColgante ? cableLadoM * 2 : 0;
    const metrosCableTotales = metrosCableUnitarios * cantidad;
    const subtotalCable = metrosCableTotales * clampPositiveNumber(form.precioCableMetro, 0);

    const subtotalVidrio = form.vidrio ? areaM2 * cantidad * clampPositiveNumber(form.precioVidrioM2, 0) : 0;
    const subtotalFondo = form.fondo ? areaM2 * cantidad * clampPositiveNumber(form.precioFondoM2, 0) : 0;

    const armadoSugerido = getArmadoSuggestion(anchoMm, altoMm);
    const subtotalArmado =
      form.armadoModo === "manual"
        ? clampPositiveNumber(form.armadoManual, 0)
        : armadoSugerido.precio * cantidad;

    const total =
      subtotalVarilla +
      subtotalCable +
      subtotalVidrio +
      subtotalFondo +
      subtotalArmado;

    return {
      anchoM,
      altoM,
      areaM2,
      metrosMarcoUnitarios,
      metrosMarcoTotales,
      varillasNecesarias,
      metrosFacturados,
      subtotalVarilla,
      metrosCableUnitarios,
      metrosCableTotales,
      subtotalCable,
      subtotalVidrio,
      subtotalFondo,
      armadoSugerido,
      subtotalArmado,
      total,
    };
  }, [form, selectedProfile]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const pageStyle = {
    maxWidth: 1380,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };
  const panelStyle = {
    padding: 22,
    borderRadius: 28,
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(73, 58, 38, 0.1)",
    boxShadow: "0 18px 42px rgba(55, 43, 29, 0.08)",
    backdropFilter: "blur(10px)",
  };

  return (
    <div style={pageStyle}>
      <section
        style={{
          ...panelStyle,
          background:
            "radial-gradient(circle at top right, rgba(194, 174, 142, 0.2), transparent 24%), linear-gradient(135deg, #fff8ef 0%, #efe7db 100%)",
        }}
      >
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7457" }}>
              Marcos
            </div>
            <h1 style={{ margin: "8px 0 10px", fontSize: 38, lineHeight: 1, fontWeight: 900, color: "#28231d" }}>
              Cotizador de marcos
            </h1>
            <p style={{ margin: 0, maxWidth: 760, color: "#6f655a", fontSize: 15 }}>
              Calcula varillas de 3.05 m, vidrio, fondo, cables y armado según medida. Esta base ya quedó lista para
              que después carguemos tus perfiles reales y afinemos el render 3D según cada tipo de varilla.
            </p>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 22,
              background: "rgba(45, 36, 28, 0.92)",
              color: "#fffaf3",
              display: "grid",
              gap: 8,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>
              Resumen rapido
            </div>
            <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 900 }}>{formatCurrency(quote.total)}</div>
            <div style={{ fontSize: 14, opacity: 0.84 }}>
              {quote.varillasNecesarias} varilla{quote.varillasNecesarias === 1 ? "" : "s"} de {BAR_LENGTH_METERS.toFixed(2)} m
            </div>
            <div style={{ fontSize: 14, opacity: 0.84 }}>
              {formatNumber(quote.areaM2 * Math.max(clampPositiveNumber(form.cantidad, 1), 1), 2)} m2 totales a cubrir
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 0.95fr) minmax(380px, 1.05fr)" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <article style={panelStyle}>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#2d241c" }}>Configuracion del marco</div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Tipo de varilla
                  </span>
                  <select
                    value={form.profileId}
                    onChange={(e) => setField("profileId", e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "0 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(73, 58, 38, 0.14)",
                      background: "#fcfbf8",
                    }}
                  >
                    {INITIAL_PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <NumberField
                  label="Cantidad"
                  value={form.cantidad}
                  onChange={(e) => setField("cantidad", e.target.value)}
                  min={1}
                  step={1}
                  suffix="u"
                />

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Orientacion
                  </span>
                  <select
                    value={form.orientacion}
                    onChange={(e) => setField("orientacion", e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "0 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(73, 58, 38, 0.14)",
                      background: "#fcfbf8",
                    }}
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </label>

                <NumberField
                  label="Ancho"
                  value={form.anchoMm}
                  onChange={(e) => setField("anchoMm", e.target.value)}
                  min={50}
                  step={1}
                  suffix="mm"
                />

                <NumberField
                  label="Alto"
                  value={form.altoMm}
                  onChange={(e) => setField("altoMm", e.target.value)}
                  min={50}
                  step={1}
                  suffix="mm"
                />
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                <ToggleCard
                  checked={form.vidrio}
                  onChange={(e) => setField("vidrio", e.target.checked)}
                  title="Con vidrio"
                  description="Suma el costo por m2 del vidrio interior."
                />
                <ToggleCard
                  checked={form.fondo}
                  onChange={(e) => setField("fondo", e.target.checked)}
                  title="Con fondo"
                  description="Agrega el respaldo interior del marco."
                />
                <ToggleCard
                  checked={form.cableColgante}
                  onChange={(e) => setField("cableColgante", e.target.checked)}
                  title="Cable para colgar"
                  description="Agrega dos fijaciones laterales y el cable trasero de colgado."
                />
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                <NumberField
                  label="Precio vidrio"
                  value={form.precioVidrioM2}
                  onChange={(e) => setField("precioVidrioM2", e.target.value)}
                  min={0}
                  step={100}
                  suffix="/m2"
                />
                <NumberField
                  label="Precio fondo"
                  value={form.precioFondoM2}
                  onChange={(e) => setField("precioFondoM2", e.target.value)}
                  min={0}
                  step={100}
                  suffix="/m2"
                />
              </div>
            </div>
          </article>

          <article style={panelStyle}>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#2d241c" }}>Colgado y armado</div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                <NumberField
                  label="Precio cable"
                  value={form.precioCableMetro}
                  onChange={(e) => setField("precioCableMetro", e.target.value)}
                  min={0}
                  step={100}
                  suffix="/m"
                  helper={
                    form.cableColgante
                      ? "Se calcula automaticamente segun el ancho del cuadro y la caida del cable."
                      : "Activa el cable para incluirlo en el total."
                  }
                />
                <div
                  style={{
                    display: "grid",
                    alignContent: "center",
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(247, 243, 236, 0.95)",
                    border: "1px solid rgba(73, 58, 38, 0.1)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7d7267" }}>
                    Cable estimado por cuadro
                  </div>
                  <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "#2d241c" }}>
                    {formatNumber(quote.metrosCableUnitarios)} m
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#6f665d" }}>
                    Incluye dos laterales y una panza central para colgado.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Armado
                  </span>
                  <select
                    value={form.armadoModo}
                    onChange={(e) => setField("armadoModo", e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "0 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(73, 58, 38, 0.14)",
                      background: "#fcfbf8",
                    }}
                  >
                    <option value="automatico">Predeterminado por tamano</option>
                    <option value="manual">Precio manual</option>
                  </select>
                </label>

                <NumberField
                  label="Armado manual"
                  value={form.armadoManual}
                  onChange={(e) => setField("armadoManual", e.target.value)}
                  min={0}
                  step={100}
                  suffix="$"
                  helper={
                    form.armadoModo === "automatico"
                      ? `Se esta usando el armado ${quote.armadoSugerido.etiqueta.toLowerCase()} automaticamente.`
                      : "Este valor reemplaza el armado automatico."
                  }
                />
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Observaciones
                </span>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setField("observaciones", e.target.value)}
                  placeholder="Ej: marco para comedor, vidrio float, fondo MDF crudo, cable cada 20 cm..."
                  style={{
                    width: "100%",
                    minHeight: 110,
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: "1px solid rgba(73, 58, 38, 0.14)",
                    background: "#fcfbf8",
                    resize: "vertical",
                  }}
                />
              </label>
            </div>
          </article>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <article style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 0", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7457" }}>
                Vista previa
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#2d241c" }}>Render 3D del marco</div>
              <div style={{ fontSize: 14, color: "#6f665d" }}>
                Esta vista ya responde a medida, orientacion, vidrio, fondo y al cable trasero de colgado con sus fijaciones laterales.
              </div>
            </div>

            <div style={{ height: 470, marginTop: 12 }}>
              <Canvas camera={{ position: [0, 0, 2.2], fov: 40 }}>
                <FramePreview3D
                  anchoMm={form.anchoMm}
                  altoMm={form.altoMm}
                  faceMm={selectedProfile.frenteMm}
                  depthMm={selectedProfile.profundidadMm}
                  color={selectedProfile.color}
                  orientacion={form.orientacion}
                  vidrio={form.vidrio}
                  fondo={form.fondo}
                  cableColgante={form.cableColgante}
                />
              </Canvas>
            </div>
          </article>

          <article style={panelStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#2d241c" }}>Resumen del calculo</div>
              <div style={{ fontSize: 14, color: "#6f665d" }}>
                El subtotal de varilla toma barras completas de 3.05 m para que tengas una compra realista.
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <SummaryRow label="Varilla seleccionada" value={selectedProfile.nombre} />
              <SummaryRow label="Orientacion visual" value={form.orientacion === "horizontal" ? "Horizontal" : "Vertical"} />
              <SummaryRow label="Precio por metro" value={formatCurrency(selectedProfile.precioMetro)} />
              <SummaryRow label="Perimetro por marco" value={`${formatNumber(quote.metrosMarcoUnitarios)} m`} />
              <SummaryRow label="Metros necesarios" value={`${formatNumber(quote.metrosMarcoTotales)} m`} />
              <SummaryRow label="Varillas de 3.05 m" value={`${quote.varillasNecesarias}`} />
              <SummaryRow label="Metros facturados" value={`${formatNumber(quote.metrosFacturados)} m`} />
              <SummaryRow label="Subtotal varilla" value={formatCurrency(quote.subtotalVarilla)} />
              <SummaryRow label="Subtotal vidrio" value={formatCurrency(quote.subtotalVidrio)} />
              <SummaryRow label="Subtotal fondo" value={formatCurrency(quote.subtotalFondo)} />
              <SummaryRow
                label="Cable colgante"
                value={`${formatNumber(quote.metrosCableTotales)} m · ${formatCurrency(quote.subtotalCable)}`}
              />
              <SummaryRow
                label={`Armado ${form.armadoModo === "automatico" ? `(${quote.armadoSugerido.etiqueta})` : "(manual)"}`}
                value={formatCurrency(quote.subtotalArmado)}
              />
              <SummaryRow label="Total estimado" value={formatCurrency(quote.total)} strong />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
