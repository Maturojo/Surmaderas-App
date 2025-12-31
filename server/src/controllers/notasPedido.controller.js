import NotaPedido from "../models/NotaPedido.js";

export async function listarNotasPedido(req, res) {
  try {
    const { q = "", page = 1, limit = 25 } = req.query;

    const filter = {};
    if (q) {
      const rx = new RegExp(String(q), "i");
      filter.$or = [
        { numero: rx },
        { cliente: rx },
        { vendedor: rx },
        { entrega: rx },
        { estado: rx },
      ];
    }

    const p = Math.max(1, Number(page || 1));
    const l = Math.min(500, Math.max(1, Number(limit || 25)));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      NotaPedido.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
      NotaPedido.countDocuments(filter),
    ]);

    res.json({ items, page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error listando notas" });
  }
}

export async function crearNotaPedido(req, res) {
  try {
    const doc = await NotaPedido.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e?.message || "Error creando nota" });
  }
}

export async function obtenerNotaPedido(req, res) {
  try {
    const { id } = req.params;
    const doc = await NotaPedido.findById(id);
    if (!doc) return res.status(404).json({ message: "Nota no encontrada" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error obteniendo nota" });
  }
}

export async function eliminarNotaPedido(req, res) {
  try {
    const { id } = req.params;
    const doc = await NotaPedido.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Nota no encontrada" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error eliminando nota" });
  }
}

export async function guardarCajaNota(req, res) {
  try {
    const { id } = req.params;
    const { tipo = "pago", monto = 0, metodo = "", nota = "" } = req.body;

    const t = String(tipo).toLowerCase();
    const esSena = t === "seña" || t === "sena" || t === "senia";
    const estado = esSena ? "señada" : "pagada";

    const update = {
      estado,
      caja: {
        guardada: true,
        tipo: esSena ? "seña" : "pago",
        monto: Number(monto || 0),
        metodo: String(metodo || ""),
        nota: String(nota || ""),
        fecha: new Date(),
      },
    };

    const updated = await NotaPedido.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Nota no encontrada" });

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error guardando caja" });
  }
}
