import { Router } from "express";
import IvanProduct from "../models/IvanProduct.js";
import IvanRemito from "../models/IvanRemito.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "ivan"));

function clean(value = "") {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function normalizeMaterials(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      tipo: item?.tipo === "liston" ? "liston" : "material",
      nombre: clean(item?.nombre),
      cantidad: toNumber(item?.cantidad),
      unidad: clean(item?.unidad) || "u",
      costoUnitario: toNumber(item?.costoUnitario),
    }))
    .filter((item) => item.nombre || item.cantidad > 0 || item.costoUnitario > 0);
}

function productPayload(body, user) {
  const materiales = normalizeMaterials(body?.materiales);
  const materialCost = materiales.reduce(
    (sum, item) => sum + toNumber(item.cantidad) * toNumber(item.costoUnitario),
    0
  );
  const costo = body?.costo === "" || body?.costo == null ? materialCost : toNumber(body.costo);

  return {
    codigo: clean(body?.codigo),
    nombre: clean(body?.nombre),
    descripcion: clean(body?.descripcion),
    imagen: String(body?.imagen || ""),
    materiales,
    costo,
    valor: toNumber(body?.valor),
    stock: toNumber(body?.stock),
    unidad: clean(body?.unidad) || "u",
    observaciones: clean(body?.observaciones),
    activo: body?.activo !== false,
    creadoPor: user?.name || user?.username || "",
  };
}

function remitoPayload(body, user) {
  return {
    fecha: clean(body?.fecha) || new Date().toISOString().slice(0, 10),
    destinatario: clean(body?.destinatario),
    direccion: clean(body?.direccion),
    transporte: clean(body?.transporte),
    observaciones: clean(body?.observaciones),
    items: Array.isArray(body?.items)
      ? body.items
          .map((item) => ({
            productoId: item?.productoId || null,
            codigo: clean(item?.codigo),
            nombre: clean(item?.nombre),
            cantidad: toNumber(item?.cantidad, 1),
            unidad: clean(item?.unidad) || "u",
            detalle: clean(item?.detalle),
          }))
          .filter((item) => item.nombre)
      : [],
    creadoPor: user?.name || user?.username || "",
  };
}

router.get("/productos", async (req, res) => {
  try {
    const q = clean(req.query.q);
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "30", 10)));
    const skip = (page - 1) * limit;
    const filter = q
      ? { $or: [{ nombre: { $regex: q, $options: "i" } }, { codigo: { $regex: q, $options: "i" } }] }
      : {};

    const [items, total] = await Promise.all([
      IvanProduct.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      IvanProduct.countDocuments(filter),
    ]);

    return res.json({ items, total, page, limit });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "No se pudieron cargar los productos" });
  }
});

router.post("/productos", async (req, res) => {
  try {
    const payload = productPayload(req.body, req.user);
    if (!payload.nombre) return res.status(400).json({ message: "El nombre del producto es obligatorio" });

    const product = await IvanProduct.create(payload);
    return res.status(201).json({ message: "Producto cargado correctamente", product });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "No se pudo cargar el producto" });
  }
});

router.put("/productos/:id", async (req, res) => {
  try {
    const payload = productPayload(req.body, req.user);
    if (!payload.nombre) return res.status(400).json({ message: "El nombre del producto es obligatorio" });

    const product = await IvanProduct.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    return res.json({ message: "Producto actualizado correctamente", product });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "No se pudo actualizar el producto" });
  }
});

router.delete("/productos/:id", async (req, res) => {
  try {
    const result = await IvanProduct.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ message: "Producto no encontrado" });
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "No se pudo borrar el producto" });
  }
});

router.get("/remitos", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "30", 10)));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      IvanRemito.find({}).sort({ numero: -1 }).skip(skip).limit(limit).lean(),
      IvanRemito.countDocuments({}),
    ]);
    return res.json({ items, total, page, limit });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "No se pudieron cargar los remitos" });
  }
});

router.post("/remitos", async (req, res) => {
  try {
    const payload = remitoPayload(req.body, req.user);
    if (!payload.destinatario) return res.status(400).json({ message: "El destinatario es obligatorio" });
    if (!payload.items.length) return res.status(400).json({ message: "Agrega al menos un item al remito" });

    const last = await IvanRemito.findOne({}).sort({ numero: -1 }).lean();
    const remito = await IvanRemito.create({ ...payload, numero: Number(last?.numero || 0) + 1 });
    return res.status(201).json({ message: "Remito creado correctamente", remito });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "No se pudo crear el remito" });
  }
});

export default router;
