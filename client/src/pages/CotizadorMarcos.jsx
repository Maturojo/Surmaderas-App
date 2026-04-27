import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

const BAR_LENGTH_METERS = 3.05;
const HALF_BAR_LENGTH_METERS = BAR_LENGTH_METERS / 2;
const MM_TO_SCENE = 0.0015;
const PASPARTU_PRICE_M2 = 19640;
const GLASS_PRICE_M2 = 33582;
const PRESET_SIZE_OPTIONS = [
  { id: "personalizada", nombre: "Personalizada", anchoMm: null, altoMm: null },
  { id: "a5", nombre: "A5", anchoMm: 148, altoMm: 210 },
  { id: "a4", nombre: "A4", anchoMm: 210, altoMm: 297 },
  { id: "a3", nombre: "A3", anchoMm: 297, altoMm: 420 },
  { id: "a2", nombre: "A2", anchoMm: 420, altoMm: 594 },
  { id: "a1", nombre: "A1", anchoMm: 594, altoMm: 841 },
  { id: "a0", nombre: "A0", anchoMm: 841, altoMm: 1189 },
];
const MIRROR_PRICE_M2 = 59166;

function createProfileId(codigo, nombre) {
  return String(codigo || nombre || "varilla")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferProfileMeasures(nombre) {
  const normalized = String(nombre || "").toUpperCase().replace(",", ".");
  const explicitPair = normalized.match(/(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)/);

  if (explicitPair) {
    const first = Number(explicitPair[1]);
    const second = Number(explicitPair[2]);
    return {
      frenteMm: Math.max(first, second),
      profundidadMm: Math.min(first, second),
    };
  }

  const cmMatch = normalized.match(/(\d+(?:\.\d+)?)\s*CM\b/);
  if (cmMatch) {
    const faceMm = Number(cmMatch[1]) * 10;
    return {
      frenteMm: faceMm,
      profundidadMm: Math.max(Math.round(faceMm * 0.45), 12),
    };
  }

  const genericNumber = normalized.match(/(\d+(?:\.\d+)?)/);
  if (genericNumber) {
    const faceMm = Number(genericNumber[1]) * 10;
    return {
      frenteMm: faceMm,
      profundidadMm: Math.max(Math.round(faceMm * 0.45), 12),
    };
  }

  return {
    frenteMm: 30,
    profundidadMm: 18,
  };
}

function createProfile({ codigo, nombre, precioMetro, frenteMm, profundidadMm, shape: shapeOverride, color: colorOverride, veta: vetaOverride, liston = false }) {
  const measures =
    Number.isFinite(frenteMm) && Number.isFinite(profundidadMm)
      ? { frenteMm, profundidadMm }
      : inferProfileMeasures(nombre);
  const normalizedName = String(nombre || "").toUpperCase();
  const isPine = /PINO/.test(normalizedName);
  const shape = (() => {
    if (shapeOverride) return shapeOverride;
    if (isPine) return "pine-chata";
    if (/ONDULADA/.test(normalizedName)) return "ondulada";
    if (/MOLDURON/.test(normalizedName)) return "molduron";
    if (/ITALIANA/.test(normalizedName)) return "italiana";
    if (/CHANFLE/.test(normalizedName)) return "chanfle";
    if (/BOMBE C\/GARGANTA|BOMBE C\/ GARGANTA|GARGANTA/.test(normalizedName)) return "bombe-garganta";
    if (/BOMBE/.test(normalizedName)) return "bombe";
    if (/BATEA/.test(normalizedName)) return "batea";
    if (/CHATA/.test(normalizedName)) return "chata";
    return "box";
  })();

  return {
    id: createProfileId(codigo, nombre),
    codigo,
    nombre,
    precioMetro,
    frenteMm: measures.frenteMm,
    profundidadMm: measures.profundidadMm,
    color: colorOverride || (isPine ? "#c59257" : "#b78a52"),
    shape,
    veta: vetaOverride || (isPine ? "#e2bf86" : "#d7b079"),
    liston,
  };
}

const INITIAL_PROFILES = [
  createProfile({ codigo: "2101", nombre: "BATEA 20 X 27", precioMetro: 1858 }),
  createProfile({ codigo: "MC910", nombre: "BATEA 21 X 45", precioMetro: 2948 }),
  createProfile({ codigo: "2814", nombre: "BATEA AMERICANA 21 X 45", precioMetro: 6724 }),
  createProfile({ codigo: "1410", nombre: "BOMBE 1 CM.", precioMetro: 3589 }),
  createProfile({ codigo: "1531", nombre: "BOMBE 1,5 CM. KIRI", precioMetro: 4723 }),
  createProfile({ codigo: "MC909", nombre: "BOMBE 1.5", precioMetro: 929 }),
  createProfile({ codigo: "2532", nombre: "BOMBE 2", precioMetro: 1148 }),
  createProfile({ codigo: "2533", nombre: "BOMBE 3", precioMetro: 2161 }),
  createProfile({ codigo: "2567", nombre: "BOMBE 4", precioMetro: 2796 }),
  createProfile({ codigo: "2229", nombre: "BOMBE C/GARGANTA 16 X 20", precioMetro: 1152 }),
  createProfile({ codigo: "MC934", nombre: "CHANFLE 3.5", precioMetro: 1504 }),
  createProfile({ codigo: "2564", nombre: "CHANFLE 4.5", precioMetro: 2240 }),
  createProfile({ codigo: "2565", nombre: "CHANFLE 5.5", precioMetro: 2382 }),
  createProfile({ codigo: "MC903", nombre: "CHANFLE 7", precioMetro: 3333 }),
  createProfile({ codigo: "2331", nombre: "CHATA 10 X 30", precioMetro: 1209 }),
  createProfile({ codigo: "MC927", nombre: "CHATA 15 X 30", precioMetro: 1639 }),
  createProfile({ codigo: "2350", nombre: "CHATA 15 X 45", precioMetro: 2122 }),
  createProfile({ codigo: "MC02", nombre: "CHATA 6 EN FF12", precioMetro: 3034 }),
  createProfile({ codigo: "MC01", nombre: "CHATA 9 EN FF12", precioMetro: 3699 }),
  createProfile({ codigo: "2237", nombre: "CHATA P/ CAJON 2 REBAJES 20X42 PINO", precioMetro: 8636 }),
  createProfile({ codigo: "2811", nombre: "ITALIANA 2 CM.", precioMetro: 1146 }),
  createProfile({ codigo: "2547", nombre: "ITALIANA 3 CM.", precioMetro: 2240 }),
  createProfile({ codigo: "2548", nombre: "ITALIANA 4 CM.", precioMetro: 2896 }),
  createProfile({ codigo: "2549", nombre: "ITALIANA 6 CM.", precioMetro: 6886 }),
  createProfile({ codigo: "MC919", nombre: "MOLDURON 21 X 69 ESPECIAL", precioMetro: 5397 }),
  createProfile({ codigo: "MC918", nombre: "MOLDURON ESPECIAL 32 X 58", precioMetro: 5795 }),
  createProfile({ codigo: "MC914", nombre: "ONDULADA 14 X 32", precioMetro: 1639 }),
  createProfile({ codigo: "MC922", nombre: "ONDULADA 14 X 45", precioMetro: 2241 }),
  createProfile({ codigo: "30105", nombre: "LISTON 1/2 X 1/2", precioMetro: 403, frenteMm: 13, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30106", nombre: "LISTON 1/2 X 3/4", precioMetro: 591, frenteMm: 19, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30107", nombre: "LISTON 1/2 X 1", precioMetro: 667, frenteMm: 25, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30108", nombre: "LISTON 1/2 X 1 1/2", precioMetro: 1014, frenteMm: 38, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30109", nombre: "LISTON 1/2 X 2", precioMetro: 1287, frenteMm: 51, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30110", nombre: "LISTON 1/2 X 3", precioMetro: 1923, frenteMm: 76, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30111", nombre: "LISTON 1/2 X 4", precioMetro: 2556, frenteMm: 102, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30112", nombre: "LISTON 1/2 X 5", precioMetro: 3199, frenteMm: 127, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30113", nombre: "LISTON 1/2 X 6", precioMetro: 3831, frenteMm: 152, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30122", nombre: "LISTON 3/4 X 3/4", precioMetro: 779, frenteMm: 19, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30123", nombre: "LISTON 3/4 X 1", precioMetro: 934, frenteMm: 25, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30124", nombre: "LISTON 3/4 X 1 1/2", precioMetro: 1446, frenteMm: 38, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30125", nombre: "LISTON 3/4 X 2", precioMetro: 1928, frenteMm: 51, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30126", nombre: "LISTON 3/4 X 3", precioMetro: 2876, frenteMm: 76, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30127", nombre: "LISTON 3/4 X 4", precioMetro: 3835, frenteMm: 102, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30128", nombre: "LISTON 3/4 X 5", precioMetro: 4817, frenteMm: 127, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30129", nombre: "LISTON 3/4 X 6", precioMetro: 4685, frenteMm: 152, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30138", nombre: "LISTON 1 X 1", precioMetro: 1178, frenteMm: 25, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30139", nombre: "LISTON 1 X 1 1/2", precioMetro: 1730, frenteMm: 38, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30140", nombre: "LISTON 1 X 2", precioMetro: 2308, frenteMm: 51, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30141", nombre: "LISTON 1 X 3", precioMetro: 3478, frenteMm: 76, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30142", nombre: "LISTON 1 X 4", precioMetro: 4625, frenteMm: 102, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30143", nombre: "LISTON 1 X 5", precioMetro: 5776, frenteMm: 127, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30144", nombre: "LISTON 1 X 6", precioMetro: 6955, frenteMm: 152, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30153", nombre: "LISTON 1 1/2 X 1 1/2", precioMetro: 2877, frenteMm: 38, profundidadMm: 38, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30154", nombre: "LISTON 1 1/2 X 2", precioMetro: 3842, frenteMm: 51, profundidadMm: 38, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30155", nombre: "LISTON 11/2 X 3", precioMetro: 5756, frenteMm: 76, profundidadMm: 38, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30170", nombre: "LISTON 2 X2", precioMetro: 5241, frenteMm: 51, profundidadMm: 51, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30171", nombre: "LISTON 2 X 3", precioMetro: 7917, frenteMm: 76, profundidadMm: 51, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30172", nombre: "LISTON 2 X 4", precioMetro: 10484, frenteMm: 102, profundidadMm: 51, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30111C", nombre: "LISTON 1/2 X 4", precioMetro: 2172, frenteMm: 102, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30112C", nombre: "LISTON 1/2 X 5", precioMetro: 2716, frenteMm: 127, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30113C", nombre: "LISTON 1/2 X 6", precioMetro: 3251, frenteMm: 152, profundidadMm: 13, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30127C", nombre: "LISTON 3/4 X 4", precioMetro: 3253, frenteMm: 102, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30128C", nombre: "LISTON 3/4 X 5", precioMetro: 4085, frenteMm: 127, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30129C", nombre: "LISTON 3/4 X 6", precioMetro: 3975, frenteMm: 152, profundidadMm: 19, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30140C", nombre: "LISTON 1 X 2", precioMetro: 1961, frenteMm: 51, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30142C", nombre: "LISTON 1 X 4", precioMetro: 3921, frenteMm: 102, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30143C", nombre: "LISTON 1 X 5", precioMetro: 4905, frenteMm: 127, profundidadMm: 25, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30170C", nombre: "LISTON 2 X 2", precioMetro: 4451, frenteMm: 51, profundidadMm: 51, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
  createProfile({ codigo: "30172C", nombre: "LISTON 2 X 4", precioMetro: 8896, frenteMm: 102, profundidadMm: 51, shape: "pine-liston", color: "#d1b07d", veta: "#ead5ab", liston: true }),
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

const PASPARTU_COLOR_OPTIONS = [
  { id: "blanco", nombre: "Blanco", color: "#f6f1e7" },
  { id: "natural", nombre: "Natural", color: "#e8dcc6" },
  { id: "negro", nombre: "Negro", color: "#2f2c2a" },
  { id: "gris", nombre: "Gris", color: "#b9b4ae" },
  { id: "marfil", nombre: "Marfil", color: "#efe4d0" },
];

const EMPTY_PROFILE = {
  id: "",
  codigo: "",
  nombre: "Sin seleccionar",
  precioMetro: 0,
  frenteMm: 30,
  profundidadMm: 18,
  color: "#b78a52",
  shape: "box",
  veta: "#d7b079",
  liston: false,
};

function getProfileDisplayMeasures(profile, listonUso = "plano") {
  const safeProfile = profile || EMPTY_PROFILE;
  const frenteMm = clampPositiveNumber(safeProfile.frenteMm, 0);
  const profundidadMm = clampPositiveNumber(safeProfile.profundidadMm, 0);

  if (safeProfile.liston && listonUso === "canto") {
    return {
      frenteMm: profundidadMm,
      profundidadMm: frenteMm,
    };
  }

  return {
    frenteMm,
    profundidadMm,
  };
}

const INITIAL_FORM = {
  profileId: "",
  listonUso: "plano",
  anchoMm: 700,
  altoMm: 1000,
  cantidad: 1,
  orientacion: "vertical",
  tipoMedida: "exterior",
  frente: "vidrio",
  fondoId: "fibrofacil",
  paspartuMm: 0,
  paspartuColorId: "blanco",
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

function formatDimensionCm(mmValue, digits = 1) {
  return `${formatNumber(clampPositiveNumber(mmValue, 0) / 10, digits)} cm`;
}

function formatDimensionCmPair(anchoMm, altoMm, digits = 1) {
  return `${formatDimensionCm(anchoMm, digits)} x ${formatDimensionCm(altoMm, digits)}`;
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
  const roundedAreaM2 = Math.round(areaM2 * 100) / 100;

  if (roundedAreaM2 <= 0.03) {
    return { etiqueta: "Hasta 0.03 m2", precio: 4900 };
  }

  if (roundedAreaM2 <= 0.12) {
    return { etiqueta: "Hasta 0.12 m2", precio: 5600 };
  }

  if (roundedAreaM2 <= 0.35) {
    return { etiqueta: "Hasta 0.35 m2", precio: 6950 };
  }

  return { etiqueta: "Mas de 0.35 m2", precio: 8400 };
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

function createFingerJointPineTexture(kind = "face") {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const plankPalette = ["#f1dfb4", "#ebd6a7", "#f6e7c0", "#e7cf97"];
  const grainPalette = ["#c99958", "#b88443", "#d6ab6f", "#aa7338"];
  const plankCount = kind === "face" ? 4 : 8;
  const plankWidth = canvas.width / plankCount;

  context.fillStyle = "#efddb2";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let plank = 0; plank < plankCount; plank += 1) {
    const x = plank * plankWidth;
    const baseColor = plankPalette[plank % plankPalette.length];
    context.fillStyle = baseColor;
    context.fillRect(x, 0, plankWidth, canvas.height);

    context.fillStyle = "rgba(111, 74, 28, 0.14)";
    context.fillRect(x + plankWidth - 2, 0, 2, canvas.height);

    const lineCount = kind === "face" ? 10 : 6;
    for (let line = 0; line < lineCount; line += 1) {
      const offset = x + 10 + line * ((plankWidth - 20) / 10);
      context.strokeStyle = grainPalette[(plank + line) % grainPalette.length];
      context.globalAlpha = kind === "face" ? 0.18 + ((line + plank) % 3) * 0.05 : 0.14;
      context.lineWidth = kind === "face" ? 1.2 + (line % 2) * 0.5 : 0.8;
      context.beginPath();
      context.moveTo(offset, 0);
      if (kind === "face") {
        context.bezierCurveTo(
          offset - 7,
          canvas.height * 0.22,
          offset + 10,
          canvas.height * 0.7,
          offset - 3,
          canvas.height
        );
      } else {
        context.bezierCurveTo(
          offset - 2,
          canvas.height * 0.3,
          offset + 3,
          canvas.height * 0.65,
          offset,
          canvas.height
        );
      }
      context.stroke();
    }

    const knotCount = kind === "face" ? 3 : 1;
    for (let knot = 0; knot < knotCount; knot += 1) {
      const centerX = x + plankWidth * (0.34 + knot * 0.24);
      const centerY = 90 + (((plank + knot) * 103) % 290);
      context.globalAlpha = kind === "face" ? 0.14 : 0.08;
      context.fillStyle = "#b78449";
      context.beginPath();
      context.ellipse(centerX, centerY, kind === "face" ? 10 : 6, kind === "face" ? 28 : 14, 0.03, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (kind === "face") {
    const jointHeight = 38;
    const jointRows = [0, 220, 470];
    for (const row of jointRows) {
      for (let plank = 0; plank < plankCount; plank += 1) {
        const x = plank * plankWidth;
        const fingerCount = 6;
        const segmentWidth = plankWidth / fingerCount;
        for (let segment = 0; segment < fingerCount; segment += 1) {
          context.globalAlpha = 0.32;
          context.fillStyle = plankPalette[(plank + segment + 1) % plankPalette.length];
          context.fillRect(x + segment * segmentWidth, row, segmentWidth - 1, jointHeight);
        }
      }
    }
  }

  context.globalAlpha = kind === "face" ? 0.11 : 0.08;
  for (let i = 0; i < 16; i += 1) {
    context.fillStyle = i % 2 === 0 ? "#fff1d1" : "#ddbd84";
    context.fillRect(i * (kind === "face" ? 32 : 24), 0, kind === "face" ? 12 : 7, canvas.height);
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;

  return texture;
}

function ProfileFramePiece({ length, face, depth, position, rotation, color, shapeType, veta }) {
  const safeLength = Math.max(length, 0.01);
  const isPineChata = shapeType === "pine-chata";
  const isPineListon = shapeType === "pine-liston";
  const isBombe = shapeType === "bombe";
  const isBombeGarganta = shapeType === "bombe-garganta";
  const isChanfle = shapeType === "chanfle";
  const isBatea = shapeType === "batea";
  const isChata = shapeType === "chata";
  const isItaliana = shapeType === "italiana";
  const isMolduron = shapeType === "molduron";
  const isOndulada = shapeType === "ondulada";
  const baseThickness = isPineChata ? depth * 0.72 : depth;
  const frontLipThickness = isPineChata ? depth * 0.18 : 0;
  const innerStepThickness = isPineChata ? depth * 0.12 : 0;
  const frontLipHeight = isPineChata ? face * 0.32 : 0;
  const innerStepWidth = isPineChata ? face * 0.56 : 0;
  const frontPlateDepth = Math.max(depth * 0.08, 0.0025);
  const sideTrimWidth = Math.max(face * 0.14, 0.003);
  const centerStripWidth = Math.max(face * 0.18, 0.004);
  const grooveWidth = Math.max(face * 0.11, 0.003);
  const ridgeDepth = Math.max(depth * 0.1, 0.002);
  const accentColor = isPineChata ? "#fff1cf" : new THREE.Color(color).offsetHSL(0, 0.02, 0.12).getStyle();
  const shadowColor = isPineChata ? "#f3ddb2" : new THREE.Color(color).offsetHSL(0, 0, -0.14).getStyle();
  const darkAccentColor = isPineChata ? "#ddc08e" : new THREE.Color(color).offsetHSL(0, 0, -0.22).getStyle();
  const pineFaceTexture = useMemo(() => {
    if (!isPineChata && !isPineListon) {
      return null;
    }
    const texture = createFingerJointPineTexture("face");
    if (!texture) {
      return null;
    }
    const repeated = texture.clone();
    repeated.wrapS = THREE.RepeatWrapping;
    repeated.wrapT = THREE.RepeatWrapping;
    repeated.repeat.set(Math.max(safeLength * 1.35, 2.2), 1.15);
    repeated.needsUpdate = true;
    return repeated;
  }, [isPineChata, isPineListon, safeLength]);
  const pineEdgeTexture = useMemo(() => {
    if (!isPineChata && !isPineListon) {
      return null;
    }
    const texture = createFingerJointPineTexture("edge");
    if (!texture) {
      return null;
    }
    const repeated = texture.clone();
    repeated.wrapS = THREE.RepeatWrapping;
    repeated.wrapT = THREE.RepeatWrapping;
    repeated.repeat.set(Math.max(safeLength * 1.8, 3), 1);
    repeated.needsUpdate = true;
    return repeated;
  }, [isPineChata, isPineListon, safeLength]);
  const pineBumpTexture = useMemo(() => {
    if ((!isPineChata && !isPineListon) || !pineFaceTexture) {
      return null;
    }

    const texture = pineFaceTexture.clone();
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [isPineChata, isPineListon, pineFaceTexture]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[safeLength, face, baseThickness]} />
        <meshStandardMaterial
          color={isPineChata || isPineListon ? "#ead8ac" : color}
          roughness={isPineChata || isPineListon ? 0.68 : 0.5}
          metalness={isPineChata || isPineListon ? 0.01 : 0.35}
          map={pineEdgeTexture || pineFaceTexture}
          bumpMap={pineBumpTexture}
          bumpScale={isPineChata || isPineListon ? 0.028 : 0}
        />
      </mesh>

      {isPineChata ? (
        <>
          <mesh position={[0, face * 0.22, baseThickness / 2 - frontLipThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[safeLength, frontLipHeight, frontLipThickness]} />
            <meshStandardMaterial
              color="#fff0d0"
              roughness={0.62}
              metalness={0.01}
              map={pineFaceTexture}
              bumpMap={pineBumpTexture}
              bumpScale={0.024}
            />
          </mesh>

          <mesh position={[0, -face * 0.08, baseThickness / 2 - frontLipThickness - innerStepThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[safeLength, innerStepWidth, innerStepThickness]} />
            <meshStandardMaterial
              color="#f3ddb2"
              roughness={0.64}
              metalness={0.01}
              map={pineFaceTexture}
              bumpMap={pineBumpTexture}
              bumpScale={0.024}
            />
          </mesh>

          <mesh position={[0, 0, baseThickness / 2 + 0.0008]} receiveShadow>
            <planeGeometry args={[safeLength, face * 0.52]} />
            <meshStandardMaterial
              color="#fff5dc"
              roughness={0.54}
              metalness={0.01}
              map={pineFaceTexture}
              bumpMap={pineBumpTexture}
              bumpScale={0.03}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>

          <mesh position={[0, face * 0.22, baseThickness / 2 - frontLipThickness + 0.0012]} receiveShadow>
            <planeGeometry args={[safeLength, frontLipHeight]} />
            <meshStandardMaterial
              color="#fff1cf"
              roughness={0.5}
              metalness={0.01}
              map={pineFaceTexture}
              bumpMap={pineBumpTexture}
              bumpScale={0.034}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>

          <mesh position={[0, -face * 0.08, baseThickness / 2 - frontLipThickness - innerStepThickness + 0.001]} receiveShadow>
            <planeGeometry args={[safeLength, innerStepWidth]} />
            <meshStandardMaterial
              color="#f8e7bf"
              roughness={0.52}
              metalness={0.01}
              map={pineFaceTexture}
              bumpMap={pineBumpTexture}
              bumpScale={0.032}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        </>
      ) : null}

      {isPineListon ? (
        <>
          <mesh position={[0, 0, depth / 2 + 0.0012]} receiveShadow>
            <planeGeometry args={[safeLength, face]} />
            <meshStandardMaterial
              color="#f3e0b4"
              roughness={0.52}
              metalness={0.01}
              map={pineFaceTexture}
              bumpMap={pineBumpTexture}
              bumpScale={0.032}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
          <mesh position={[0, face / 2 - 0.0015, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[safeLength, depth]} />
            <meshStandardMaterial color="#e3c894" roughness={0.64} metalness={0.01} map={pineEdgeTexture} />
          </mesh>
          <mesh position={[0, -face / 2 + 0.0015, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[safeLength, depth]} />
            <meshStandardMaterial color="#d6b680" roughness={0.66} metalness={0.01} map={pineEdgeTexture} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && !isPineListon && isChata ? (
        <mesh position={[0, 0, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
          <boxGeometry args={[safeLength, face * 0.92, frontPlateDepth]} />
          <meshStandardMaterial color={accentColor} roughness={0.54} metalness={0.12} />
        </mesh>
      ) : null}

      {!isPineChata && isBatea ? (
        <>
          <mesh position={[0, face * 0.18, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.28, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.48} metalness={0.18} />
          </mesh>
          <mesh position={[0, -face * 0.22, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.18, frontPlateDepth]} />
            <meshStandardMaterial color={shadowColor} roughness={0.56} metalness={0.16} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && isBombe ? (
        <>
          <mesh position={[0, 0, baseThickness / 2 + ridgeDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.42, ridgeDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.44} metalness={0.16} />
          </mesh>
          <mesh position={[0, face * 0.22, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.18, frontPlateDepth]} />
            <meshStandardMaterial color={darkAccentColor} roughness={0.5} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.22, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.18, frontPlateDepth]} />
            <meshStandardMaterial color={darkAccentColor} roughness={0.5} metalness={0.16} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && isBombeGarganta ? (
        <>
          <mesh position={[0, face * 0.23, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.16, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.46} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.03, baseThickness / 2 + ridgeDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.26, ridgeDepth]} />
            <meshStandardMaterial color={shadowColor} roughness={0.56} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.26, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.12, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.48} metalness={0.16} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && isChanfle ? (
        <>
          <mesh position={[0, face * 0.25, baseThickness / 2 + frontPlateDepth / 2]} rotation={[0, 0, -0.24]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.18, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.48} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.18, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.18, frontPlateDepth]} />
            <meshStandardMaterial color={shadowColor} roughness={0.58} metalness={0.14} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && isItaliana ? (
        <>
          <mesh position={[0, face * 0.24, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.18, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.46} metalness={0.18} />
          </mesh>
          <mesh position={[0, 0, baseThickness / 2 + ridgeDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.2, ridgeDepth]} />
            <meshStandardMaterial color={darkAccentColor} roughness={0.52} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.24, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.14, frontPlateDepth]} />
            <meshStandardMaterial color={shadowColor} roughness={0.58} metalness={0.14} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && isMolduron ? (
        <>
          <mesh position={[0, face * 0.29, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.16, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.44} metalness={0.18} />
          </mesh>
          <mesh position={[0, face * 0.06, baseThickness / 2 + ridgeDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.16, ridgeDepth]} />
            <meshStandardMaterial color={darkAccentColor} roughness={0.48} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.14, baseThickness / 2 + ridgeDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.2, ridgeDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.5} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.33, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, face * 0.08, frontPlateDepth]} />
            <meshStandardMaterial color={shadowColor} roughness={0.58} metalness={0.14} />
          </mesh>
        </>
      ) : null}

      {!isPineChata && isOndulada ? (
        <>
          {[-0.28, -0.09, 0.09, 0.28].map((offset) => (
            <mesh key={offset} position={[0, face * offset, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
              <boxGeometry args={[safeLength, grooveWidth, frontPlateDepth]} />
              <meshStandardMaterial color={offset === -0.09 || offset === 0.28 ? accentColor : darkAccentColor} roughness={0.48} metalness={0.16} />
            </mesh>
          ))}
        </>
      ) : null}

      {!isPineChata && !isBombe && !isBombeGarganta && !isChanfle && !isBatea && !isChata && !isItaliana && !isMolduron && !isOndulada ? (
        <>
          <mesh position={[0, face * 0.24, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, sideTrimWidth, frontPlateDepth]} />
            <meshStandardMaterial color={accentColor} roughness={0.48} metalness={0.16} />
          </mesh>
          <mesh position={[0, -face * 0.18, baseThickness / 2 + frontPlateDepth / 2]} receiveShadow>
            <boxGeometry args={[safeLength, centerStripWidth, frontPlateDepth]} />
            <meshStandardMaterial color={shadowColor} roughness={0.56} metalness={0.14} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function ImageMesh({ imageUrl, width, height, z }) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!imageUrl) { setTexture(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (t) => {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      setTexture(t);
    });
  }, [imageUrl]);

  if (!texture || !texture.image) return null;

  const imgAspect = texture.image.width / texture.image.height;
  const frameAspect = width / height;
  if (imgAspect > frameAspect) {
    texture.repeat.set(frameAspect / imgAspect, 1);
    texture.offset.set((1 - frameAspect / imgAspect) / 2, 0);
  } else {
    texture.repeat.set(1, imgAspect / frameAspect);
    texture.offset.set(0, (1 - imgAspect / frameAspect) / 2);
  }
  texture.needsUpdate = true;

  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function FramePreview3D({
  anchoMm,
  altoMm,
  faceMm,
  depthMm,
  color,
  frente,
  fondoColor,
  paspartuMm,
  paspartuColor,
  imagenUrl,
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

        {frente === "vidrio" ? (
          <mesh position={[0, 0, 0.002]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.005]} />
            <meshPhysicalMaterial color="#b7d8ec" transmission={0.72} roughness={0.08} thickness={0.03} transparent opacity={0.5} />
          </mesh>
        ) : frente === "espejo" ? (
          <mesh position={[0, 0, 0.002]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.005]} />
            <meshStandardMaterial color="#d0d8e0" metalness={1} roughness={0.05} />
          </mesh>
        ) : null}

        {fondoColor ? (
          <mesh position={[0, 0, -depth * 0.28]} receiveShadow>
            <boxGeometry args={[innerWidth, innerHeight, 0.01]} />
            <meshStandardMaterial color={fondoColor} roughness={0.95} />
          </mesh>
        ) : null}

        {imagenUrl ? (
          <ImageMesh
            imageUrl={imagenUrl}
            width={openingWidth}
            height={openingHeight}
            z={0.001}
          />
        ) : null}

        {paspartuScene > 0 ? (
          <>
            <mesh position={[0, innerHeight / 2 - paspartuScene / 2, 0.008]}>
              <boxGeometry args={[innerWidth, paspartuScene, 0.012]} />
              <meshStandardMaterial color={paspartuColor} roughness={0.92} />
            </mesh>
            <mesh position={[0, -innerHeight / 2 + paspartuScene / 2, 0.008]}>
              <boxGeometry args={[innerWidth, paspartuScene, 0.012]} />
              <meshStandardMaterial color={paspartuColor} roughness={0.92} />
            </mesh>
            <mesh position={[-innerWidth / 2 + paspartuScene / 2, 0, 0.008]}>
              <boxGeometry args={[paspartuScene, openingHeight, 0.012]} />
              <meshStandardMaterial color={paspartuColor} roughness={0.92} />
            </mesh>
            <mesh position={[innerWidth / 2 - paspartuScene / 2, 0, 0.008]}>
              <boxGeometry args={[paspartuScene, openingHeight, 0.012]} />
              <meshStandardMaterial color={paspartuColor} roughness={0.92} />
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
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [varillaSearch, setVarillaSearch] = useState("");
  const [presetSizeId, setPresetSizeId] = useState("personalizada");
  const [unidadMedida, setUnidadMedida] = useState("cm");
  const [imagenUrl, setImagenUrl] = useState(null);
  const [glRef, setGlRef] = useState(null);

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagenUrl) URL.revokeObjectURL(imagenUrl);
    setImagenUrl(URL.createObjectURL(file));
  }

  function buildSummaryLines() {
    const frenteLabel = form.frente === "espejo" ? "Espejo" : form.frente === "vidrio" ? "Vidrio" : "No";
    const fondoLabel = selectedFondo.precioM2 > 0 && !espejoSinFondo ? selectedFondo.nombre : "No";
    const paspartuVal = clampPositiveNumber(form.paspartuMm, 0);
    const cantidadVal = Math.max(clampPositiveNumber(form.cantidad, 1), 1);
    return [
      ["Varilla seleccionada", selectedProfile ? `${effectiveProfile.codigo} - ${effectiveProfile.nombre}` : "Sin seleccionar"],
      ["Ancho de varilla", selectedProfile ? formatDimensionCm(effectiveProfile.frenteMm) : "-"],
      ["Orientacion visual", form.orientacion === "horizontal" ? "Horizontal" : "Vertical"],
      ["Tipo de medida", form.tipoMedida === "interior" ? "Interior" : "Exterior"],
      ["Medida cargada", `${formatDimensionCm(quote.inputAnchoMm)} x ${formatDimensionCm(quote.inputAltoMm)}`],
      ...(selectedProfile?.liston ? [["Colocacion", form.listonUso === "canto" ? "De canto" : "De plano"]] : []),
      ["Cantidad", String(cantidadVal)],
      ["Fondo", fondoLabel],
      ["Frente", frenteLabel],
      ["Paspartu", paspartuVal > 0 ? `${formatDimensionCm(paspartuVal)} · ${selectedPaspartuColor.nombre}` : "No"],
      ["Pintado", selectedPintado.nombre],
      ["Total estimado", quote.pricingEnabled ? formatCurrency(quote.total) : "Pendiente de seleccionar varilla", true],
    ];
  }

  function handlePrint() {
    if (!quote.pricingEnabled) {
      return;
    }

    const imageDataUrl = glRef ? glRef.domElement.toDataURL("image/png") : null;
    const lines = buildSummaryLines();
    const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto de Marco</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:A4 portrait;margin:10mm}
    body{font-family:system-ui,sans-serif;padding:0;color:#2a211a;background:#fff7ef}
    .sheet{width:190mm;min-height:125mm;margin:0 auto;padding:0 0 5mm;border-bottom:1.2px dashed #cfc6ba}
    .card{background:linear-gradient(180deg,#fffdf9 0%,#fff7ee 100%);border:1px solid #e2d7c9;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(92,74,50,.08)}
    .header{display:flex;justify-content:space-between;gap:12px;padding:10mm 10mm 7mm;background:linear-gradient(135deg,#2f241b 0%,#594332 100%);color:#fff8f0}
    .brand{display:grid;gap:3px}
    .eyebrow{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.72}
    h1{font-size:20px;font-weight:900;line-height:1}
    .sub{font-size:10px;opacity:.8}
    .meta{min-width:42mm;display:grid;gap:6px;align-content:start;padding:8px 10px;border-radius:14px;background:rgba(255,248,240,.12);border:1px solid rgba(255,248,240,.18)}
    .meta-label{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
    .meta-value{font-size:12px;font-weight:800}
    .body{display:grid;grid-template-columns:${imageDataUrl ? "70mm 1fr" : "1fr"};gap:10px;padding:9mm 10mm 8mm}
    .preview{display:${imageDataUrl ? "grid" : "none"};gap:6px;align-content:start}
    .preview-card{background:#f4ece2;border:1px solid #e3d8ca;border-radius:14px;padding:8px}
    .preview-label{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a7457;margin-bottom:6px}
    .render{display:block;width:100%;height:42mm;object-fit:contain;border-radius:10px;background:#fffdf9;box-shadow:inset 0 0 0 1px rgba(122,96,68,.08)}
    table{width:100%;border-collapse:separate;border-spacing:0 5px}
    tr{background:#f7f1e8}
    td{padding:6px 9px;font-size:11px;vertical-align:top}
    td:first-child{color:#6b5d4f;font-weight:700;width:54%;border-radius:10px 0 0 10px}
    td:last-child{font-weight:800;text-align:right;color:#2d241c;border-radius:0 10px 10px 0}
    .total{background:#2f241b}
    .total td{font-size:14px;font-weight:900;color:#fff8f0;padding-top:9px;padding-bottom:9px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{break-inside:avoid}}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="card">
      <div class="header">
        <div class="brand">
          <div class="eyebrow">Sur Maderas</div>
          <h1>Presupuesto de Marco</h1>
          <p class="sub">Cotizacion rapida para cliente</p>
        </div>
        <div class="meta">
          <div>
            <div class="meta-label">Fecha</div>
            <div class="meta-value">${fecha}</div>
          </div>
        </div>
      </div>
      <div class="body">
        ${imageDataUrl ? `<div class="preview">
          <div class="preview-card">
            <div class="preview-label">Vista del marco</div>
            <img class="render" src="${imageDataUrl}" />
          </div>
        </div>` : ""}
        <div>
          <table>
            ${lines.map(([label, value, strong]) =>
              `<tr class="${strong ? "total" : ""}"><td>${label}</td><td>${value}</td></tr>`
            ).join("")}
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 450);
  }

  function handleWhatsApp() {
    const lines = buildSummaryLines();
    const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    const text = [
      `*Presupuesto de Marco - Sur Maderas*`,
      `_${fecha}_`,
      "",
      ...lines.map(([label, value]) => `*${label}:* ${value}`),
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleEnviarAGenerarPedido() {
    if (!quote.pricingEnabled) {
      return;
    }

    const cantidad = Math.max(clampPositiveNumber(form.cantidad, 1), 1);
    const frenteLabel = form.frente === "espejo" ? "Espejo" : form.frente === "vidrio" ? "Vidrio" : "No";
    const fondoLabel = selectedFondo.precioM2 > 0 && !espejoSinFondo ? selectedFondo.nombre : "No";
    const paspartuVal = clampPositiveNumber(form.paspartuMm, 0);
    const paspartuLabel = paspartuVal > 0 ? `${formatDimensionCm(paspartuVal)} - ${selectedPaspartuColor.nombre}` : "No";
    const itemPrecioUnitario = cantidad > 0 ? quote.total / cantidad : quote.total;
    const observaciones = String(form.observaciones || "").trim();

    navigate("/notas-pedido", {
      state: {
        prefillMarco: {
          descripcion: "",
          cantidad,
          precio: String(Math.round(itemPrecioUnitario)),
          especial: false,
          data: {
            cotizado: true,
            perfil: `${effectiveProfile.codigo} - ${effectiveProfile.nombre}`,
            anchoVarillaCm: formatDimensionCm(effectiveMeasures.frenteMm),
            orientacionVisual: form.orientacion === "horizontal" ? "Horizontal" : "Vertical",
            tipoMedida: form.tipoMedida === "interior" ? "Interior" : "Exterior",
            medidaCargada: formatDimensionCmPair(quote.inputAnchoMm, quote.inputAltoMm),
            cantidad: String(cantidad),
            fondo: fondoLabel,
            frente: frenteLabel,
            paspartu: paspartuLabel,
            pintado: selectedPintado.nombre,
            obs: observaciones,
            resumenLineas: [
              { label: "Varilla seleccionada", value: `${effectiveProfile.codigo} - ${effectiveProfile.nombre}` },
              { label: "Ancho de varilla", value: formatDimensionCm(effectiveMeasures.frenteMm) },
              ...(selectedProfile?.liston ? [{ label: "Colocacion", value: form.listonUso === "canto" ? "De canto" : "De plano" }] : []),
              { label: "Orientacion visual", value: form.orientacion === "horizontal" ? "Horizontal" : "Vertical" },
              { label: "Tipo de medida", value: form.tipoMedida === "interior" ? "Interior" : "Exterior" },
              { label: "Medida cargada", value: formatDimensionCmPair(quote.inputAnchoMm, quote.inputAltoMm) },
              { label: "Cantidad", value: String(cantidad) },
              { label: "Fondo", value: fondoLabel },
              { label: "Frente", value: frenteLabel },
              { label: "Paspartu", value: paspartuLabel },
              { label: "Pintado", value: selectedPintado.nombre },
            ],
          },
        },
      },
    });
  }
  const normalizedDimensions = useMemo(
    () => normalizeDimensionsByOrientation(form.anchoMm, form.altoMm, form.orientacion),
    [form.anchoMm, form.altoMm, form.orientacion]
  );

  const selectedProfile = useMemo(
    () => INITIAL_PROFILES.find((profile) => profile.id === form.profileId) || null,
    [form.profileId]
  );
  const effectiveProfile = selectedProfile || EMPTY_PROFILE;
  const effectiveMeasures = useMemo(
    () => getProfileDisplayMeasures(effectiveProfile, form.listonUso),
    [effectiveProfile, form.listonUso]
  );
  const filteredProfiles = useMemo(() => {
    const query = varillaSearch.trim().toLowerCase();

    if (!query) {
      return INITIAL_PROFILES;
    }

    return INITIAL_PROFILES.filter((profile) => {
      const codigo = String(profile.codigo || "").toLowerCase();
      const nombre = String(profile.nombre || "").toLowerCase();
      return codigo.includes(query) || nombre.includes(query);
    });
  }, [varillaSearch]);
  const selectedFondo = useMemo(
    () => FONDO_OPTIONS.find((option) => option.id === form.fondoId) || FONDO_OPTIONS[0],
    [form.fondoId]
  );
  const selectedPintado = useMemo(
    () => PINTADO_OPTIONS.find((option) => option.id === form.pintadoId) || PINTADO_OPTIONS[0],
    [form.pintadoId]
  );
  const selectedPaspartuColor = useMemo(
    () => PASPARTU_COLOR_OPTIONS.find((option) => option.id === form.paspartuColorId) || PASPARTU_COLOR_OPTIONS[0],
    [form.paspartuColorId]
  );
  const frameColor = selectedPintado.color || effectiveProfile.color;
  const normalizedFaceMm = clampPositiveNumber(effectiveMeasures.frenteMm, 0);
  const normalizedDepthMm = clampPositiveNumber(effectiveMeasures.profundidadMm, 0);
  const espejoSinFondo =
    form.frente === "espejo" &&
    normalizedDimensions.ancho <= 1200 &&
    normalizedDimensions.alto <= 1200;

  const quote = useMemo(() => {
    const pricingEnabled = Boolean(selectedProfile);
    const inputAnchoMm = normalizedDimensions.ancho;
    const inputAltoMm = normalizedDimensions.alto;
    const cantidad = Math.max(clampPositiveNumber(form.cantidad, 1), 1);
    const paspartuMm = clampPositiveNumber(form.paspartuMm, 0);
    const interiorConPaspartuAnchoMm = inputAnchoMm + paspartuMm * 2;
    const interiorConPaspartuAltoMm = inputAltoMm + paspartuMm * 2;
    const anchoMm =
      form.tipoMedida === "interior"
        ? interiorConPaspartuAnchoMm + normalizedFaceMm * 2
        : inputAnchoMm;
    const altoMm =
      form.tipoMedida === "interior"
        ? interiorConPaspartuAltoMm + normalizedFaceMm * 2
        : inputAltoMm;
    const anchoM = anchoMm / 1000;
    const altoM = altoMm / 1000;
    const areaM2 = anchoM * altoM;
    const frenteAreaM2 = form.frente !== "no" ? areaM2 : 0;
    const fondoDisabled = form.frente === "espejo" && anchoMm <= 1200 && altoMm <= 1200;
    const fondoAreaM2 = selectedFondo.precioM2 > 0 && !fondoDisabled ? areaM2 : 0;
    const paspartuAreaM2 = paspartuMm > 0 ? areaM2 : 0;

    const metrosMarcoUnitarios = (2 * (anchoMm + altoMm)) / 1000;
    const metrosMarcoTotales = metrosMarcoUnitarios * cantidad;
    const chargedBars = calculateChargedBars(metrosMarcoTotales);
    const subtotalVarilla = pricingEnabled ? chargedBars.chargedMeters * clampPositiveNumber(effectiveProfile.precioMetro, 0) : 0;

    const frentePrecioM2 = form.frente === "espejo" ? MIRROR_PRICE_M2 : form.frente === "vidrio" ? GLASS_PRICE_M2 : 0;
    const subtotalVidrio = pricingEnabled ? frenteAreaM2 * cantidad * frentePrecioM2 : 0;
    const subtotalFondo = pricingEnabled ? fondoAreaM2 * cantidad * selectedFondo.precioM2 : 0;
    const subtotalPaspartu = pricingEnabled ? paspartuAreaM2 * cantidad * PASPARTU_PRICE_M2 : 0;
    const subtotalPintado = pricingEnabled ? selectedPintado.extra * cantidad : 0;

    const armadoSugerido = getArmadoSuggestion(anchoMm, altoMm);
    const subtotalArmado = pricingEnabled ? armadoSugerido.precio * cantidad : 0;

    const total =
      subtotalVarilla +
      subtotalVidrio +
      subtotalFondo +
      subtotalPaspartu +
      subtotalPintado +
      subtotalArmado;

    return {
      areaM2,
      frenteAreaM2,
      fondoAreaM2,
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
      pricingEnabled,
      inputAnchoMm,
      inputAltoMm,
      interiorConPaspartuAnchoMm,
      interiorConPaspartuAltoMm,
      anchoFinalMm: anchoMm,
      altoFinalMm: altoMm,
    };
  }, [effectiveProfile, form, normalizedDimensions, normalizedFaceMm, selectedFondo, selectedPintado, selectedProfile]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleProfileChange(profileId) {
    setField("profileId", profileId);
    setField("listonUso", "plano");
    const profile = INITIAL_PROFILES.find((item) => item.id === profileId);
    if (profile) {
      setVarillaSearch(`${profile.codigo} - ${profile.nombre}`);
    }
  }

  function handleVarillaSearchChange(nextValue) {
    setVarillaSearch(nextValue);
    const normalizedValue = String(nextValue || "").trim().toLowerCase();

    if (!normalizedValue) {
      setField("profileId", "");
      setField("listonUso", "plano");
      return;
    }

    const matchedProfile = INITIAL_PROFILES.find((profile) => {
      const codigo = String(profile.codigo || "").toLowerCase();
      const nombre = String(profile.nombre || "").toLowerCase();
      const fullLabel = `${codigo} - ${nombre}`;
      return codigo === normalizedValue || nombre === normalizedValue || fullLabel === normalizedValue;
    });

    if (matchedProfile) {
      setField("profileId", matchedProfile.id);
      if (!matchedProfile.liston) {
        setField("listonUso", "plano");
      }
    }
  }

  function handleOrientationChange(nextOrientation) {
    setForm((prev) => reorderFormDimensions(prev, nextOrientation));
  }

  function handlePresetSizeChange(nextPresetId) {
    setPresetSizeId(nextPresetId);
    const preset = PRESET_SIZE_OPTIONS.find((option) => option.id === nextPresetId);

    if (!preset || !preset.anchoMm || !preset.altoMm) {
      return;
    }

    const normalized = normalizeDimensionsByOrientation(preset.anchoMm, preset.altoMm, form.orientacion);
    setForm((prev) => ({
      ...prev,
      anchoMm: normalized.ancho,
      altoMm: normalized.alto,
    }));
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
            <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 900 }}>
              {quote.pricingEnabled ? formatCurrency(quote.total) : "Elegi una varilla"}
            </div>
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
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Medidas
                    </span>
                    <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #d6cfc8" }}>
                      {["mm", "cm"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnidadMedida(u)}
                          style={{
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            border: "none",
                            cursor: "pointer",
                            background: unidadMedida === u ? "#5d544b" : "transparent",
                            color: unidadMedida === u ? "#fff" : "#5d544b",
                            transition: "background 0.15s",
                          }}
                        >
                          {u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <select
                    value={presetSizeId}
                    onChange={(e) => handlePresetSizeChange(e.target.value)}
                    style={selectFieldStyle}
                  >
                    {PRESET_SIZE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nombre}
                      </option>
                    ))}
                  </select>
                  <div style={twoColumnGridStyle}>
                    <input
                      type="number"
                      min={unidadMedida === "cm" ? "5" : "50"}
                      step={unidadMedida === "cm" ? "0.1" : "1"}
                      value={unidadMedida === "cm" ? form.anchoMm / 10 : form.anchoMm}
                      onChange={(e) => {
                        setPresetSizeId("personalizada");
                        setField("anchoMm", unidadMedida === "cm" ? parseFloat(e.target.value || 0) * 10 : e.target.value);
                      }}
                      placeholder="Medida 1"
                      style={rawMeasureInputStyle}
                    />
                    <input
                      type="number"
                      min={unidadMedida === "cm" ? "5" : "50"}
                      step={unidadMedida === "cm" ? "0.1" : "1"}
                      value={unidadMedida === "cm" ? form.altoMm / 10 : form.altoMm}
                      onChange={(e) => {
                        setPresetSizeId("personalizada");
                        setField("altoMm", unidadMedida === "cm" ? parseFloat(e.target.value || 0) * 10 : e.target.value);
                      }}
                      placeholder="Medida 2"
                      style={rawMeasureInputStyle}
                    />
                  </div>
                  <span style={helperTextStyle}>
                    {unidadMedida === "cm"
                      ? `${form.orientacion === "horizontal" ? "Horizontal" : "Vertical"}: ancho ${normalizedDimensions.ancho / 10} cm, alto ${normalizedDimensions.alto / 10} cm`
                      : `${form.orientacion === "horizontal" ? "Horizontal" : "Vertical"}: ancho ${normalizedDimensions.ancho} mm, alto ${normalizedDimensions.alto} mm`}
                  </span>
                </div>

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

              <div style={twoColumnGridStyle}>
                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Varilla
                  </span>
                  <input
                    type="text"
                    list="varillas-options"
                    value={varillaSearch}
                    onChange={(e) => handleVarillaSearchChange(e.target.value)}
                    placeholder="Buscar por codigo o nombre"
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "0 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(73, 58, 38, 0.14)",
                      background: "#fcfbf8",
                      outline: "none",
                    }}
                  />
                  <datalist id="varillas-options">
                    {filteredProfiles.map((profile) => (
                      <option key={profile.id} value={`${profile.codigo} - ${profile.nombre}`} />
                    ))}
                  </datalist>
                  <span style={helperTextStyle}>
                    Busca por codigo o nombre. Si queda vacio, el vendedor debe elegir la varilla antes de cerrar el presupuesto.
                  </span>
                </label>

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
              </div>

              {selectedProfile?.liston ? (
                <div style={twoColumnGridStyle}>
                  <label style={selectWrapperStyle}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Uso del liston
                    </span>
                    <select
                      value={form.listonUso}
                      onChange={(e) => setField("listonUso", e.target.value)}
                      style={selectFieldStyle}
                    >
                      <option value="plano">De plano</option>
                      <option value="canto">De canto</option>
                    </select>
                    <span style={helperTextStyle}>
                      {form.listonUso === "canto"
                        ? `Se toma ${formatDimensionCm(effectiveMeasures.frenteMm)} de frente y ${formatDimensionCm(effectiveMeasures.profundidadMm)} de profundidad.`
                        : `Se toma ${formatDimensionCm(effectiveMeasures.frenteMm)} de frente y ${formatDimensionCm(effectiveMeasures.profundidadMm)} de profundidad.`}
                    </span>
                  </label>
                  <div />
                </div>
              ) : null}

              <div style={twoColumnGridStyle}>
                <label style={{ ...selectWrapperStyle, opacity: espejoSinFondo ? 0.45 : 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Fondo
                  </span>
                  <select
                    value={form.fondoId}
                    onChange={(e) => setField("fondoId", e.target.value)}
                    style={selectFieldStyle}
                    disabled={espejoSinFondo}
                  >
                    {FONDO_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nombre}
                      </option>
                    ))}
                  </select>
                  <span style={helperTextStyle}>
                    {espejoSinFondo ? "No aplica en espejo bajo 120 cm." : " "}
                  </span>
                </label>

                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Vidrio
                  </span>
                  <select
                    value={form.frente}
                    onChange={(e) => setField("frente", e.target.value)}
                    style={selectFieldStyle}
                  >
                    <option value="no">No</option>
                    <option value="vidrio">Vidrio</option>
                    <option value="espejo">Espejo</option>
                  </select>
                  <span style={helperTextStyle}> </span>
                </label>
              </div>

              <div style={twoColumnGridStyle}>
                <NumberField
                  label="Paspartu"
                  value={form.paspartuMm / 10}
                  onChange={(e) => setField("paspartuMm", (parseFloat(e.target.value || 0) * 10).toString())}
                  min={0}
                  step={0.1}
                  suffix="cm"
                  helper="Ingresa el ancho visible del paspartu en centimetros."
                />

                <label style={selectWrapperStyle}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5d544b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Material
                  </span>
                  <select
                    value={form.paspartuColorId}
                    onChange={(e) => setField("paspartuColorId", e.target.value)}
                    style={selectFieldStyle}
                  >
                    {PASPARTU_COLOR_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nombre}
                      </option>
                    ))}
                  </select>
                  <span style={helperTextStyle}>Se aplica en la vista y en el presupuesto.</span>
                </label>
              </div>

              <div style={twoColumnGridStyle}>
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

                <NumberField
                  label="Cantidad"
                  value={form.cantidad}
                  onChange={(e) => setField("cantidad", e.target.value)}
                  min={1}
                  step={1}
                  suffix="u"
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
                Esta vista ya responde a medida, orientacion, frente (vidrio/espejo), fondo, paspartu y al color de pintado.
              </div>
            </div>

            <div style={{ height: 470, marginTop: 12 }}>
              <Canvas camera={{ position: [0, 0, 2.2], fov: 40 }} gl={{ preserveDrawingBuffer: true }} onCreated={({ gl }) => setGlRef(gl)}>
                <FramePreview3D
                  anchoMm={normalizedDimensions.ancho}
                  altoMm={normalizedDimensions.alto}
                  faceMm={effectiveMeasures.frenteMm}
                  depthMm={normalizedDepthMm}
                  color={frameColor}
                  frente={form.frente}
                  fondoColor={selectedFondo.precioM2 > 0 ? selectedFondo.color : null}
                  paspartuMm={form.paspartuMm}
                  paspartuColor={selectedPaspartuColor.color}
                  imagenUrl={imagenUrl}
                  shapeType={effectiveProfile.shape}
                  veta={effectiveProfile.veta}
                />
              </Canvas>
            </div>

            <div style={{ padding: "12px 22px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: "#f0ece5", border: "1.5px solid #d6cfc8", fontSize: 13, fontWeight: 700, color: "#5d544b" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                Cargar imagen
              </label>
              {imagenUrl && (
                <button
                  type="button"
                  onClick={() => { URL.revokeObjectURL(imagenUrl); setImagenUrl(null); }}
                  style={{ padding: "8px 14px", borderRadius: 12, background: "transparent", border: "1.5px solid #d6cfc8", fontSize: 13, fontWeight: 700, color: "#b04a2a", cursor: "pointer" }}
                >
                  Quitar imagen
                </button>
              )}
              {imagenUrl && (
                <span style={{ fontSize: 12, color: "#8a7457" }}>La imagen se ajusta a la apertura interior del marco.</span>
              )}
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
              <SummaryRow label="Varilla seleccionada" value={selectedProfile ? effectiveProfile.nombre : "Sin seleccionar"} />
              <SummaryRow label="Ancho de varilla" value={selectedProfile ? formatDimensionCm(effectiveMeasures.frenteMm) : "-"} />
              {selectedProfile?.liston ? (
                <SummaryRow label="Colocacion" value={form.listonUso === "canto" ? "De canto" : "De plano"} />
              ) : null}
              <SummaryRow label="Orientacion visual" value={form.orientacion === "horizontal" ? "Horizontal" : "Vertical"} />
              <SummaryRow label="Tipo de medida" value={form.tipoMedida === "interior" ? "Interior" : "Exterior"} />
              <SummaryRow
                label="Medida cargada"
                value={`${formatDimensionCm(quote.inputAnchoMm)} x ${formatDimensionCm(quote.inputAltoMm)}`}
              />
              {clampPositiveNumber(form.paspartuMm, 0) > 0 && form.tipoMedida === "interior" ? (
                <SummaryRow
                  label="Interior + paspartu"
                  value={`${formatDimensionCm(quote.interiorConPaspartuAnchoMm)} x ${formatDimensionCm(quote.interiorConPaspartuAltoMm)}`}
                />
              ) : null}
              <SummaryRow
                label="Medidas aplicadas"
                value={`${formatDimensionCm(quote.anchoFinalMm)} x ${formatDimensionCm(quote.altoFinalMm)}`}
              />
              <SummaryRow label="Precio por metro" value={quote.pricingEnabled ? formatCurrency(effectiveProfile.precioMetro) : "-"} />
              <SummaryRow label="Perimetro por marco" value={`${formatNumber(quote.metrosMarcoUnitarios)} m`} />
              <SummaryRow label="Metros necesarios" value={`${formatNumber(quote.metrosMarcoTotales)} m`} />
              <SummaryRow label="Medias varillas cobradas" value={`${quote.mediasVarillasCobradas}`} />
              <SummaryRow label="Varillas cobradas" value={`${formatNumber(quote.varillasCobradas, 1)}`} />
              <SummaryRow label="Metros facturados" value={`${formatNumber(quote.metrosFacturados)} m`} />
              <SummaryRow label="Subtotal varilla" value={quote.pricingEnabled ? formatCurrency(quote.subtotalVarilla) : "-"} />
              <SummaryRow label="Frente m2" value={`${formatNumber(quote.frenteAreaM2)} m2`} />
              <SummaryRow label={`Subtotal frente (${form.frente === "espejo" ? "Espejo" : form.frente === "vidrio" ? "Vidrio" : "Sin frente"})`} value={quote.pricingEnabled ? formatCurrency(quote.subtotalVidrio) : "-"} />
              <SummaryRow label={`${selectedFondo.nombre} m2`} value={`${formatNumber(quote.fondoAreaM2)} m2`} />
              <SummaryRow label={`Fondo (${selectedFondo.nombre})`} value={quote.pricingEnabled ? formatCurrency(quote.subtotalFondo) : "-"} />
              <SummaryRow
                label={`Paspartu (${formatDimensionCm(clampPositiveNumber(form.paspartuMm, 0))})`}
                value={quote.pricingEnabled ? `${selectedPaspartuColor.nombre} · ${formatNumber(quote.paspartuAreaM2)} m2 / ${formatCurrency(quote.subtotalPaspartu)}` : `${selectedPaspartuColor.nombre} · ${formatNumber(quote.paspartuAreaM2)} m2 / -`}
              />
              <SummaryRow label={`Pintado (${selectedPintado.nombre})`} value={quote.pricingEnabled ? formatCurrency(quote.subtotalPintado) : "-"} />
              <SummaryRow
                label={`Armado (${quote.armadoSugerido.etiqueta})`}
                value={quote.pricingEnabled ? formatCurrency(quote.subtotalArmado) : "-"}
              />
              <SummaryRow label="Total estimado" value={quote.pricingEnabled ? formatCurrency(quote.total) : "Pendiente de seleccionar varilla"} strong />
            </div>
          </article>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!quote.pricingEnabled}
              style={{
                padding: "14px 0",
                borderRadius: 16,
                background: quote.pricingEnabled ? "#2d241c" : "#bfb6aa",
                color: "#fffaf3",
                border: "none",
                fontSize: 15,
                fontWeight: 800,
                cursor: quote.pricingEnabled ? "pointer" : "not-allowed",
                letterSpacing: "0.02em",
                opacity: quote.pricingEnabled ? 1 : 0.72,
              }}
            >
              Imprimir presupuesto
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              style={{ padding: "14px 0", borderRadius: 16, background: "#25d366", color: "#fff", border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.02em" }}
            >
              Enviar por WhatsApp
            </button>
          </div>
          <button
            type="button"
            onClick={handleEnviarAGenerarPedido}
            disabled={!quote.pricingEnabled}
            style={{
              padding: "14px 18px",
              borderRadius: 16,
              background: quote.pricingEnabled ? "#c59257" : "#d6cdc2",
              color: quote.pricingEnabled ? "#2d241c" : "#7f7469",
              border: "none",
              fontSize: 15,
              fontWeight: 900,
              cursor: quote.pricingEnabled ? "pointer" : "not-allowed",
              letterSpacing: "0.02em",
            }}
          >
            Enviar a generar pedido
          </button>
        </div>
      </section>
    </div>
  );
}
