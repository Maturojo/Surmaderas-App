import "dotenv/config";
import fs from "fs";
import path from "path";

import Categoria from "../models/Categoria.js";
import Producto from "../models/Producto.js";
import Subcategoria from "../models/Subcategoria.js";
import { ensureDbConnection } from "../dbConnect.js";

function splitCsvLine(line) {
  const values = [];
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
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim());
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((header) => String(header || "").trim());

  return lines.slice(1).map((line) => {
    const columns = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = columns[index] ?? "";
    });

    return row;
  });
}

function cleanText(value = "") {
  return String(value || "").replace(/\uFFFD/g, "").trim();
}

function parsePrice(...values) {
  for (const value of values) {
    const raw = cleanText(value);
    if (!raw) continue;
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
}

function parseCategorias(rawCategorias = "") {
  const categorias = cleanText(rawCategorias)
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean);

  let categoria = "";
  let subcategoria = "";

  for (const item of categorias) {
    if (item.includes(" > ")) {
      const [categoriaBase, ...rest] = item.split(" > ");
      categoria = cleanText(categoriaBase);
      subcategoria = cleanText(rest.join(" > "));
      break;
    }
  }

  if (!categoria && categorias.length) {
    categoria = categorias[0];
  }

  return {
    categoria,
    subcategoria,
  };
}

async function run() {
  const csvArg = process.argv[2];
  if (!csvArg) {
    throw new Error("Debes pasar la ruta del CSV a importar");
  }

  const csvPath = path.resolve(csvArg);
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(content);

  if (!rows.length) {
    throw new Error("El CSV no tiene filas para importar");
  }

  await ensureDbConnection();

  let procesados = 0;
  let omitidos = 0;
  let categoriasCreadas = 0;
  let subcategoriasCreadas = 0;

  for (const row of rows) {
    const codigo = cleanText(row.SKU);
    const nombre = cleanText(row.Nombre);
    const precio = parsePrice(row["Precio normal"], row["Precio rebajado"]);
    const activo = String(row.Publicado || "").trim() === "1";
    const { categoria, subcategoria } = parseCategorias(row.Categorías);

    if (!codigo || !nombre) {
      omitidos += 1;
      continue;
    }

    if (categoria && categoria.toLowerCase() !== "sin clasificar") {
      const categoriaResult = await Categoria.updateOne(
        { nombre: categoria },
        { $setOnInsert: { nombre: categoria } },
        { upsert: true }
      );
      if (categoriaResult.upsertedCount) categoriasCreadas += 1;
    }

    if (
      categoria &&
      subcategoria &&
      categoria.toLowerCase() !== "sin clasificar" &&
      subcategoria.toLowerCase() !== "sin subcategoria" &&
      subcategoria.toLowerCase() !== "sin subcategoría"
    ) {
      const subcategoriaResult = await Subcategoria.updateOne(
        { categoria, nombre: subcategoria },
        { $setOnInsert: { categoria, nombre: subcategoria } },
        { upsert: true }
      );
      if (subcategoriaResult.upsertedCount) subcategoriasCreadas += 1;
    }

    await Producto.updateOne(
      { codigo },
      {
        $set: {
          codigo,
          nombre,
          precio,
          categoria,
          subcategoria,
          activo,
          unidad: "u",
        },
      },
      { upsert: true }
    );

    procesados += 1;
  }

  console.log(`CSV procesado: ${procesados}`);
  console.log(`Filas omitidas: ${omitidos}`);
  console.log(`Categorias creadas: ${categoriasCreadas}`);
  console.log(`Subcategorias creadas: ${subcategoriasCreadas}`);
}

run().catch((error) => {
  console.error("Importacion fallida:", error.message);
  process.exit(1);
});
