import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import "../../css/cotizador-cortes.css";
import { trackModuleUsage } from "../../services/estadisticas";

const MATERIALES = [
  {
    grupo: "Fibro Fácil (MDF)",
    items: [
      { nombre: "Fibro Fácil 3 mm", precioM2: 12004, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 5 mm", precioM2: 15920, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 9 mm", precioM2: 22183, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 12 mm", precioM2: 27687, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 15 mm", precioM2: 34079, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 18 mm", precioM2: 40959, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
    ],
  },
  {
    grupo: "Tablero de Pino",
    items: [
      { nombre: "Tablero Pino 15 mm", precioM2: 63349, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
      { nombre: "Tablero Pino 18 mm", precioM2: 79325.2, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
      { nombre: "Tablero Pino 21 mm", precioM2: 88139, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
      { nombre: "Tablero Pino 30 mm", precioM2: 117313, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
    ],
  },
  {
    grupo: "Fenólico",
    items: [
      { nombre: "Fenólico 8 mm", precioM2: 34354.8, imagen: "https://surmaderas.com/cotizador/imagenes/fenolico.jpg", descripcion: "Tablero contrachapado con resina fenólica. Muy resistente a la humedad, usado en construcciones exteriores y encofrados." },
      { nombre: "Fenólico 12 mm", precioM2: 47104.4, imagen: "https://surmaderas.com/cotizador/imagenes/fenolico.jpg", descripcion: "Tablero contrachapado con resina fenólica. Muy resistente a la humedad, usado en construcciones exteriores y encofrados." },
      { nombre: "Fenólico 18 mm", precioM2: 58095.4, imagen: "https://surmaderas.com/cotizador/imagenes/fenolico.jpg", descripcion: "Tablero contrachapado con resina fenólica. Muy resistente a la humedad, usado en construcciones exteriores y encofrados." },
    ],
  },
  {
    grupo: "Pizarrones",
    items: [
      { nombre: "Pizarrón Negro", precioM2: 42288.1, imagen: "https://surmaderas.com/cotizador/imagenes/pizarron.jpg", descripcion: "Superficie recubierta con pintura especial para tiza. Para pizarrones escolares o domésticos." },
      { nombre: "Pizarrón Verde", precioM2: 42288.1, imagen: "https://surmaderas.com/cotizador/imagenes/pizarron.jpg", descripcion: "Superficie recubierta con pintura especial para tiza. Para pizarrones escolares o domésticos." },
    ],
  },
  {
    grupo: "Otros materiales",
    items: [
      { nombre: "Fibro Plus Blanco/Negro", precioM2: 18503, imagen: "https://surmaderas.com/cotizador/imagenes/fibroplus.jpg", descripcion: "MDF recubierto en laminado blanco o negro. Superficie lisa y fácil de limpiar, ideal para muebles." },
      { nombre: "OSB 10 mm", precioM2: 42938.4, imagen: "https://surmaderas.com/cotizador/imagenes/fibroplus.jpg", descripcion: "Tablero de virutas orientadas (OSB). Resistente, económico, con aspecto rústico. Usado en paredes, techos y suelos." },
      { nombre: "Terciado 3 mm", precioM2: 21867.3, imagen: "https://surmaderas.com/cotizador/imagenes/terciado.jpg", descripcion: "Tablero contrachapado delgado, ligero y flexible. Para revestimientos y aplicaciones sin gran demanda estructural." },
      { nombre: "Melamina Blanca 18 mm", precioM2: 40715.1, imagen: "https://surmaderas.com/cotizador/imagenes/melamina.jpg", descripcion: "Tablero de aglomerado con melamina blanca. Resistente, fácil de limpiar. Para muebles modulares." },
      { nombre: "Melamina Negra 18 mm", precioM2: 47497, imagen: "https://surmaderas.com/cotizador/imagenes/melamina.jpg", descripcion: "Tablero de aglomerado con melamina negra. Resistente, fácil de limpiar. Para muebles modulares." },
      { nombre: "Chapadur Perforado 3 mm", precioM2: 43734.6, imagen: "https://surmaderas.com/cotizador/imagenes/chapadur.jpg", descripcion: "Madera dura perforada para paneles decorativos y organización de herramientas. Liviana y versátil." },
      { nombre: "Vidrio 2 mm a Medida", precioM2: 33582, imagen: "https://surmaderas.com/cotizador/imagenes/vidrio.jpg", descripcion: "Vidrio fino transparente cortado a medida. Para ventanas, puertas y divisorias." },
      { nombre: "Espejo 3 mm a Medida", precioM2: 59166, imagen: "https://surmaderas.com/cotizador/imagenes/espejo.jpg", descripcion: "Espejo de grosor fino cortado a medida. Para decoración y uso funcional." },
    ],
  },
];

function formatARS(n) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const ALL_MATERIALES = MATERIALES.flatMap((grupo) => grupo.items);
const MATERIAL_FAMILIAS = [
  { key: "fibro-facil", aliases: ["fibro facil", "fibrofacil", "fibrofácil", "fibro fácil", "mdf"], matchName: ["fibro", "facil"] },
  { key: "pino", aliases: ["tablero pino", "pino"], matchName: ["pino"] },
  { key: "fenolico", aliases: ["fenolico", "fenólico"], matchName: ["fenolico"] },
  { key: "pizarron", aliases: ["pizarron", "pizarrón"], matchName: ["pizarron"] },
  { key: "fibro-plus", aliases: ["fibro plus", "fibroplus"], matchName: ["fibro", "plus"] },
  { key: "osb", aliases: ["osb"], matchName: ["osb"] },
  { key: "terciado", aliases: ["terciado"], matchName: ["terciado"] },
  { key: "melamina-blanca", aliases: ["melamina blanca", "melamina blanco"], matchName: ["melamina", "blanca"] },
  { key: "melamina-negra", aliases: ["melamina negra", "melamina negro"], matchName: ["melamina", "negra"] },
  { key: "chapadur", aliases: ["chapadur", "chapadur perforado"], matchName: ["chapadur"] },
  { key: "vidrio", aliases: ["vidrio"], matchName: ["vidrio"] },
  { key: "espejo", aliases: ["espejo"], matchName: ["espejo"] },
];

const MATERIAL_ALIAS_EXTRA = {
  "fibro-facil": ["fibro", "fibrof", "m d f"],
  pino: ["tablero", "tablero de pino", "madera pino", "madera de pino"],
  fenolico: ["terciado fenolico", "fenol"],
  pizarron: ["pizarra"],
  "fibro-plus": ["fibro blanco", "fibro negro", "mdf blanco", "mdf negro"],
  osb: ["placa osb", "tablero osb"],
  terciado: ["terciada", "contrachapado", "enchapado"],
  "melamina-blanca": ["melamina", "melamina bl"],
  "melamina-negra": ["melamina ng"],
  chapadur: ["chapa dura", "hardboard"],
  vidrio: ["cristal"],
};

MATERIAL_FAMILIAS.forEach((familia) => {
  familia.aliases.push(...(MATERIAL_ALIAS_EXTRA[familia.key] || []));
});

const MATERIAL_FAMILIA_BY_KEY = Object.fromEntries(MATERIAL_FAMILIAS.map((familia) => [familia.key, familia]));

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function nombreMaterialNormalizado(material) {
  return normalizeText(material.nombre)
    .replace(/\bfa cil\b/g, "facil")
    .replace(/\bfen lico\b/g, "fenolico")
    .replace(/\bpizarr n\b/g, "pizarron");
}

function parseNumero(value) {
  const parsed = parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function calcularCorte(material, largoCm, anchoCm, cantidadValue) {
  const precioM2 = material.precioM2;
  const minCosto = (10 * 10 * precioM2) / 10000;
  const area = (largoCm / 100) * (anchoCm / 100);
  const costoUnd = Math.max(area * precioM2, minCosto);
  const subtotal = costoUnd * cantidadValue;
  return { costoUnd, subtotal };
}

function extraerEspesorMm(linea) {
  const normalizedLine = normalizeText(linea);
  const match = normalizedLine.match(/(?:espesor|espero|esp|e)\s*(?:de)?\s*(\d+(?:[.,]\d+)?)\s*mm\b/)
    || normalizedLine.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/)
    || normalizedLine.match(/\b(?:fibro|mdf|tablero|pino|fenolico|pizarron|melamina|chapadur|terciado|osb)\s*(?:de)?\s*(\d+(?:[.,]\d+)?)\b/)
    || normalizedLine.match(/(?:espesor|espero|esp|e)\s*(?:de)?\s*(\d+(?:[.,]\d+)?)\b/);
  return match ? parseNumero(match[1]) : 0;
}

function materialTieneEspesor(material, espesorMm) {
  if (!espesorMm) return false;
  return nombreMaterialNormalizado(material).includes(`${espesorMm} mm`);
}

function detectarFamiliaEnTexto(linea) {
  const normalizedLine = normalizeText(linea);
  const compactLine = compactText(linea);

  if (/\bosb\b/.test(normalizedLine)) return MATERIAL_FAMILIA_BY_KEY.osb;
  if (/\b(fibro|mdf)\b/.test(normalizedLine) && /\b(plus|blanco|negro)\b/.test(normalizedLine)) {
    return MATERIAL_FAMILIA_BY_KEY["fibro-plus"];
  }
  if (/\b(fibro|mdf)\b/.test(normalizedLine)) return MATERIAL_FAMILIA_BY_KEY["fibro-facil"];
  if (/\b(tablero|pino)\b/.test(normalizedLine)) return MATERIAL_FAMILIA_BY_KEY.pino;
  if (/\bmelamina\b/.test(normalizedLine) && /\b(negra|negro|ng)\b/.test(normalizedLine)) {
    return MATERIAL_FAMILIA_BY_KEY["melamina-negra"];
  }
  if (/\bmelamina\b/.test(normalizedLine)) return MATERIAL_FAMILIA_BY_KEY["melamina-blanca"];

  const matches = MATERIAL_FAMILIAS.flatMap((familia) => (
    familia.aliases.map((alias) => {
      const normalizedAlias = normalizeText(alias);
      const compactAlias = compactText(alias);
      const matchesAlias = normalizedLine.includes(normalizedAlias) || compactLine.includes(compactAlias);
      return matchesAlias ? { familia, weight: compactAlias.length } : null;
    }).filter(Boolean)
  ));

  return matches.sort((a, b) => b.weight - a.weight)[0]?.familia || null;
}

function detectarFamiliaDeMaterial(material) {
  const normalizedName = nombreMaterialNormalizado(material);
  return MATERIAL_FAMILIAS.find((familia) => (
    familia.matchName.every((token) => normalizedName.includes(token))
  )) || null;
}

function materialesDeFamilia(familia) {
  if (!familia) return [];
  return ALL_MATERIALES.filter((material) => {
    const normalizedName = nombreMaterialNormalizado(material);
    return familia.matchName.every((token) => normalizedName.includes(token));
  });
}

function elegirMaterialPorFamilia(familia, espesorMm, materialFallback) {
  const candidatos = materialesDeFamilia(familia);
  if (candidatos.length === 0) return null;
  if (espesorMm) {
    const exacto = candidatos.find((material) => materialTieneEspesor(material, espesorMm));
    if (exacto) return exacto;
  }
  if (materialFallback) {
    const fallbackEnFamilia = candidatos.find((material) => material.nombre === materialFallback.nombre);
    if (fallbackEnFamilia) return fallbackEnFamilia;
  }
  return candidatos[0];
}

function buscarMaterialEnTexto(linea, materialFallback, espesorFallback = 0) {
  const normalizedLine = normalizeText(linea);
  const compactLine = compactText(linea);
  const espesorLinea = extraerEspesorMm(linea) || espesorFallback;
  const familiaTexto = detectarFamiliaEnTexto(linea);
  const familiaFallback = materialFallback ? detectarFamiliaDeMaterial(materialFallback) : null;
  const materialPorFamilia = elegirMaterialPorFamilia(familiaTexto || familiaFallback, espesorLinea, materialFallback);

  if (familiaTexto && materialPorFamilia) return materialPorFamilia;
  if (!familiaTexto && materialPorFamilia) return materialPorFamilia;

  const scored = ALL_MATERIALES.map((material) => {
    const normalizedName = nombreMaterialNormalizado(material);
    const compactName = nombreMaterialNormalizado(material).replace(/\s+/g, "").replace(/\d+mm$/, "");
    const tokens = normalizedName.split(" ").filter((token) => token.length > 1 && token !== "mm");
    let score = tokens.reduce((acc, token) => acc + (normalizedLine.includes(token) ? 1 : 0), 0);
    if (compactName && compactLine.includes(compactName)) score += 2;
    if (espesorLinea && materialTieneEspesor(material, espesorLinea)) score += 3;
    if (espesorLinea && !materialTieneEspesor(material, espesorLinea)) score -= 2;
    return { material, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.material.nombre.length - a.material.nombre.length);

  if (scored[0]?.score >= 2) return scored[0].material;
  if (materialPorFamilia) return materialPorFamilia;
  return materialFallback || null;
}

function extraerCantidad(linea, dimensionMatch) {
  const before = linea.slice(0, dimensionMatch.index).trim();
  const after = linea.slice(dimensionMatch.index + dimensionMatch[0].length).trim();
  const explicitAfter = after.match(/(?:cant(?:idad)?|cantidad|unidades|unidad|uds?|u)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  const explicitBefore = before.match(/(?:cant(?:idad)?|cantidad|unidades|unidad|uds?|u)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  const compactAfter = after.match(/^\s*(?:x|\*)\s*(\d+(?:[.,]\d+)?)(?:\s*(?:u|ud|uds|unidades?))?\b/i);
  const leading = before.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:u|ud|uds|unidades?|cortes?|piezas?)?\b/i);
  const trailing = after.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:u|ud|uds|unidades?|cortes?|piezas?)\b/i);
  const value = explicitAfter?.[1] || explicitBefore?.[1] || compactAfter?.[1] || leading?.[1] || trailing?.[1];
  return Math.max(1, parseNumero(value) || 1);
}

function parsearLineaCorte(linea, materialFallback, espesorFallback = 0) {
  const tripleCantidadSimple = linea.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:u|ud|uds|unidades?|cortes?|piezas?)?\s*(?:x|X|\*|por)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\s*(?:x|X|\*|por)\s*(\d+(?:[.,]\d+)?)(?:\s*(cm|mm))?/);
  if (tripleCantidadSimple) {
    const cantidadValue = Math.max(1, parseNumero(tripleCantidadSimple[1]) || 1);
    let largoCm = parseNumero(tripleCantidadSimple[2]);
    let anchoCm = parseNumero(tripleCantidadSimple[3]);
    const unidad = String(tripleCantidadSimple[4] || "").toLowerCase();
    if (unidad === "mm" || /\bmm\b/i.test(tripleCantidadSimple[0])) {
      largoCm /= 10;
      anchoCm /= 10;
    }

    const material = buscarMaterialEnTexto(linea, materialFallback, espesorFallback);
    if (!material) return { error: "No se encontro material y no hay material seleccionado." };
    if (largoCm <= 0 || anchoCm <= 0 || cantidadValue <= 0) return { error: "Medidas o cantidad invalidas." };

    const { costoUnd, subtotal } = calcularCorte(material, largoCm, anchoCm, cantidadValue);
    return {
      corte: {
        id: nextId++,
        cantidad: cantidadValue,
        material: material.nombre,
        largo: largoCm,
        ancho: anchoCm,
        costoUnd,
        subtotal,
        origen: "texto",
      },
    };
  }
  const tripleMatch = linea.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:u|ud|uds|unidades?|cortes?|piezas?)?\s*(?:x|X|Ã—|\*|por)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\s*(?:x|X|Ã—|\*|por)\s*(\d+(?:[.,]\d+)?)(?:\s*(cm|mm))?/);
  const dimensionMatch = linea.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\s*(?:x|X|×|\*|por)\s*(\d+(?:[.,]\d+)?)(?:\s*(cm|mm))?/);
  if (!dimensionMatch) return { error: "No se encontro una medida tipo 120x60." };

  let cantidadValue = 0;
  let largoCm = 0;
  let anchoCm = 0;
  let unidad = "";

  if (tripleMatch) {
    cantidadValue = Math.max(1, parseNumero(tripleMatch[1]) || 1);
    largoCm = parseNumero(tripleMatch[2]);
    anchoCm = parseNumero(tripleMatch[3]);
    unidad = String(tripleMatch[4] || "").toLowerCase();
  } else {
    largoCm = parseNumero(dimensionMatch[1]);
    anchoCm = parseNumero(dimensionMatch[2]);
    unidad = String(dimensionMatch[3] || "").toLowerCase();
    cantidadValue = extraerCantidad(linea, dimensionMatch);
  }
  if (unidad === "mm" || /\bmm\b/i.test(dimensionMatch[0])) {
    largoCm /= 10;
    anchoCm /= 10;
  }

  const material = buscarMaterialEnTexto(linea, materialFallback, espesorFallback);

  if (!material) return { error: "No se encontro material y no hay material seleccionado." };
  if (largoCm <= 0 || anchoCm <= 0 || cantidadValue <= 0) return { error: "Medidas o cantidad invalidas." };

  const { costoUnd, subtotal } = calcularCorte(material, largoCm, anchoCm, cantidadValue);
  return {
    corte: {
      id: nextId++,
      cantidad: cantidadValue,
      material: material.nombre,
      largo: largoCm,
      ancho: anchoCm,
      costoUnd,
      subtotal,
      origen: "texto",
    },
  };
}

