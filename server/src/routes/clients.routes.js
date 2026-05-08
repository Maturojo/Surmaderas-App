import { Router } from "express";
import Client from "../models/Client.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const items = await Client.find().sort({ createdAt: -1 }).limit(200);
  res.json(items);
});

router.post("/", requireAuth, async (req, res) => {
  const { name, phone, email, notes } = req.body || {};
  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  const created = await Client.create({ name, phone, email, notes });
  res.status(201).json(created);
});

router.put("/:id", requireAuth, async (req, res) => {
  const { name, phone, email, notes } = req.body || {};
  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  const updated = await Client.findByIdAndUpdate(
    req.params.id,
    { name, phone, email, notes },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Cliente no encontrado" });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const deleted = await Client.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Cliente no encontrado" });
  res.json({ message: "Cliente eliminado" });
});

export default router;
