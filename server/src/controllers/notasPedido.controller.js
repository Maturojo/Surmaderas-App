import NotaPedido from "../models/NotaPedido.js";

// ... tu crearNotaPedido queda igual

export async function listarNotasPedido(req, res) {
  try {
    const { q = "", page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Buscar por número/cliente/teléfono (ajustá campos según tu schema)
    if (String(q).trim()) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [
        { numero: rx },
        { "cliente.nombre": rx },
        { "cliente.telefono": rx },
      ];
    }

    const [items, total] = await Promise.all([
      NotaPedido.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NotaPedido.countDocuments(filter),
    ]);

    res.json({ ok: true, page: pageNum, limit: limitNum, total, items });
  } catch (err) {
    console.error("listarNotasPedido error:", err);
    res.status(500).json({ ok: false, message: "Error listando notas de pedido" });
  }
}

export async function obtenerNotaPedido(req, res) {
  try {
    const { id } = req.params;
    const item = await NotaPedido.findById(id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Nota no encontrada" });
    res.json({ ok: true, item });
  } catch (err) {
    console.error("obtenerNotaPedido error:", err);
    res.status(500).json({ ok: false, message: "Error obteniendo nota" });
  }
}
