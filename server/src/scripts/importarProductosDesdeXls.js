import "dotenv/config";
import path from "path";
import { createRequire } from "module";

import Producto from "../models/Producto.js";
import { ensureDbConnection } from "../dbConnect.js";

const require = createRequire(import.meta.url);

function resolveXlsx() {
  const candidates = [
    path.resolve(process.cwd(), "node_modules", "xlsx"),
    path.resolve(process.cwd(), "..", "external_creadorPrecios", "node_modules", "xlsx"),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }

  throw new Error("No encontramos la libreria xlsx para leer el archivo .XLS");
}

function cleanText(value = "") {
  return String(value || "").replace(/\uFFFD/g, "").trim();
}

function parsePrice(value) {
  const raw = cleanText(value);
  if (!raw) return null;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function run() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Debes pasar la ruta del XLS a importar");
  }

  const filePath = path.resolve(fileArg);
  const XLSX = resolveXlsx();
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("El XLS no tiene hojas para importar");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

  if (!rows.length) {
    throw new Error("El XLS no tiene filas para importar");
  }

  await ensureDbConnection();

  const existingCodes = new Set(
    (await Producto.find({}, "codigo").lean()).map((item) => cleanText(item?.codigo))
  );

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const operations = [];

  for (const row of rows) {
    const codigo = cleanText(row?.barras || row?.BARRAS || row?.codigo || row?.CODIGO);
    const nombre = cleanText(row?.nombre || row?.NOMBRE);
    const precio = parsePrice(row?.precio || row?.PRECIO);

    if (!codigo || !nombre || precio === null) {
      skipped += 1;
      continue;
    }

    operations.push({
      updateOne: {
        filter: { codigo },
        update: {
          $set: {
            codigo,
            nombre,
            precio,
            activo: true,
          },
          $setOnInsert: {
            categoria: "",
            subcategoria: "",
            unidad: "u",
          },
        },
        upsert: true,
      },
    });

    if (existingCodes.has(codigo)) {
      updated += 1;
    } else {
      created += 1;
      existingCodes.add(codigo);
    }

    processed += 1;
  }

  const batchSize = 500;
  for (let i = 0; i < operations.length; i += batchSize) {
    await Producto.bulkWrite(operations.slice(i, i + batchSize), { ordered: false });
  }

  console.log(`XLS procesado: ${processed}`);
  console.log(`Productos actualizados: ${updated}`);
  console.log(`Productos creados: ${created}`);
  console.log(`Filas omitidas: ${skipped}`);
}

run().catch((error) => {
  console.error("Importacion fallida:", error.message);
  process.exit(1);
});
