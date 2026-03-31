import { Router } from "express";
import Proveedor from "../models/Proveedor.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function limpiar(valor = "") {
  return String(valor || "").trim();
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    const items = await Proveedor.find({ activo: true }).sort({ nombre: 1 }).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error?.message || "Error obteniendo proveedores" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const nombre = limpiar(req.body?.nombre);
    const telefono = limpiar(req.body?.telefono);
    const contacto = limpiar(req.body?.contacto);
    const nota = limpiar(req.body?.nota);

    if (!nombre) {
      return res.status(400).json({ message: "El nombre del proveedor es obligatorio" });
    }

    const proveedor = await Proveedor.findOneAndUpdate(
      { nombre },
      { $set: { telefono, contacto, nota, activo: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(proveedor);
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error creando proveedor" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const nombre = limpiar(req.body?.nombre);
    const telefono = limpiar(req.body?.telefono);
    const contacto = limpiar(req.body?.contacto);
    const nota = limpiar(req.body?.nota);

    if (!nombre) {
      return res.status(400).json({ message: "El nombre del proveedor es obligatorio" });
    }

    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      { $set: { nombre, telefono, contacto, nota } },
      { new: true, runValidators: true }
    );

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json(proveedor);
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error actualizando proveedor" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const proveedor = await Proveedor.findByIdAndUpdate(
      req.params.id,
      { $set: { activo: false } },
      { new: true }
    );

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error?.message || "Error eliminando proveedor" });
  }
});

export default router;
