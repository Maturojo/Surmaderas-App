import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Producto from "../models/Producto.js";

const filePath = path.resolve("src/seed/productos_art.json");

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI en .env");

  const raw = fs.readFileSync(filePath, "utf-8");
  const items = JSON.parse(raw);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Mongo conectado");

  let upserts = 0;

  for (const it of items) {
    const codigo = String(it.codigo || "").trim();
    const nombre = String(it.nombre || "").trim();
    const precio = Number(it.precio || 0);

    if (!codigo || !nombre || !Number.isFinite(precio)) continue;

    await Producto.updateOne(
      { codigo },
      { $set: { codigo, nombre, precio, activo: true } },
      { upsert: true }
    );

    upserts += 1;
  }

  console.log(`✅ Productos procesados: ${upserts}`);
  await mongoose.disconnect();
  console.log("✅ Listo");
}

run().catch((e) => {
  console.error("❌ Seed falló:", e);
  process.exit(1);
});
