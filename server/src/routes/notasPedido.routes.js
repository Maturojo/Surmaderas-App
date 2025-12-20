import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import NotaPedido from "../models/NotaPedido.js";
import { nextNotaNumero } from "../utils/nextNotaNumero.js";

const router = Router();

router.use(requireAuth);

router.post("/", async (req, res) => {
  try {
    const body = req.body;

    if (!body?.cliente?.nombre) return res.status(400).json({ message: "Falta cliente.nombre" });
    if (!body?.fecha) return res.status(400).json({ message: "Falta fecha" });
    if (!body?.entrega) return res.status(400).json({ message: "Falta entrega" });
    if (!Array.isArray(body?.items) || body.items.length === 0)
      return res.status(400).json({ message: "Faltan items" });

    const numero = await nextNotaNumero(body.fecha);

    const nota = await NotaPedido.create({
      ...body,
      numero,
    });

    res.status(201).json(nota);
  } catch (err) {
    res.status(500).json({ message: "Error creando nota", error: String(err?.message || err) });
  }
});

router.get("/", async (_req, res) => {
  const notas = await NotaPedido.find().sort({ createdAt: -1 }).limit(200);
  res.json(notas);
});

router.get("/:id", async (req, res) => {
  const nota = await NotaPedido.findById(req.params.id);
  if (!nota) return res.status(404).json({ message: "No encontrada" });
  res.json(nota);
});

export default router;