function lineaTieneMedida(linea) {
  return /(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\s*(?:x|X|Ã—|\*|por)\s*(\d+(?:[.,]\d+)?)/.test(linea);
}

function parsearTextoCortes(texto, materialFallback) {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);
  const espesorGlobal = lineas.reduce((acc, linea) => acc || extraerEspesorMm(linea), 0);
  let materialContexto = materialFallback || null;

  lineas.forEach((linea) => {
    if (lineaTieneMedida(linea)) return;
    const materialDetectado = buscarMaterialEnTexto(linea, materialContexto, espesorGlobal);
    if (materialDetectado) materialContexto = materialDetectado;
  });

  const nuevos = [];
  const errores = [];
  lineas.forEach((linea, index) => {
    if (!lineaTieneMedida(linea)) return;
    const materialLinea = buscarMaterialEnTexto(linea, materialContexto, espesorGlobal);
    const parsed = parsearLineaCorte(linea, materialLinea, espesorGlobal);
    if (parsed.corte) nuevos.push(parsed.corte);
    else errores.push(`Linea ${index + 1}: ${parsed.error}`);
  });

  if (nuevos.length === 0 && errores.length === 0) {
    errores.push("No se encontro ninguna medida tipo 120x60.");
  }

  return { nuevos, errores, totalLineas: lineas.length };
}

