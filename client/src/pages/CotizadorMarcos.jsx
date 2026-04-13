import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const BAR_LENGTH_METERS = 3.05;
const HALF_BAR_LENGTH_METERS = BAR_LENGTH_METERS / 2;
const MM_TO_SCENE = 0.0015;
const PASPARTU_PRICE_M2 = 19640;
const GLASS_PRICE_M2 = 33582;

const INITIAL_PROFILES = [
  {
    id: "chata-4cm-pino",
    nombre: "Chata 4 cm pino",
    precioMetro: 19600,
    frenteMm: 40,
    profundidadMm: 18,
    color: "#c59257",
    shape: "pine-chata",
    veta: "#e2bf86",
  },
  {
    id: "box-20-negro",
    nombre: "Varilla Box 20 negro",
    precioMetro: 14800,
    frenteMm: 20,
    profundidadMm: 22,
    color: "#2c2f36",
    shape: "box",
  },
  {
    id: "box-25-natural",
    nombre: "Varilla Box 25 natural",
    precioMetro: 17200,
    frenteMm: 25,
    profundidadMm: 24,
    color: "#9d9c96",
    shape: "box",
  },
  {
    id: "madera-roble",
    nombre: "Varilla simil madera roble",
    precioMetro: 19600,
    frenteMm: 30,
    profundidadMm: 24,
    color: "#8b5e3c",
    shape: "box",
  },
];

const FONDO_OPTIONS = [
  { id: "sin-fondo", nombre: "Sin fondo", precioM2: 0, color: "#000000" },
  { id: "fibrofacil", nombre: "Fibro facil", precioM2: 9800, color: "#b69777" },
  { id: "fibroplus-blanco", nombre: "Fibro plus blanco", precioM2: 13200, color: "#e9e5dc" },
  { id: "fibroplus-negro", nombre: "Fibro plus negro", precioM2: 13800, color: "#2a2d33" },
];

const PINTADO_OPTIONS = [
  { id: "sin-pintar", nombre: "Sin pintar", color: null, extra: 0 },
  { id: "negro-mate", nombre: "Negro mate", color: "#23252b", extra: 9500 },
  { id: "blanco-mate", nombre: "Blanco mate", color: "#f2eee6", extra: 9200 },
  { id: "roble-claro", nombre: "Roble claro", color: "#b68458", extra: 11800 },
  { id: "nogal", nombre: "Nogal", color: "#6f4c34", extra: 11800 },
  { id: "dorado", nombre: "Dorado", color: "#c7a459", extra: 14200 },
];

