import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Producto from "../models/Producto.js";
import Categoria from "../models/Categoria.js";
import Subcategoria from "../models/Subcategoria.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const defaultCsvPath = path.resolve(
  process.cwd(),
  "../external_creadorPrecios/server/src/seed/productosCategorias.csv"
);

const inputCsvPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : defaultCsvPath;

function limpiar(valor = "") {
  return String(valor || "").trim();
}

function normalizarCodigo(valor = "") {
  return limpiar(valor).toUpperCase();
}

function normalizarClave(valor = "") {
  return limpiar(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\uFEFF/, "")
    .toLowerCase();
}

function parsearPrecio(valor) {
  const texto = limpiar(valor)
    .replace(/^"|"$/g, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "");

  if (!texto) return null;

  if (texto.includes(".") && texto.includes(",")) {
    const numero = Number(texto.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(numero) ? Math.floor(numero) : null;
  }

  if (texto.includes(",")) {
    const numero = Number(texto.replace(",", "."));
    return Number.isFinite(numero) ? Math.floor(numero) : null;
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? Math.floor(numero) : null;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCSV(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (!lines.length) return [];

  const headers = parseCSVLine(lines[0]).map(limpiar);

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function obtenerCampo(row, matcher) {
  const key = Object.keys(row).find((item) => matcher(normalizarClave(item)));
  return key ? row[key] : "";
}

function obtenerCategoriaYSub(categoriasRaw) {
  const texto = limpiar(categoriasRaw);
  if (!texto) return { categoria: "", subcategoria: "" };

  const partes = texto
    .split(",")
    .map((parte) => limpiar(parte))
    .filter(Boolean);

  const jerarquia = partes.find((parte) => parte.includes(">"));
  if (jerarquia) {
    const niveles = jerarquia
      .split(">")
      .map((nivel) => limpiar(nivel))
      .filter(Boolean);

    return {
      categoria: niveles[0] || "",
      subcategoria: niveles[1] || "",
    };
  }

  if (partes.length >= 2) {
    return {
      categoria: partes[0] || "",
      subcategoria: partes[1] || "",
    };
  }

  return { categoria: partes[0] || "", subcategoria: "" };
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Falta MONGODB_URI o MONGO_URI en server/.env");
  }

  if (!fs.existsSync(inputCsvPath)) {
    throw new Error(`No se encontro el CSV en ${inputCsvPath}`);
  }

  await mongoose.connect(mongoUri);

  const csvContent = fs.readFileSync(inputCsvPath, "utf8");
  const rows = parseCSV(csvContent);

  let actualizados = 0;
  let noEncontrados = 0;
  let sinCodigo = 0;

  const categoriasSet = new Set();
  const subcategoriasSet = new Set();

  for (const row of rows) {
    const codigo = normalizarCodigo(obtenerCampo(row, (key) => key === "sku"));
    const nombre = limpiar(obtenerCampo(row, (key) => key === "nombre"));
    const precio = parsearPrecio(obtenerCampo(row, (key) => key.includes("precio")));
    const { categoria, subcategoria } = obtenerCategoriaYSub(
      obtenerCampo(row, (key) => key.includes("categoria"))
    );

    if (!codigo) {
      sinCodigo += 1;
      continue;
    }

    const producto = await Producto.findOne({ codigo });
    if (!producto) {
      noEncontrados += 1;
      continue;
    }

    const update = {};
    if (nombre) update.nombre = nombre;
    if (precio !== null) update.precio = precio;
    if (categoria) {
      update.categoria = categoria;
      categoriasSet.add(categoria);
    }
    if (subcategoria) {
      update.subcategoria = subcategoria;
      subcategoriasSet.add(`${categoria}|||${subcategoria}`);
    }

    if (!Object.keys(update).length) continue;

    await Producto.updateOne({ _id: producto._id }, { $set: update });
    actualizados += 1;
  }

  for (const nombre of categoriasSet) {
    await Categoria.updateOne({ nombre }, { $setOnInsert: { nombre } }, { upsert: true });
  }

  for (const item of subcategoriasSet) {
    const [categoria, nombre] = item.split("|||");
    if (!categoria || !nombre) continue;
    await Subcategoria.updateOne(
      { categoria, nombre },
      { $setOnInsert: { categoria, nombre } },
      { upsert: true }
    );
  }

  const [categorias, subcategorias, totalConCategoria] = await Promise.all([
    Producto.distinct("categoria", { categoria: { $nin: [null, ""] } }),
    Producto.distinct("subcategoria", { subcategoria: { $nin: [null, ""] } }),
    Producto.countDocuments({ categoria: { $nin: [null, ""] } }),
  ]);

  console.log(
    JSON.stringify(
      {
        totalFilas: rows.length,
        csv: inputCsvPath,
        actualizados,
        noEncontrados,
        sinCodigo,
        categorias: categorias.sort((a, b) => a.localeCompare(b, "es")),
        subcategoriasCount: subcategorias.length,
        productosConCategoria: totalConCategoria,
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
