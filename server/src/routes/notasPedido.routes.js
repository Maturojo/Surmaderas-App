import { Router } from "express";
import NotaPedido from "../models/NotaPedido.js";

const router = Router();

// Crear Nota de Pedido
router.post("/", async (req, res) => {
  try {
    const { numero, fecha, entrega, diasHabiles, cliente, vendedor, medioPago, totales, pdfBase64 } = req.body;

    // ✅ aceptar items en raíz o dentro de entrega
    const items = req.body.items ?? req.body?.entrega?.items ?? [];

    if (!numero) return res.status(400).json({ message: "Falta numero" });
    if (!fecha) return res.status(400).json({ message: "Falta fecha" });
    if (!entrega) return res.status(400).json({ message: "Falta entrega" });
    if (!cliente?.nombre) return res.status(400).json({ message: "Falta cliente.nombre" });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items vacíos" });

    const creada = await NotaPedido.create({
      numero,
      fecha,
      entrega,
      diasHabiles: Number(diasHabiles || 0),
      cliente,
      vendedor: vendedor || "",
      medioPago: medioPago || "",
      items,
      totales: totales || {},
      pdfBase64: pdfBase64 || "",
    });

    return res.status(201).json(creada);
  } catch (err) {
    return res.status(500).json({ message: "Error creando nota", error: err.message });
  }
});


// Listar (por si después querés ver historial)
router.get("/", async (req, res) => {
  try {
    const { q = "", page = 1, limit = 25 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = q
      ? {
          $or: [
            { numero: { $regex: q, $options: "i" } },
            { "cliente.nombre": { $regex: q, $options: "i" } },
            { "cliente.telefono": { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      NotaPedido.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      NotaPedido.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: "Error listando notas", error: err.message });
  }
});

export default router;