const INITIAL_FORM = {
  profileId: INITIAL_PROFILES[0].id,
  anchoMm: 700,
  altoMm: 1000,
  cantidad: 1,
  orientacion: "vertical",
  tipoMedida: "exterior",
  vidrio: "si",
  fondoId: "fibrofacil",
  paspartuMm: 0,
  pintadoId: "sin-pintar",
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

function normalizeDimensionsByOrientation(firstValue, secondValue, orientacion) {
  const first = clampPositiveNumber(firstValue, 0);
  const second = clampPositiveNumber(secondValue, 0);
  const shortSide = Math.min(first, second);
  const longSide = Math.max(first, second);

  if (orientacion === "horizontal") {
    return { ancho: longSide, alto: shortSide };
  }

  return { ancho: shortSide, alto: longSide };
}

function reorderFormDimensions(form, orientacion) {
  const normalized = normalizeDimensionsByOrientation(form.anchoMm, form.altoMm, orientacion);

  return {
    ...form,
    orientacion,
    anchoMm: normalized.ancho,
    altoMm: normalized.alto,
  };
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

function calculateChargedBars(requiredMeters) {
  const safeMeters = clampPositiveNumber(requiredMeters, 0);

  if (safeMeters <= 0) {
    return {
      chargedHalfBars: 0,
      chargedBars: 0,
      chargedMeters: 0,
    };
  }

  const chargedHalfBars = Math.ceil(safeMeters / HALF_BAR_LENGTH_METERS);

  return {
    chargedHalfBars,
    chargedBars: chargedHalfBars / 2,
    chargedMeters: chargedHalfBars * HALF_BAR_LENGTH_METERS,
  };
}

function NumberField({ label, value, onChange, min = 0, step = 1, suffix, helper }) {
  return (
    <label style={{ display: "grid", gap: 6, alignContent: "start" }}>
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
      <span style={{ fontSize: 12, color: "#7a7067", minHeight: 18 }}>{helper || " "}</span>
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

function ProfileFramePiece({ length, face, depth, position, rotation, color, shapeType, veta }) {
  const safeLength = Math.max(length, 0.01);
  const baseColor = veta || color;
  const frontColor = color;
  const isPineChata = shapeType === "pine-chata";
  const baseThickness = isPineChata ? depth * 0.72 : depth;
  const frontLipThickness = isPineChata ? depth * 0.18 : 0;
  const innerStepThickness = isPineChata ? depth * 0.12 : 0;
  const frontLipHeight = isPineChata ? face * 0.32 : 0;
  const innerStepHeight = isPineChata ? face * 0.18 : 0;
  const innerStepWidth = isPineChata ? face * 0.56 : 0;

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[safeLength, face, baseThickness]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={isPineChata ? 0.78 : 0.5}
          metalness={isPineChata ? 0.02 : 0.35}
        />
      </mesh>

      {isPineChata ? (
        <>
          <mesh position={[0, face * 0.22, baseThickness / 2 - frontLipThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[safeLength, frontLipHeight, frontLipThickness]} />
            <meshStandardMaterial color={frontColor} roughness={0.7} metalness={0.02} />
          </mesh>

          <mesh position={[0, -face * 0.08, baseThickness / 2 - frontLipThickness - innerStepThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[safeLength, innerStepWidth, innerStepThickness]} />
            <meshStandardMaterial color="#e7c992" roughness={0.72} metalness={0.01} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function FramePreview3D({
  anchoMm,
  altoMm,
  faceMm,
  depthMm,
  color,
  vidrio,
  fondoColor,
  paspartuMm,
  shapeType,
  veta,
}) {
  const outerWidth = clampPositiveNumber(anchoMm, 700) * MM_TO_SCENE;
  const outerHeight = clampPositiveNumber(altoMm, 1000) * MM_TO_SCENE;
  const face = Math.max(clampPositiveNumber(faceMm, 20) * MM_TO_SCENE, 0.018);
  const depth = Math.max(clampPositiveNumber(depthMm, 20) * MM_TO_SCENE, 0.028);
  const innerWidth = Math.max(outerWidth - face * 2, face * 0.75);
  const innerHeight = Math.max(outerHeight - face * 2, face * 0.75);
  const paspartuScene = Math.min(clampPositiveNumber(paspartuMm, 0) * MM_TO_SCENE, innerWidth / 2.2, innerHeight / 2.2);
  const openingWidth = Math.max(innerWidth - paspartuScene * 2, face * 0.45);
  const openingHeight = Math.max(innerHeight - paspartuScene * 2, face * 0.45);
  return (
    <>
      <color attach="background" args={["#f3ede4"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 3, 4]} intensity={1.5} castShadow />
      <directionalLight position={[-2, -1, 3]} intensity={0.5} />

      <group>
        <ProfileFramePiece
          length={outerWidth}
          face={face}
          depth={depth}
          position={[0, outerHeight / 2 - face / 2, 0]}
          rotation={[0, 0, 0]}
          color={color}
          shapeType={shapeType}
          veta={veta}
        />
        <ProfileFramePiece
          length={outerWidth}
          face={face}
          depth={depth}
          position={[0, -outerHeight / 2 + face / 2, 0]}
          rotation={[0, 0, 0]}
          color={color}
          shapeType={shapeType}
          veta={veta}
        />
        <ProfileFramePiece
          length={outerHeight - face * 2}
          face={face}
          depth={depth}
          position={[-outerWidth / 2 + face / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          color={color}
          shapeType={shapeType}
          veta={veta}
        />
        <ProfileFramePiece
          length={outerHeight - face * 2}
          face={face}
          depth={depth}
          position={[outerWidth / 2 - face / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          color={color}
          shapeType={shapeType}
          veta={veta}
        />

        {vidrio ? (
          <mesh position={[0, 0, 0.002]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.005]} />
            <meshPhysicalMaterial color="#b7d8ec" transmission={0.72} roughness={0.08} thickness={0.03} transparent opacity={0.5} />
          </mesh>
        ) : null}

        {fondoColor ? (
          <mesh position={[0, 0, -depth * 0.28]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.01]} />
            <meshStandardMaterial color={fondoColor} roughness={0.95} />
          </mesh>
        ) : null}

        {paspartuScene > 0 ? (
          <>
            <mesh position={[0, innerHeight / 2 - paspartuScene / 2, 0.008]}>
              <boxGeometry args={[innerWidth, paspartuScene, 0.012]} />
              <meshStandardMaterial color="#f6f1e7" roughness={0.92} />
            </mesh>
            <mesh position={[0, -innerHeight / 2 + paspartuScene / 2, 0.008]}>
              <boxGeometry args={[innerWidth, paspartuScene, 0.012]} />
              <meshStandardMaterial color="#f6f1e7" roughness={0.92} />
            </mesh>
            <mesh position={[-innerWidth / 2 + paspartuScene / 2, 0, 0.008]}>
              <boxGeometry args={[paspartuScene, openingHeight, 0.012]} />
              <meshStandardMaterial color="#f6f1e7" roughness={0.92} />
            </mesh>
            <mesh position={[innerWidth / 2 - paspartuScene / 2, 0, 0.008]}>
              <boxGeometry args={[paspartuScene, openingHeight, 0.012]} />
              <meshStandardMaterial color="#f6f1e7" roughness={0.92} />
            </mesh>
          </>
        ) : null}
      </group>

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
  const normalizedDimensions = useMemo(
    () => normalizeDimensionsByOrientation(form.anchoMm, form.altoMm, form.orientacion),
    [form.anchoMm, form.altoMm, form.orientacion]
  );

  const selectedProfile = useMemo(
    () => INITIAL_PROFILES.find((profile) => profile.id === form.profileId) || INITIAL_PROFILES[0],
    [form.profileId]
  );
  const selectedFondo = useMemo(
    () => FONDO_OPTIONS.find((option) => option.id === form.fondoId) || FONDO_OPTIONS[0],
    [form.fondoId]
  );
  const selectedPintado = useMemo(
    () => PINTADO_OPTIONS.find((option) => option.id === form.pintadoId) || PINTADO_OPTIONS[0],
    [form.pintadoId]
  );
  const frameColor = selectedPintado.color || selectedProfile.color;
  const normalizedFaceMm = clampPositiveNumber(selectedProfile.frenteMm, 0);

  const quote = useMemo(() => {
    const inputAnchoMm = normalizedDimensions.ancho;
    const inputAltoMm = normalizedDimensions.alto;
    const cantidad = Math.max(clampPositiveNumber(form.cantidad, 1), 1);
    const anchoMm =
      form.tipoMedida === "interior"
        ? inputAnchoMm + normalizedFaceMm * 2
        : inputAnchoMm;
    const altoMm =
      form.tipoMedida === "interior"
        ? inputAltoMm + normalizedFaceMm * 2
        : inputAltoMm;
    const anchoM = anchoMm / 1000;
    const altoM = altoMm / 1000;
    const areaM2 = anchoM * altoM;
    const paspartuM = clampPositiveNumber(form.paspartuMm, 0) / 1000;
    const openingWidthM = Math.max(anchoM - paspartuM * 2, 0);
    const openingHeightM = Math.max(altoM - paspartuM * 2, 0);
    const paspartuAreaM2 = paspartuM > 0 ? Math.max(areaM2 - openingWidthM * openingHeightM, 0) : 0;

    const metrosMarcoUnitarios = (2 * (anchoMm + altoMm)) / 1000;
    const metrosMarcoTotales = metrosMarcoUnitarios * cantidad;
    const chargedBars = calculateChargedBars(metrosMarcoTotales);
    const subtotalVarilla = chargedBars.chargedMeters * clampPositiveNumber(selectedProfile.precioMetro, 0);

    const subtotalVidrio = form.vidrio === "si" ? areaM2 * cantidad * GLASS_PRICE_M2 : 0;
    const subtotalFondo = selectedFondo.precioM2 > 0 ? areaM2 * cantidad * selectedFondo.precioM2 : 0;
    const subtotalPaspartu = paspartuAreaM2 * cantidad * PASPARTU_PRICE_M2;
    const subtotalPintado = selectedPintado.extra * cantidad;

    const armadoSugerido = getArmadoSuggestion(anchoMm, altoMm);
    const subtotalArmado = armadoSugerido.precio * cantidad;

    const total =
      subtotalVarilla +
      subtotalVidrio +
      subtotalFondo +
      subtotalPaspartu +
      subtotalPintado +
      subtotalArmado;

    return {
      areaM2,
      paspartuAreaM2,
      metrosMarcoUnitarios,
      metrosMarcoTotales,
      mediasVarillasCobradas: chargedBars.chargedHalfBars,
      varillasCobradas: chargedBars.chargedBars,
      metrosFacturados: chargedBars.chargedMeters,
      subtotalVarilla,
      subtotalVidrio,
      subtotalFondo,
      subtotalPaspartu,
      subtotalPintado,
      armadoSugerido,
      subtotalArmado,
      total,
      inputAnchoMm,
      inputAltoMm,
      anchoFinalMm: anchoMm,
      altoFinalMm: altoMm,
    };
  }, [form, normalizedDimensions, normalizedFaceMm, selectedFondo, selectedPintado, selectedProfile]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOrientationChange(nextOrientation) {
    setForm((prev) => reorderFormDimensions(prev, nextOrientation));
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
  const twoColumnGridStyle = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0,1fr))",
    alignItems: "start",
  };
  const selectFieldStyle = {
    width: "100%",
    minHeight: 48,
    padding: "0 14px",
    borderRadius: 14,
    border: "1px solid rgba(73, 58, 38, 0.14)",
    background: "#fcfbf8",
  };
  const selectWrapperStyle = {
    display: "grid",
    gap: 6,
    alignContent: "start",
  };
  const helperTextStyle = {
    fontSize: 12,
    color: "#7a7067",
    minHeight: 18,
  };
  const rawMeasureInputStyle = {
    width: "100%",
    minHeight: 48,
    padding: "0 14px",
    borderRadius: 14,
    border: "1px solid rgba(73, 58, 38, 0.14)",
    background: "#fcfbf8",
    outline: "none",
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
              {formatNumber(quote.varillasCobradas, 1)} varilla{quote.varillasCobradas === 1 ? "" : "s"} cobradas
            </div>
            <div style={{ fontSize: 14, opacity: 0.84 }}>
              {formatNumber(quote.areaM2 * Math.max(clampPositiveNumber(form.cantidad, 1), 1), 2)} m2 totales de cuadro
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 0.95fr) minmax(380px, 1.05fr)" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <article style={panelStyle}>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#2d241c" }}>Configuracion del marco</div>

              <div style={twoColumnGridStyle}>
                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Tipo de varilla
                  </span>
                  <select
                    value={form.profileId}
                    onChange={(e) => setField("profileId", e.target.value)}
                    style={selectFieldStyle}
                  >
                    {INITIAL_PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.nombre}
                      </option>
                    ))}
                  </select>
                  <span style={helperTextStyle}> </span>
                </label>

                <NumberField
                  label="Cantidad"
                  value={form.cantidad}
                  onChange={(e) => setField("cantidad", e.target.value)}
                  min={1}
                  step={1}
                  suffix="u"
                />

                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Orientacion
                  </span>
                  <select
                    value={form.orientacion}
                    onChange={(e) => handleOrientationChange(e.target.value)}
                    style={selectFieldStyle}
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                  <span style={helperTextStyle}> </span>
                </label>
                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Tipo de medida
                  </span>
                  <select
                    value={form.tipoMedida}
                    onChange={(e) => setField("tipoMedida", e.target.value)}
                    style={selectFieldStyle}
                  >
                    <option value="exterior">Exterior</option>
                    <option value="interior">Interior</option>
                  </select>
                  <span style={helperTextStyle}>
                    {form.tipoMedida === "interior"
                      ? "La app suma automaticamente el frente de la varilla para obtener la medida final."
                      : "La medida cargada se toma como total exterior del marco."}
                  </span>
                </label>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Medidas
                </span>
                <div style={twoColumnGridStyle}>
                  <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
                    <input
                      type="number"
                      min="50"
                      step="1"
                      value={form.anchoMm}
                      onChange={(e) => setField("anchoMm", e.target.value)}
                      placeholder="Medida 1"
                      style={rawMeasureInputStyle}
                    />
                    <span style={helperTextStyle}>Se ordena automaticamente segun la orientacion.</span>
                  </div>

                  <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
                    <input
                      type="number"
                      min="50"
                      step="1"
                      value={form.altoMm}
                      onChange={(e) => setField("altoMm", e.target.value)}
                      placeholder="Medida 2"
                      style={rawMeasureInputStyle}
                    />
                    <span style={helperTextStyle}>
                      {form.orientacion === "horizontal"
                        ? `Horizontal: ancho ${normalizedDimensions.ancho} mm, alto ${normalizedDimensions.alto} mm`
                        : `Vertical: ancho ${normalizedDimensions.ancho} mm, alto ${normalizedDimensions.alto} mm`}
                    </span>
                  </div>
                </div>
              </div>

              <div style={twoColumnGridStyle}>
                <NumberField
                  label="Paspartu"
                  value={form.paspartuMm}
                  onChange={(e) => setField("paspartuMm", e.target.value)}
                  min={0}
                  step={1}
                  suffix="mm"
                  helper="Ingresa el ancho visible del paspartu."
                />
                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Vidrio
                  </span>
                  <select
                    value={form.vidrio}
                    onChange={(e) => setField("vidrio", e.target.value)}
                    style={selectFieldStyle}
                  >
                    <option value="si">Si</option>
                    <option value="no">No</option>
                  </select>
                  <span style={helperTextStyle}> </span>
                </label>

                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Fondo
                  </span>
                  <select
                    value={form.fondoId}
                    onChange={(e) => setField("fondoId", e.target.value)}
                    style={selectFieldStyle}
                  >
                    {FONDO_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nombre}
                      </option>
                    ))}
                  </select>
                  <span style={helperTextStyle}> </span>
                </label>
              </div>

              <div style={twoColumnGridStyle}>
                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Pintado
                  </span>
                  <select
                    value={form.pintadoId}
                    onChange={(e) => setField("pintadoId", e.target.value)}
                    style={selectFieldStyle}
                  >
                    {PINTADO_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nombre}
                      </option>
                    ))}
                  </select>
                  <span style={helperTextStyle}> </span>
                </label>
                <div />
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
                Esta vista ya responde a medida, orientacion, vidrio, fondo, paspartu y al color de pintado.
              </div>
            </div>

            <div style={{ height: 470, marginTop: 12 }}>
              <Canvas camera={{ position: [0, 0, 2.2], fov: 40 }}>
                <FramePreview3D
                  anchoMm={normalizedDimensions.ancho}
                  altoMm={normalizedDimensions.alto}
                  faceMm={selectedProfile.frenteMm}
                  depthMm={selectedProfile.profundidadMm}
                  color={frameColor}
                  vidrio={form.vidrio === "si"}
                  fondoColor={selectedFondo.precioM2 > 0 ? selectedFondo.color : null}
                  paspartuMm={form.paspartuMm}
                  shapeType={selectedProfile.shape}
                  veta={selectedProfile.veta}
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
              <SummaryRow label="Tipo de medida" value={form.tipoMedida === "interior" ? "Interior" : "Exterior"} />
              <SummaryRow
                label="Medida cargada"
                value={`${quote.inputAnchoMm} x ${quote.inputAltoMm} mm`}
              />
              <SummaryRow
                label="Medidas aplicadas"
                value={`${quote.anchoFinalMm} x ${quote.altoFinalMm} mm`}
              />
              <SummaryRow label="Precio por metro" value={formatCurrency(selectedProfile.precioMetro)} />
              <SummaryRow label="Perimetro por marco" value={`${formatNumber(quote.metrosMarcoUnitarios)} m`} />
              <SummaryRow label="Metros necesarios" value={`${formatNumber(quote.metrosMarcoTotales)} m`} />
              <SummaryRow label="Medias varillas cobradas" value={`${quote.mediasVarillasCobradas}`} />
              <SummaryRow label="Varillas cobradas" value={`${formatNumber(quote.varillasCobradas, 1)}`} />
              <SummaryRow label="Metros facturados" value={`${formatNumber(quote.metrosFacturados)} m`} />
              <SummaryRow label="Subtotal varilla" value={formatCurrency(quote.subtotalVarilla)} />
              <SummaryRow label="Subtotal vidrio" value={formatCurrency(quote.subtotalVidrio)} />
              <SummaryRow label={`Fondo (${selectedFondo.nombre})`} value={formatCurrency(quote.subtotalFondo)} />
              <SummaryRow
                label={`Paspartu (${formatNumber(clampPositiveNumber(form.paspartuMm, 0), 0)} mm)`}
                value={`${formatNumber(quote.paspartuAreaM2)} m2 · ${formatCurrency(quote.subtotalPaspartu)}`}
              />
              <SummaryRow label={`Pintado (${selectedPintado.nombre})`} value={formatCurrency(quote.subtotalPintado)} />
              <SummaryRow
                label={`Armado (${quote.armadoSugerido.etiqueta})`}
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
