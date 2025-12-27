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
router.post("/", async (req, res) => {
  try {
    const {
      numero,
      fecha,
      entrega,
      diasHabiles,
      cliente,
      vendedor,
      medioPago,
      totales,
      pdfBase64,
      userId,
      estado,
    } = req.body;

    // ✅ aceptar items en raíz o dentro de entrega (compatibilidad)
    const items = req.body.items ?? req.body?.entrega?.items ?? [];

    if (!numero) return res.status(400).json({ message: "Falta numero" });
    if (!fecha) return res.status(400).json({ message: "Falta fecha" });
    if (!entrega) return res.status(400).json({ message: "Falta entrega" });

    if (!cliente?.nombre) return res.status(400).json({ message: "Falta cliente.nombre" });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Items vacíos" });

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
      userId: userId || null,
      estado: estado || "pendiente",
    });

    return res.status(201).json({ ok: true, item: creada });
  } catch (err) {
    // Manejo de error de unique (numero duplicado)
    if (err?.code === 11000) {
      return res.status(409).json({ message: "El numero de nota ya existe (duplicado)" });
    }

    return res.status(500).json({
      message: "Error creando nota",
      error: err.message,
    });
  }
});

/**
 * Listar notas (historial)
 * GET /api/notas-pedido?q=&page=&limit=&estado=&vendedor=&from=&to=&dateField=fecha|entrega&userId=
 *
 * - q: busca por numero, cliente.nombre, cliente.telefono
 * - estado: pendiente | entregado | cancelado
 * - vendedor: string exacto
 * - from/to: rango de fechas en formato YYYY-MM-DD
 * - dateField: "fecha" (default) o "entrega"
 * - userId: filtra por userId (si lo usás)
 */
router.get("/", async (req, res) => {
  try {
    const {
      q = "",
      page = 1,
      limit = 25,
      estado = "",
      vendedor = "",
      from = "",
      to = "",
      dateField = "fecha",
      userId = "",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Search
    const query = String(q || "").trim();
    if (query) {
      filter.$or = [
        { numero: { $regex: query, $options: "i" } },
        { "cliente.nombre": { $regex: query, $options: "i" } },
        { "cliente.telefono": { $regex: query, $options: "i" } },
      ];
    }

    // Estado
    if (String(estado).trim()) {
      filter.estado = String(estado).trim();
    }

    // Vendedor
    if (String(vendedor).trim()) {
      filter.vendedor = String(vendedor).trim();
    }

    // UserId (si lo necesitás)
    if (String(userId).trim()) {
      filter.userId = String(userId).trim();
    }

    // Rango de fechas (fecha o entrega)
    const df = dateField === "entrega" ? "entrega" : "fecha";
    if (from || to) {
      filter[df] = {};
      if (from) filter[df].$gte = String(from);
      if (to) filter[df].$lte = String(to);
    }

    // Proyección liviana para listado (no traer pdfBase64 en listado)
    const projection = {
      pdfBase64: 0,
      __v: 0,
    };

    const [items, total] = await Promise.all([
      NotaPedido.find(filter, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NotaPedido.countDocuments(filter),
    ]);

    return res.json({
      ok: true,
      items,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error listando notas",
      error: err.message,
    });
  }
});

/**
 * Obtener una nota por ID (detalle)
 * GET /api/notas-pedido/:id
 * (Acá sí devolvemos pdfBase64 si existe)
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await NotaPedido.findById(id).lean();
    if (!item) return res.status(404).json({ message: "Nota no encontrada" });

    return res.json({ ok: true, item });
  } catch (err) {
    return res.status(500).json({
      message: "Error obteniendo nota",
      error: err.message,
    });
  }
});

export default router;