function esArchivoTexto(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return type.startsWith("text/")
    || type.includes("csv")
    || name.endsWith(".txt")
    || name.endsWith(".csv")
    || name.endsWith(".tsv");
}

function sanitizeFileName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, maxWidth, maxLines = Infinity) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) lines.push("");
  if (words.length > 0 && lines.length === maxLines) {
    let trimmed = lines[maxLines - 1];
    while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    lines[maxLines - 1] = `${trimmed}...`;
  }
  return lines;
}

function canvasToPngFile(canvas, fileName) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo generar la imagen PNG."));
        return;
      }
      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyPngToClipboard(file) {
  if (!(navigator.clipboard && window.ClipboardItem)) return false;
  try {
    await navigator.clipboard.write([
      new window.ClipboardItem({ [file.type]: file }),
    ]);
    return true;
  } catch {
    return false;
  }
}

let nextId = 1;

export default function CotizadorCortes() {
  useEffect(() => {
    trackModuleUsage("Cotizador de cortes", "cotizadores");
  }, []);

  const [materialKey, setMaterialKey] = useState("");
  const [largo, setLargo] = useState("");
  const [ancho, setAncho] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaRetiro, setFechaRetiro] = useState("");
  const [observacionesRetiro, setObservacionesRetiro] = useState("");
  const [cortes, setCortes] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [editandoCorteId, setEditandoCorteId] = useState(null);
  const [corteEditado, setCorteEditado] = useState({ material: "", largo: "", ancho: "", cantidad: "" });
  const [costoActual, setCostoActual] = useState(null);
  const [textoMasivo, setTextoMasivo] = useState("");
  const [resultadoMasivo, setResultadoMasivo] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [audioStatus, setAudioStatus] = useState("");
  const [escuchandoAudio, setEscuchandoAudio] = useState(false);
  const [leyendoImagen, setLeyendoImagen] = useState(false);
  const [cortesDetectados, setCortesDetectados] = useState([]);
  const recognitionRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const materialSeleccionado = useMemo(() => {
    if (!materialKey) return null;
    for (const grupo of MATERIALES) {
      const found = grupo.items.find((m) => m.nombre === materialKey);
      if (found) return found;
    }
    return null;
  }, [materialKey]);

  const total = useMemo(
    () => cortes.reduce((acc, c) => acc + c.subtotal, 0),
    [cortes]
  );

  const totalPiezas = useMemo(
    () => cortes.reduce((acc, c) => acc + Number(c.cantidad || 0), 0),
    [cortes]
  );

  function getMaterialByName(nombre) {
    return ALL_MATERIALES.find((material) => material.nombre === nombre) || null;
  }

  function calcular() {
    const l = parseFloat(largo);
    const a = parseFloat(ancho);
    const q = parseFloat(cantidad);

    if (!materialSeleccionado || isNaN(l) || isNaN(a) || isNaN(q) || q <= 0) {
      alert("Por favor, seleccioná un material e ingresá largo, ancho y cantidad.");
      return;
    }

    const { costoUnd, subtotal } = calcularCorte(materialSeleccionado, l, a, q);

    setCostoActual(subtotal);
    setCortes((prev) => [
      ...prev,
      { id: nextId++, cantidad: q, material: materialSeleccionado.nombre, largo: l, ancho: a, costoUnd, subtotal },
    ]);
    setLargo("");
    setAncho("");
    setCantidad("");
  }

  function revisarTextoMasivo(textoOrigen = textoMasivo) {
    const textoARevisar = typeof textoOrigen === "string" ? textoOrigen : textoMasivo;
    const lineas = textoARevisar
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    if (lineas.length === 0) {
      alert("Pegá una lista de cortes para cargar.");
      return;
    }

    const { nuevos, errores } = parsearTextoCortes(textoARevisar, materialSeleccionado);

    setCortesDetectados(nuevos.map((corte) => ({ ...corte, tempId: corte.id })));

    setResultadoMasivo(
      `${nuevos.length} cortes detectados${errores.length ? ` / ${errores.length} sin interpretar` : ""}.`
    );

    if (errores.length > 0) {
      alert(`Se detectaron ${nuevos.length} cortes.\n\nRevisar:\n${errores.slice(0, 6).join("\n")}`);
    }
  }

  function actualizarCorteDetectado(tempId, patch) {
    setCortesDetectados((prev) => prev.map((corte) => (
      corte.tempId === tempId ? { ...corte, ...patch } : corte
    )));
  }

  function eliminarCorteDetectado(tempId) {
    setCortesDetectados((prev) => prev.filter((corte) => corte.tempId !== tempId));
  }

  function confirmarCortesDetectados() {
    if (cortesDetectados.length === 0) {
      alert("Primero interpretá una lista de cortes.");
      return;
    }

    const nuevos = [];
    for (const corte of cortesDetectados) {
      const material = getMaterialByName(corte.material);
      const l = parseNumero(corte.largo);
      const a = parseNumero(corte.ancho);
      const q = parseNumero(corte.cantidad);

      if (!material || l <= 0 || a <= 0 || q <= 0) {
        alert("Revisá material, medidas y cantidad antes de agregar los cortes.");
        return;
      }

      const { costoUnd, subtotal } = calcularCorte(material, l, a, q);
      nuevos.push({
        id: nextId++,
        cantidad: q,
        material: material.nombre,
        largo: l,
        ancho: a,
        costoUnd,
        subtotal,
        origen: "revisado",
      });
    }

    setCortes((prev) => [...prev, ...nuevos]);
    setCostoActual(nuevos.reduce((acc, corte) => acc + corte.subtotal, 0));
    setCortesDetectados([]);
    setResultadoMasivo(`${nuevos.length} cortes agregados a la cotizacion.`);
  }

  async function leerImagenCortes(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLeyendoImagen(true);
    setOcrStatus("Leyendo imagen...");

    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "spa+eng", {
        logger: (info) => {
          if (info.status === "recognizing text" && info.progress) {
            setOcrStatus(`Leyendo imagen ${Math.round(info.progress * 100)}%`);
          }
        },
      });
      const text = result?.data?.text?.trim() || "";
      if (!text) {
        setOcrStatus("No se detecto texto en la imagen.");
        return;
      }
      setTextoMasivo((prev) => [prev.trim(), text].filter(Boolean).join("\n"));
      setOcrStatus("Texto detectado. Revisalo y toca Cargar lista.");
    } catch (error) {
      console.error(error);
      setOcrStatus("No se pudo leer la imagen. Probá con una foto mas nitida.");
    } finally {
      setLeyendoImagen(false);
      event.target.value = "";
    }
  }

  function agregarTextoDetectado(text, mensaje = "Texto detectado. Revisalo y toca Cargar lista.") {
    const cleanText = String(text || "").trim();
    if (!cleanText) {
      setOcrStatus("No se detecto texto util.");
      return;
    }

    setTextoMasivo((prev) => [prev.trim(), cleanText].filter(Boolean).join("\n"));
    setOcrStatus(mensaje);
  }

  function iniciarCargaPorAudio() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setAudioStatus("Tu navegador no permite dictado por voz. Probá con Chrome o Edge.");
      return;
    }

    if (escuchandoAudio) {
      recognitionRef.current?.stop?.();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = true;
    recognition.continuous = true;

    let textoFinal = "";
    let ultimoTexto = "";
    setAudioStatus("Escuchando... dictá material, medidas y cantidad.");
    setEscuchandoAudio(true);

    recognition.onresult = (event) => {
      let textoParcial = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) textoFinal += `${transcript}\n`;
        else textoParcial += transcript;
      }

      const text = [textoFinal.trim(), textoParcial.trim()].filter(Boolean).join("\n");
      if (text) {
        ultimoTexto = text;
        setTextoMasivo(text);
        setAudioStatus(textoParcial ? `Escuchando: ${textoParcial}` : "Texto de audio detectado.");
      }
    };

    recognition.onerror = (event) => {
      const message = event?.error === "not-allowed"
        ? "Permiso de micrófono denegado."
        : "No se pudo escuchar el audio. Probá de nuevo.";
      setAudioStatus(message);
      setEscuchandoAudio(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setEscuchandoAudio(false);
      recognitionRef.current = null;
      const cleanText = (textoFinal.trim() || ultimoTexto.trim());
      if (cleanText) {
        setTextoMasivo(cleanText);
        revisarTextoMasivo(cleanText);
        setAudioStatus("Audio interpretado. Revisá los cortes detectados antes de agregarlos.");
      } else {
        setAudioStatus((current) => (
          current && !current.startsWith("Escuchando") ? current : "No se detectó texto en el audio."
        ));
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function leerImagenArchivo(file) {
    if (!file) return;

    setLeyendoImagen(true);
    setOcrStatus("Leyendo imagen...");

    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "spa+eng", {
        logger: (info) => {
          if (info.status === "recognizing text" && info.progress) {
            setOcrStatus(`Leyendo imagen ${Math.round(info.progress * 100)}%`);
          }
        },
      });
      const text = result?.data?.text?.trim() || "";
      if (!text) {
        setOcrStatus("No se detecto texto en la imagen.");
        return;
      }
      agregarTextoDetectado(text);
    } catch (error) {
      console.error(error);
      setOcrStatus("No se pudo leer la imagen. Proba con una foto mas nitida.");
    } finally {
      setLeyendoImagen(false);
    }
  }

  async function procesarArchivoEntrada(file) {
    if (!file) return;

    if (String(file.type || "").startsWith("image/")) {
      await leerImagenArchivo(file);
      return;
    }

    if (esArchivoTexto(file)) {
      try {
        setLeyendoImagen(true);
        setOcrStatus("Leyendo documento...");
        const text = await file.text();
        agregarTextoDetectado(text, "Documento leido. Revisalo y toca Cargar lista.");
      } catch (error) {
        console.error(error);
        setOcrStatus("No se pudo leer el documento.");
      } finally {
        setLeyendoImagen(false);
      }
      return;
    }

    setOcrStatus("Formato no compatible. Subi imagen, TXT, CSV o TSV; para PDF/Word copia el texto o pega una captura.");
  }

  async function leerArchivoCortes(event) {
    const file = event.target.files?.[0];
    await procesarArchivoEntrada(file);
    event.target.value = "";
  }

  async function pegarDesdePortapapeles() {
    try {
      if (!navigator.clipboard?.read) {
        setOcrStatus("Tu navegador no permite leer el portapapeles con este boton. Proba Ctrl+V sobre el cuadro.");
        return;
      }

      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((candidate) => candidate.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          await leerImagenArchivo(new File([blob], "cortes-pegados.png", { type: imageType }));
          return;
        }

        const textType = item.types.find((candidate) => candidate === "text/plain" || candidate.startsWith("text/"));
        if (textType) {
          const blob = await item.getType(textType);
          agregarTextoDetectado(await blob.text(), "Texto pegado desde el portapapeles.");
          return;
        }
      }

      setOcrStatus("No encontramos texto ni imagen en el portapapeles.");
    } catch (error) {
      console.error(error);
      setOcrStatus("No se pudo pegar desde el portapapeles. Proba Ctrl+V sobre el cuadro.");
    }
  }

  async function handleTextoMasivoPaste(event) {
    const files = Array.from(event.clipboardData?.files || []);
    const imageOrTextFile = files.find((file) => String(file.type || "").startsWith("image/") || esArchivoTexto(file));
    if (imageOrTextFile) {
      event.preventDefault();
      await procesarArchivoEntrada(imageOrTextFile);
      return;
    }

    const pastedText = event.clipboardData?.getData("text/plain");
    if (pastedText?.trim()) {
      setOcrStatus("Texto pegado. Revisalo y toca Cargar lista.");
    }
  }

  function toggleSeleccion(id) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function iniciarEdicionCorte(corte) {
    setEditandoCorteId(corte.id);
    setCorteEditado({
      material: corte.material,
      largo: String(corte.largo || ""),
      ancho: String(corte.ancho || ""),
      cantidad: String(corte.cantidad || ""),
    });
  }

  function cancelarEdicionCorte() {
    setEditandoCorteId(null);
    setCorteEditado({ material: "", largo: "", ancho: "", cantidad: "" });
  }

  function guardarEdicionCorte() {
    const material = getMaterialByName(corteEditado.material);
    const l = parseNumero(corteEditado.largo);
    const a = parseNumero(corteEditado.ancho);
    const q = parseNumero(corteEditado.cantidad);

    if (!material || l <= 0 || a <= 0 || q <= 0) {
      alert("Revisa material, largo, ancho y cantidad antes de guardar.");
      return;
    }

    const { costoUnd, subtotal } = calcularCorte(material, l, a, q);
    setCortes((prev) => prev.map((corte) => (
      corte.id === editandoCorteId
        ? { ...corte, material: material.nombre, largo: l, ancho: a, cantidad: q, costoUnd, subtotal }
        : corte
    )));
    setCostoActual(subtotal);
    cancelarEdicionCorte();
  }

  function eliminarSeleccionados() {
    if (seleccionados.size === 0) {
      alert("Seleccioná al menos una fila para eliminar.");
      return;
    }
    setCortes((prev) => prev.filter((c) => !seleccionados.has(c.id)));
    if (seleccionados.has(editandoCorteId)) {
      cancelarEdicionCorte();
    }
    setSeleccionados(new Set());
  }

  function construirTextoMisCortes() {
    const lines = [
      "Cotizacion de cortes - Sur Maderas",
      "",
      ...cortes.flatMap((c, index) => [
        `Corte ${index + 1}`,
        `Material: ${c.material}`,
        `Medida: ${c.largo} x ${c.ancho} cm`,
        `Cantidad: ${c.cantidad}`,
        `$ / unidad: $ ${formatARS(c.costoUnd)}`,
        `Subtotal: $ ${formatARS(c.subtotal)}`,
        "",
      ]),
      "",
      `Total piezas: ${formatARS(totalPiezas).replace(",00", "")}`,
      `Total: $ ${formatARS(total)}`,
    ];

    return lines.join("\n");
  }

  async function copiarTablaMisCortes() {
    if (cortes.length === 0) {
      alert("No hay cortes cargados para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(construirTextoMisCortes());
      alert("Tabla de cortes copiada. Ya podes pegarla en un mensaje.");
    } catch {
      alert("No se pudo copiar automaticamente. Probalo de nuevo desde un navegador con permisos de portapapeles.");
    }
  }

  function imprimir() {
    const contenido = tableRef.current?.outerHTML ?? "";
    const v = window.open("", "_blank");
    v.document.write(
      `<html><head><title>Cotización Sur Maderas</title><style>
        body{font-family:Arial,sans-serif;padding:20px;}
        table{border-collapse:collapse;width:100%;font-size:13px;}
        th,td{border:1px solid #ddd;padding:10px;text-align:center;}
        thead th{background:#0A0A0A;color:white;}
        tfoot{background:#f5f5f5;font-weight:bold;}
        .cc-noprint{display:none;}
      </style></head><body>
        <h2>Cotización de cortes — Sur Maderas</h2>
        <p style="color:#666;font-size:12px;">Av. Luro 5020 / Av. Independencia 4490 — Mar del Plata</p>
        <br>${contenido}
      </body></html>`
    );
    v.document.close();
    v.focus();
    v.print();
    v.close();
  }

  function exportarPDF() {
    if (cortes.length === 0) {
      alert("No hay cortes cargados para exportar.");
      return;
    }
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Cotización de cortes — Sur Maderas", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Av. Luro 5020 / Av. Independencia 4490 — Mar del Plata", 14, 28);
    doc.setTextColor(0);

    const headers = ["Cant.", "Material", "Medida", "$ / unidad", "Subtotal"];
    const colWidths = [16, 64, 38, 30, 30];
    let y = 40;
    const rowH = 9;

    doc.setFillColor(10, 10, 10);
    doc.rect(14, y, pageW - 28, rowH, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x + colWidths[i] / 2, y + 6.2, { align: "center" });
      x += colWidths[i];
    });
    y += rowH;

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    cortes.forEach((c, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 247, 245);
        doc.rect(14, y, pageW - 28, rowH, "F");
      }
      const cells = [
        String(c.cantidad),
        c.material,
        `${c.largo} x ${c.ancho} cm`,
        `$ ${formatARS(c.costoUnd)}`,
        `$ ${formatARS(c.subtotal)}`,
      ];
      x = 14;
      cells.forEach((cell, i) => {
        doc.text(cell, x + colWidths[i] / 2, y + 6.2, { align: "center", maxWidth: colWidths[i] - 2 });
        x += colWidths[i];
      });
      y += rowH;
    });

    doc.setFillColor(248, 247, 245);
    doc.rect(14, y, pageW - 28, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const totalX = 14 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    doc.text("Total", totalX - 4, y + 6.2, { align: "right" });
    doc.text(`$ ${formatARS(total)}`, totalX + colWidths[4] / 2, y + 6.2, { align: "center" });

    doc.save("cotizacion-cortes-surmaderas.pdf");
  }

  function generarNumeroComprobante() {
    const stamp = new Date();
    const datePart = [
      stamp.getFullYear(),
      String(stamp.getMonth() + 1).padStart(2, "0"),
      String(stamp.getDate()).padStart(2, "0"),
    ].join("");
    const timePart = [
      String(stamp.getHours()).padStart(2, "0"),
      String(stamp.getMinutes()).padStart(2, "0"),
    ].join("");
    return `CC-${datePart}-${timePart}`;
  }

  async function exportarComprobanteRetiro() {
    if (cortes.length === 0) {
      alert("No hay cortes cargados para generar el comprobante.");
      return;
    }

    if (!cliente.trim()) {
      alert("Cargá el nombre del cliente para generar el comprobante de retiro.");
      return;
    }

    const comprobanteNro = generarNumeroComprobante();
    const brand = {
      accent: "#c8603a",
      accentDark: "#a84e2c",
      navy: "#070614",
      bg: "#f8f7f5",
      line: "#e8e5e0",
      text: "#2c2c2c",
      muted: "#888580",
      white: "#ffffff",
    };
    const fechaEmision = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const width = 1200;
    const padding = 64;
    const rowH = 58;
    const tableHeaderH = 46;
    const obsText = observacionesRetiro.trim() || "Sin observaciones.";
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    measureCtx.font = "26px Arial";
    const obsLines = wrapCanvasText(measureCtx, obsText, width - padding * 2, 6);
    const contentHeight = 650 + cortes.length * rowH + obsLines.length * 40;
    const height = Math.max(820, contentHeight);
    const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = brand.white;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = brand.navy;
    ctx.fillRect(0, 0, width, 118);
    ctx.fillStyle = brand.accent;
    ctx.fillRect(0, 108, width, 10);

    ctx.fillStyle = brand.white;
    ctx.font = "700 36px Arial";
    ctx.fillText("Comprobante para retiro de cortes", padding, 52);
    ctx.font = "400 20px Arial";
    ctx.fillText("Sur Maderas - Av. Luro 5020 / Av. Independencia 4490 - Mar del Plata", padding, 86);
    ctx.textAlign = "right";
    ctx.font = "700 22px Arial";
    ctx.fillText(comprobanteNro, width - padding, 52);
    ctx.font = "400 20px Arial";
    ctx.fillText(fechaEmision, width - padding, 86);
    ctx.textAlign = "left";

    let y = 154;
    drawRoundedRect(ctx, padding, y, width - padding * 2, 104, 14);
    ctx.fillStyle = brand.bg;
    ctx.fill();
    ctx.strokeStyle = brand.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = brand.accentDark;
    ctx.font = "700 22px Arial";
    ctx.fillText("Datos del retiro", padding + 24, y + 34);
    ctx.fillStyle = brand.text;
    ctx.font = "400 22px Arial";
    ctx.fillText(`Cliente: ${cliente.trim()}`, padding + 24, y + 68);
    ctx.fillText(`Telefono: ${telefono.trim() || "Sin completar"}`, 660, y + 68);
    ctx.fillText(`Fecha de retiro: ${fechaRetiro || "A coordinar"}`, padding + 24, y + 94);
    ctx.fillText(`Total de piezas: ${formatARS(totalPiezas).replace(",00", "")}`, 660, y + 94);

    y += 138;
    const tableX = padding;
    const tableW = width - padding * 2;
    const columns = [
      { label: "Cant.", x: tableX, w: 110 },
      { label: "Material", x: tableX + 110, w: 560 },
      { label: "Medida", x: tableX + 670, w: 220 },
      { label: "Control", x: tableX + 890, w: tableW - 890 },
    ];

    ctx.fillStyle = brand.accent;
    ctx.fillRect(tableX, y, tableW, tableHeaderH);
    ctx.fillStyle = brand.white;
    ctx.font = "700 19px Arial";
    ctx.textAlign = "center";
    columns.forEach((column) => {
      ctx.fillText(column.label, column.x + column.w / 2, y + 30);
    });
    ctx.textAlign = "left";
    y += tableHeaderH;

    cortes.forEach((c, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? brand.bg : brand.white;
      ctx.fillRect(tableX, y, tableW, rowH);
      ctx.strokeStyle = brand.line;
      ctx.beginPath();
      ctx.moveTo(tableX, y + rowH);
      ctx.lineTo(tableX + tableW, y + rowH);
      ctx.stroke();

      ctx.fillStyle = brand.text;
      ctx.font = "700 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(c.cantidad), columns[0].x + columns[0].w / 2, y + 36);
      ctx.fillText(`${c.largo} x ${c.ancho} cm`, columns[2].x + columns[2].w / 2, y + 36);
      ctx.font = "400 26px Arial";
      ctx.fillText("[  ]", columns[3].x + columns[3].w / 2, y + 38);

      ctx.textAlign = "left";
      ctx.font = "400 21px Arial";
      const materialLines = wrapCanvasText(ctx, c.material, columns[1].w - 32, 2);
      materialLines.forEach((line, lineIndex) => {
        ctx.fillText(line, columns[1].x + 16, y + 25 + lineIndex * 23);
      });
      y += rowH;
    });

    y += 42;
    ctx.fillStyle = brand.accentDark;
    ctx.font = "700 24px Arial";
    ctx.fillText("Observaciones", padding, y);
    y += 34;
    ctx.fillStyle = brand.text;
    ctx.font = "400 23px Arial";
    obsLines.forEach((line) => {
      ctx.fillText(line, padding, y);
      y += 32;
    });

    y += 24;
    drawRoundedRect(ctx, padding, y, width - padding * 2, 72, 14);
    ctx.fillStyle = brand.bg;
    ctx.fill();
    ctx.strokeStyle = brand.line;
    ctx.stroke();
    ctx.fillStyle = brand.accentDark;
    ctx.font = "700 21px Arial";
    ctx.fillText("Control interno", padding + 24, y + 28);
    ctx.fillStyle = brand.text;
    ctx.font = "400 20px Arial";
    ctx.fillText("Marcar cada corte en la columna Control al preparar y entregar el pedido.", padding + 24, y + 56);

    ctx.fillStyle = brand.muted;
    ctx.font = "400 18px Arial";
    ctx.fillText("Presentar este comprobante al retirar. Verificar cantidad, material y medidas antes de entregar.", padding, height - 32);

    try {
      const fileName = `comprobante-retiro-cortes-${sanitizeFileName(comprobanteNro)}.png`;
      const file = await canvasToPngFile(canvas, fileName);
      const copied = await copyPngToClipboard(file);
      downloadFile(file);
      alert(copied
        ? "Comprobante PNG copiado al portapapeles y descargado."
        : "Comprobante PNG descargado. Tu navegador no permitio copiar la imagen automaticamente.");
    } catch (error) {
      console.error(error);
      alert("No se pudo generar el comprobante PNG.");
    }
  }

  function enviarWhatsApp() {
    if (cortes.length === 0) {
      alert("No hay cortes cargados para enviar.");
      return;
    }
    let msg = "📦 *Cotización de cortes — Sur Maderas*%0A";
    cortes.forEach((c, i) => {
      msg += `%0A🔹 *Corte ${i + 1}*%0AMaterial: ${c.material}%0AMedida: ${c.largo} x ${c.ancho} cm%0ACantidad: ${c.cantidad}%0ASubtotal: $${formatARS(c.subtotal)}%0A`;
    });
    msg += `%0A💰 *Total: $${formatARS(total)}*`;
    window.open(`https://wa.me/5492234383262?text=${msg}`, "_blank");
  }

  return (
    <div className="cc-page">
      <div className="cc-hero">
        <div className="cc-kicker">Herramienta de precios</div>
        <h1 className="cc-title">Cotizador de cortes</h1>
        <p className="cc-copy">
          Calculá el precio de tus cortes seleccionando el material y las medidas.
          Podés armar una lista y exportarla o enviarla por WhatsApp.
        </p>
      </div>

      <div className="cc-body">
        {/* PASO 1 */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">01</span>
            <span className="cc-stepLabel">Seleccioná el material</span>
          </div>
          <select
            className="cc-select"
            value={materialKey}
            onChange={(e) => setMaterialKey(e.target.value)}
          >
            <option value="">Ver opciones de material →</option>
            {MATERIALES.map((grupo) => (
              <optgroup key={grupo.grupo} label={grupo.grupo}>
                {grupo.items.map((m) => (
                  <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {materialSeleccionado && (
            <div className="cc-preview">
              <img
                className="cc-previewImg"
                src={materialSeleccionado.imagen}
                alt={materialSeleccionado.nombre}
              />
              <div className="cc-previewText">
                <h4 className="cc-previewName">{materialSeleccionado.nombre}</h4>
                <p className="cc-previewDesc">{materialSeleccionado.descripcion}</p>
                <p className="cc-previewPrice">
                  <strong>$ {formatARS(materialSeleccionado.precioM2)}</strong> / m²
                </p>
              </div>
            </div>
          )}
        </section>

        {/* PASO 2 */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">02</span>
            <span className="cc-stepLabel">Ingresá las medidas</span>
          </div>
          <p className="cc-nota">Usá punto para decimales (ej: 50.5)</p>
          <div className="cc-grid">
            <div className="cc-field">
              <label className="cc-fieldLabel">Largo (cm)</label>
              <input type="number" className="cc-input" placeholder="ej: 240" value={largo} onChange={(e) => setLargo(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Ancho (cm)</label>
              <input type="number" className="cc-input" placeholder="ej: 60" value={ancho} onChange={(e) => setAncho(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Cantidad</label>
              <input type="number" className="cc-input" placeholder="ej: 2" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Precio por m²</label>
              <input
                type="text"
                className="cc-input cc-input--readonly"
                readOnly
                value={materialSeleccionado ? `$ ${formatARS(materialSeleccionado.precioM2)}` : ""}
                placeholder="Se carga al elegir material"
              />
            </div>
          </div>
          <button className="cc-btnCalc" onClick={calcular}>
            Agregar corte →
          </button>
        </section>

        {/* RESULTADO ÚLTIMO CORTE */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">02B</span>
            <span className="cc-stepLabel">Carga rapida por texto o imagen</span>
          </div>
          <p className="cc-nota">
            Puede leer audio, texto, imagenes pegadas o subidas, y documentos TXT/CSV/TSV. Para PDF o Word,
            copiá el texto al cuadro o pegá una captura.
          </p>
          <div className="cc-field">
            <label className="cc-fieldLabel">Lista de cortes</label>
            <textarea
              className="cc-input cc-textarea cc-textarea--bulk"
              placeholder={"De madera Fibrofacil\n40 cm x 80 cm\n20 cm x 20 cm\n25 cm x 45 cm\nTodas del espesor de 5mm"}
              rows={6}
              value={textoMasivo}
              onChange={(e) => setTextoMasivo(e.target.value)}
              onPaste={handleTextoMasivoPaste}
            />
          </div>
          <div className="cc-bulkActions">
            <button
              type="button"
              className={`cc-fileBtn cc-audioBtn${escuchandoAudio ? " is-recording" : ""}`}
              onClick={iniciarCargaPorAudio}
            >
              {escuchandoAudio ? "Detener audio" : "Dictar cortes"}
            </button>
            <button type="button" className="cc-btnCalc cc-btnCalc--inline" onClick={() => revisarTextoMasivo()}>
              Interpretar lista
            </button>
            <button type="button" className="cc-fileBtn" onClick={pegarDesdePortapapeles} disabled={leyendoImagen}>
              Pegar imagen/texto
            </button>
            <label className={`cc-fileBtn${leyendoImagen ? " is-loading" : ""}`}>
              <input type="file" accept="image/*,.txt,.csv,.tsv,text/plain,text/csv,text/tab-separated-values" onChange={leerArchivoCortes} disabled={leyendoImagen} />
              Subir imagen/doc
            </label>
          </div>
          {(resultadoMasivo || ocrStatus || audioStatus) && (
            <div className="cc-importStatus">
              {resultadoMasivo && <span>{resultadoMasivo}</span>}
              {ocrStatus && <span>{ocrStatus}</span>}
              {audioStatus && <span>{audioStatus}</span>}
            </div>
          )}
          {cortesDetectados.length > 0 && (
            <div className="cc-review">
              <div className="cc-reviewHead">
                <div>
                  <h3 className="cc-reviewTitle">Revisá antes de agregar</h3>
                  <p className="cc-reviewCopy">Corregí material, medidas o cantidad si algo salió mal.</p>
                </div>
                <button type="button" className="cc-btnCalc cc-btnCalc--inline" onClick={confirmarCortesDetectados}>
                  Agregar cortes revisados
                </button>
              </div>
              <div className="cc-reviewList">
                {cortesDetectados.map((corte, index) => {
                  const material = getMaterialByName(corte.material);
                  const l = parseNumero(corte.largo);
                  const a = parseNumero(corte.ancho);
                  const q = parseNumero(corte.cantidad);
                  const subtotalPreview = material && l > 0 && a > 0 && q > 0
                    ? calcularCorte(material, l, a, q).subtotal
                    : 0;

                  return (
                    <div className="cc-reviewRow" key={corte.tempId}>
                      <span className="cc-reviewIndex">{index + 1}</span>
                      <label className="cc-reviewField cc-reviewField--material">
                        <span>Material</span>
                        <select
                          className="cc-select"
                          value={corte.material}
                          onChange={(e) => actualizarCorteDetectado(corte.tempId, { material: e.target.value })}
                        >
                          {MATERIALES.map((grupo) => (
                            <optgroup key={grupo.grupo} label={grupo.grupo}>
                              {grupo.items.map((m) => (
                                <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                      <label className="cc-reviewField">
                        <span>Largo cm</span>
                        <input
                          type="number"
                          className="cc-input"
                          value={corte.largo}
                          onChange={(e) => actualizarCorteDetectado(corte.tempId, { largo: e.target.value })}
                        />
                      </label>
                      <label className="cc-reviewField">
                        <span>Ancho cm</span>
                        <input
                          type="number"
                          className="cc-input"
                          value={corte.ancho}
                          onChange={(e) => actualizarCorteDetectado(corte.tempId, { ancho: e.target.value })}
                        />
                      </label>
                      <label className="cc-reviewField">
                        <span>Cant.</span>
                        <input
                          type="number"
                          className="cc-input"
                          value={corte.cantidad}
                          onChange={(e) => actualizarCorteDetectado(corte.tempId, { cantidad: e.target.value })}
                        />
                      </label>
                      <div className="cc-reviewSubtotal">
                        <span>Subtotal</span>
                        <strong>$ {formatARS(subtotalPreview)}</strong>
                      </div>
                      <button
                        type="button"
                        className="cc-reviewRemove"
                        onClick={() => eliminarCorteDetectado(corte.tempId)}
                        title="Quitar corte detectado"
                      >
                        Quitar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {costoActual !== null && (
          <div className="cc-result">
            <span className="cc-resultLabel">Último corte agregado</span>
            <span className="cc-resultAmount">$ {formatARS(costoActual)}</span>
          </div>
        )}

        {/* PASO 3 — TABLA */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">03</span>
            <span className="cc-stepLabel">Mis cortes</span>
          </div>
          <div className="cc-tableWrap">
            <table className="cc-table" ref={tableRef}>
              <thead>
                <tr>
                  <th className="cc-noprint">Sel.</th>
                  <th>Cant.</th>
                  <th>Material</th>
                  <th>Medida</th>
                  <th>$ / unidad</th>
                  <th>Subtotal</th>
                  <th className="cc-noprint">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cortes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="cc-emptyRow">Todavía no agregaste cortes</td>
                  </tr>
                ) : (
                  cortes.map((c) => {
                    const isEditing = editandoCorteId === c.id;
                    const materialEditado = getMaterialByName(corteEditado.material);
                    const largoEditado = parseNumero(corteEditado.largo);
                    const anchoEditado = parseNumero(corteEditado.ancho);
                    const cantidadEditada = parseNumero(corteEditado.cantidad);
                    const preview = isEditing && materialEditado && largoEditado > 0 && anchoEditado > 0 && cantidadEditada > 0
                      ? calcularCorte(materialEditado, largoEditado, anchoEditado, cantidadEditada)
                      : null;

                    return (
                      <tr key={c.id} className={seleccionados.has(c.id) ? "cc-rowSelected" : ""}>
                        <td className="cc-noprint">
                          <input
                            type="checkbox"
                            className="cc-checkbox"
                            checked={seleccionados.has(c.id)}
                            onChange={() => toggleSeleccion(c.id)}
                          />
                        </td>
                        {isEditing ? (
                          <>
                            <td>
                              <input
                                type="number"
                                className="cc-tableInput cc-tableInput--short"
                                value={corteEditado.cantidad}
                                onChange={(e) => setCorteEditado((actual) => ({ ...actual, cantidad: e.target.value }))}
                              />
                            </td>
                            <td>
                              <select
                                className="cc-tableSelect"
                                value={corteEditado.material}
                                onChange={(e) => setCorteEditado((actual) => ({ ...actual, material: e.target.value }))}
                              >
                                {MATERIALES.map((grupo) => (
                                  <optgroup key={grupo.grupo} label={grupo.grupo}>
                                    {grupo.items.map((m) => (
                                      <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="cc-measureEdit">
                                <input
                                  type="number"
                                  className="cc-tableInput"
                                  value={corteEditado.largo}
                                  onChange={(e) => setCorteEditado((actual) => ({ ...actual, largo: e.target.value }))}
                                />
                                <span>x</span>
                                <input
                                  type="number"
                                  className="cc-tableInput"
                                  value={corteEditado.ancho}
                                  onChange={(e) => setCorteEditado((actual) => ({ ...actual, ancho: e.target.value }))}
                                />
                              </div>
                            </td>
                            <td>$ {formatARS(preview?.costoUnd || 0)}</td>
                            <td>$ {formatARS(preview?.subtotal || 0)}</td>
                            <td className="cc-noprint">
                              <div className="cc-rowActions">
                                <button type="button" className="cc-rowBtn cc-rowBtn--save" onClick={guardarEdicionCorte}>Guardar</button>
                                <button type="button" className="cc-rowBtn" onClick={cancelarEdicionCorte}>Cancelar</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{c.cantidad}</td>
                            <td>{c.material}</td>
                            <td>{c.largo} x {c.ancho} cm</td>
                            <td>$ {formatARS(c.costoUnd)}</td>
                            <td>$ {formatARS(c.subtotal)}</td>
                            <td className="cc-noprint">
                              <button type="button" className="cc-rowBtn" onClick={() => iniciarEdicionCorte(c)}>
                                Editar
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={5} className="cc-noprint" />
                  <th>Total</th>
                  <th>$ {formatARS(total)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="cc-actions">
            <button className="cc-actionBtn cc-btnDel" title="Eliminar seleccionados" onClick={eliminarSeleccionados}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnCopy" title="Copiar tabla para mensaje" onClick={copiarTablaMisCortes}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnPrint" title="Imprimir" onClick={imprimir}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnPdf" title="Guardar PDF" onClick={exportarPDF}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnReceipt" title="Copiar y descargar comprobante PNG" onClick={exportarComprobanteRetiro}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h4" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnWa" title="Enviar por WhatsApp" onClick={enviarWhatsApp}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
            </button>
          </div>
        </section>

        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">04</span>
            <span className="cc-stepLabel">Datos para retirar</span>
          </div>
          <p className="cc-nota">Estos datos salen en el comprobante de retiro.</p>
          <div className="cc-grid">
            <div className="cc-field">
              <label className="cc-fieldLabel">Cliente *</label>
              <input type="text" className="cc-input" placeholder="Nombre y apellido" value={cliente} onChange={(e) => setCliente(e.target.value)} required />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Telefono</label>
              <input type="tel" className="cc-input" placeholder="223..." value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Fecha de retiro</label>
              <input type="date" className="cc-input" value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Piezas cargadas</label>
              <input
                type="text"
                className="cc-input cc-input--readonly"
                readOnly
                value={totalPiezas ? `${formatARS(totalPiezas).replace(",00", "")} piezas` : ""}
                placeholder="Se calcula con la lista"
              />
            </div>
          </div>
          <div className="cc-field cc-field--full">
            <label className="cc-fieldLabel">Observaciones</label>
            <textarea
              className="cc-input cc-textarea"
              placeholder="Ej: retirar por Luro, cortar con veta horizontal, entrega parcial..."
              rows={3}
              value={observacionesRetiro}
              onChange={(e) => setObservacionesRetiro(e.target.value)}
            />
          </div>
          <button className="cc-btnReceiptWide" onClick={exportarComprobanteRetiro}>
            Copiar y descargar comprobante PNG
          </button>
        </section>

        {/* TOTAL */}
        <div className="cc-totalStrip">
          <span className="cc-totalLabel">Total de tu pedido</span>
          <span className="cc-totalAmount">$ {formatARS(total)}</span>
        </div>

        <a className="cc-waStrip" href="https://wa.me/5492234383262" target="_blank" rel="noreferrer">
          <span>¿Tenés dudas sobre el material? Escribinos →</span>
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
        </a>
      </div>
    </div>
  );
}
