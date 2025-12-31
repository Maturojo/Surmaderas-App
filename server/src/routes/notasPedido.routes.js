import express from "express";
import NotaPedido from "../models/NotaPedido.js";

const router = express.Router();

/** Helper: normalizar strings para enum */
function normTipoPago(value) {
  const raw = String(value || "").trim();

  const t = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos

  const map = {
    efectivo: "efectivo",
    debito: "debito",
    "debito ": "debito",
    credito: "credito",
    transferencia: "transferencia",
    transf: "transferencia",
    qr: "qr",
    mixto: "mixto",
    otro: "otro",
    "": "",
  };

  return map[t] ?? t; // fallback
}

/** LISTAR (no incluye eliminadas) */
router.get("/", async (req, res) => {
  try {
    const { q = "", page = 1, limit = 25 } = req.query;

    const nPage = Math.max(1, Number(page || 1));
    const nLimit = Math.max(1, Math.min(200, Number(limit || 25)));
    const skip = (nPage - 1) * nLimit;

    const query = { eliminada: { $ne: true } };

    if (q) {
      const rx = new RegExp(String(q), "i");
      query.$or = [
        { numero: rx },
        { vendedor: rx },
        { "cliente.nombre": rx },
        { "cliente.telefono": rx },
        { estado: rx },
      ];
    }

    const [items, total] = await Promise.all([
      NotaPedido.find(query).sort({ createdAt: -1 }).skip(skip).limit(nLimit),
      NotaPedido.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      items,
      page: nPage,
      limit: nLimit,
      total,
      pages: Math.ceil(total / nLimit),
    });
  } catch (err) {
    return res.status(500).json({ message: "Error listando notas", error: err.message });
  }
});

/** DETALLE */
router.get("/:id", async (req, res) => {
  try {
    const nota = await NotaPedido.findById(req.params.id);
    if (!nota) return res.status(404).json({ message: "Nota no encontrada" });
    if (nota.eliminada) return res.status(404).json({ message: "Nota eliminada" });
    return res.json({ ok: true, item: nota });
  } catch (err) {
    return res.status(500).json({ message: "Error leyendo nota", error: err.message });
  }
});

/** GUARDAR CAJA (sin clave) */
router.put("/:id/caja", async (req, res) => {
  try {
    const { id } = req.params;
    const { ajuste = {}, pago = {} } = req.body || {};

    const nota = await NotaPedido.findById(id);
    if (!nota) return res.status(404).json({ message: "Nota no encontrada" });
    if (nota.eliminada) return res.status(400).json({ message: "No se puede editar una nota eliminada" });

    // asegurar subdocs
    if (!nota.totales) nota.totales = {};
    if (!nota.caja) nota.caja = {};

    const totalLista = Number(nota?.totales?.subtotal || 0);

    const modo = String(ajuste.modo || "sin");
    const descuentoMonto = Math.max(0, Number(ajuste.descuentoMonto || 0));
    const descuentoPct = Math.max(0, Math.min(100, Number(ajuste.descuentoPct || 0)));
    const precioEspecial = Math.max(0, Number(ajuste.precioEspecial || 0));

    let totalFinal = totalLista;
    let descuentoAplicado = 0;

    if (modo === "precio_especial") {
      totalFinal = precioEspecial;
      descuentoAplicado = Math.max(0, totalLista - totalFinal);
    } else if (modo === "descuento_monto") {
      descuentoAplicado = descuentoMonto;
      totalFinal = totalLista - descuentoAplicado;
    } else if (modo === "descuento_pct") {
      descuentoAplicado = (totalLista * descuentoPct) / 100;
      totalFinal = totalLista - descuentoAplicado;
    }

    totalFinal = Math.max(0, totalFinal);

    const tipoFinal = normTipoPago(pago.tipo);
    const adelanto = Math.max(0, Number(pago.adelanto || 0));
    const resta = totalFinal - adelanto;

    const estadoPago = resta <= 0 ? "pagado" : adelanto > 0 ? "parcial" : "pendiente";

    nota.caja = {
      ajuste: {
        modo,
        descuentoMonto,
        descuentoPct,
        precioEspecial,
        motivo: String(ajuste.motivo || ""),
      },
      pago: {
        tipo: tipoFinal,
        adelanto,
        estado: estadoPago,
        updatedAt: new Date(),
      },
      totales: {
        descuentoAplicado,
        totalFinal,
        resta,
      },
    };

    // compat viejo
    nota.medioPago = tipoFinal || "";
    nota.totales.descuento = descuentoAplicado;
    nota.totales.total = totalFinal;
    nota.totales.adelanto = adelanto;
    nota.totales.resta = resta;

    await nota.save();

    return res.json({ ok: true, item: nota });
  } catch (err) {
    return res.status(500).json({
      message: "Error actualizando caja",
      error: err.message,
    });
  }
});

/** ELIMINAR (soft delete) */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const nota = await NotaPedido.findById(id);
    if (!nota) return res.status(404).json({ message: "Nota no encontrada" });

    if (nota.eliminada) return res.json({ ok: true });

    nota.eliminada = true;
    nota.eliminadaAt = new Date();

    await nota.save();

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Error eliminando nota", error: err.message });
  }
});

export default router;
