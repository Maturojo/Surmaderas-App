import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import VentaMensual from "../models/VentaMensual.js";
import VentaTransferencia from "../models/VentaTransferencia.js";
import VentasConfiguracion from "../models/VentasConfiguracion.js";
import VentasObjetivo from "../models/VentasObjetivo.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "ventas"));

const SPECIAL_CLIENTS = ["ELVIA ROSSI", "MANOLO"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeMonth(value) {
  const text = normalizeText(value);
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 7);
}

function getMonthFromDate(date) {
  return date.toISOString().slice(0, 7);
}

function parseDate(value) {
  const date = new Date(`${normalizeText(value)}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value) {
  if (typeof value === "number") return value;
  const normalized = String(value || "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

function normalizePaymentStatus(value) {
  const text = normalizeText(value).toLowerCase();
  if (["pagado", "senado", "pendiente"].includes(text)) return text;
  return "pendiente";
}

function normalizeSaleType(value, client) {
  const normalizedClient = normalizeText(client).toUpperCase();
  if (SPECIAL_CLIENTS.includes(normalizedClient)) return "especial";

  const text = normalizeText(value).toLowerCase();
  if (text === "especial") return "especial";
  return "normal";
}

function normalizeTransferStatus(value) {
  const text = normalizeText(value).toLowerCase();
  if (["recibida", "pendiente", "conciliada"].includes(text)) return text;
  return "recibida";
}

function normalizeSalePayload(body) {
  const date = parseDate(body?.date);
  const total = parseAmount(body?.total);
  const client = normalizeText(body?.client);
  const saleType = normalizeSaleType(body?.saleType, client);
  const commissionRate = saleType === "especial" ? 0.05 : 0.1;
  const commission = Math.round(total * commissionRate * 100) / 100;

  return {
    date,
    total,
    commission,
    saleType,
    commissionRate,
    client,
    contact: normalizeText(body?.contact),
    category: normalizeText(body?.category),
    subcategory: normalizeText(body?.subcategory),
    description: normalizeText(body?.description),
    paymentStatus: normalizePaymentStatus(body?.paymentStatus),
  };
}

function normalizeTransferPayload(body) {
  const date = parseDate(body?.date);
  const amount = parseAmount(body?.amount);
  const number = normalizeText(body?.number || body?.client);
  const origin = normalizeText(body?.origin || body?.contact);
  const destination = normalizeText(body?.destination || body?.reference);
  const detail = normalizeText(body?.detail || body?.notes);

  return {
    date,
    amount,
    number,
    origin,
    destination,
    detail,
    client: number,
    contact: origin,
    reference: destination,
    notes: detail,
    status: normalizeTransferStatus(body?.status),
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeText).filter(Boolean))];
  }

  return String(value || "")
    .split(/\r?\n|,/)
    .map(normalizeText)
    .filter(Boolean);
}

function getSummary(items, goal) {
  const salesTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const commissionTotal = items.reduce((sum, item) => sum + (item.commission || 0), 0);
  const pendingTotal = items
    .filter((item) => item.paymentStatus === "pendiente")
    .reduce((sum, item) => sum + (item.total || 0), 0);

  return {
    salesTotal,
    commissionTotal,
    pendingTotal,
    salesGoal: goal?.salesGoal || 0,
    commissionGoal: goal?.commissionGoal || 0,
    salesRemaining: Math.max(0, (goal?.salesGoal || 0) - salesTotal),
    commissionRemaining: Math.max(0, (goal?.commissionGoal || 0) - commissionTotal),
  };
}

router.get("/", async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const [items, goal] = await Promise.all([
      VentaMensual.find({ month }).sort({ date: -1, createdAt: -1 }).lean(),
      VentasObjetivo.findOne({ month }).lean(),
    ]);

    return res.json({
      month,
      goal: goal || { month, salesGoal: 0, commissionGoal: 0 },
      summary: getSummary(items, goal),
      items,
    });
  } catch (error) {
    console.error("Error listando ventas mensuales:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron cargar las ventas" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = normalizeSalePayload(req.body);

    if (!payload.date || !payload.client || !payload.category || !Number.isFinite(payload.total)) {
      return res.status(400).json({ message: "Fecha, cliente, categoria y total son obligatorios" });
    }

    const sale = await VentaMensual.create({
      ...payload,
      month: getMonthFromDate(payload.date),
      createdBy: req.user?.name || req.user?.username || "",
    });

    return res.status(201).json({ message: "Venta cargada", sale });
  } catch (error) {
    console.error("Error creando venta:", error?.message || error);
    return res.status(500).json({ message: "No se pudo cargar la venta" });
  }
});

router.get("/configuracion", async (_req, res) => {
  try {
    const config = await VentasConfiguracion.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: { key: "default" } },
      { new: true, upsert: true }
    ).lean();

    return res.json(config);
  } catch (error) {
    console.error("Error cargando configuracion de ventas:", error?.message || error);
    return res.status(500).json({ message: "No se pudo cargar la configuracion" });
  }
});

router.put("/configuracion", async (req, res) => {
  try {
    const categories = normalizeList(req.body?.categories);
    const subcategories = normalizeList(req.body?.subcategories);
    const clients = normalizeList(req.body?.clients);

    if (categories.length === 0) {
      return res.status(400).json({ message: "Tenes que cargar al menos una categoria" });
    }

    const config = await VentasConfiguracion.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          categories,
          subcategories,
          clients,
        },
      },
      { new: true, upsert: true }
    );

    return res.json({ message: "Configuracion actualizada", config });
  } catch (error) {
    console.error("Error guardando configuracion de ventas:", error?.message || error);
    return res.status(500).json({ message: "No se pudo guardar la configuracion" });
  }
});

router.get("/transferencias", async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const items = await VentaTransferencia.find({ month }).sort({ date: 1, createdAt: 1 }).lean();
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    return res.json({ month, total, items });
  } catch (error) {
    console.error("Error listando transferencias:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron cargar las transferencias" });
  }
});

router.post("/transferencias", async (req, res) => {
  try {
    const payload = normalizeTransferPayload(req.body);

    if (!payload.date || !payload.number || !payload.origin || !payload.destination || !Number.isFinite(payload.amount)) {
      return res.status(400).json({ message: "Fecha, numero, origen, destino y monto son obligatorios" });
    }

    const transfer = await VentaTransferencia.create({
      ...payload,
      month: getMonthFromDate(payload.date),
      createdBy: req.user?.name || req.user?.username || "",
    });

    return res.status(201).json({ message: "Transferencia cargada", transfer });
  } catch (error) {
    console.error("Error creando transferencia:", error?.message || error);
    return res.status(500).json({ message: "No se pudo cargar la transferencia" });
  }
});

router.put("/transferencias/:id", async (req, res) => {
  try {
    const payload = normalizeTransferPayload(req.body);

    if (!payload.date || !payload.number || !payload.origin || !payload.destination || !Number.isFinite(payload.amount)) {
      return res.status(400).json({ message: "Fecha, numero, origen, destino y monto son obligatorios" });
    }

    const transfer = await VentaTransferencia.findByIdAndUpdate(
      req.params.id,
      { ...payload, month: getMonthFromDate(payload.date) },
      { new: true }
    );

    if (!transfer) return res.status(404).json({ message: "Transferencia no encontrada" });
    return res.json({ message: "Transferencia actualizada", transfer });
  } catch (error) {
    console.error("Error actualizando transferencia:", error?.message || error);
    return res.status(500).json({ message: "No se pudo actualizar la transferencia" });
  }
});

router.delete("/transferencias/:id", async (req, res) => {
  try {
    const transfer = await VentaTransferencia.findByIdAndDelete(req.params.id);
    if (!transfer) return res.status(404).json({ message: "Transferencia no encontrada" });
    return res.json({ message: "Transferencia eliminada" });
  } catch (error) {
    console.error("Error eliminando transferencia:", error?.message || error);
    return res.status(500).json({ message: "No se pudo eliminar la transferencia" });
  }
});

router.put("/objetivos/:month", async (req, res) => {
  try {
    const month = normalizeMonth(req.params.month);
    const salesGoal = parseAmount(req.body?.salesGoal);
    const commissionGoal = parseAmount(req.body?.commissionGoal);

    const goal = await VentasObjetivo.findOneAndUpdate(
      { month },
      {
        $set: {
          salesGoal: Number.isFinite(salesGoal) ? salesGoal : 0,
          commissionGoal: Number.isFinite(commissionGoal) ? commissionGoal : 0,
        },
      },
      { new: true, upsert: true }
    );

    return res.json({ message: "Objetivos actualizados", goal });
  } catch (error) {
    console.error("Error guardando objetivos:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron guardar los objetivos" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = normalizeSalePayload(req.body);

    if (!payload.date || !payload.client || !payload.category || !Number.isFinite(payload.total)) {
      return res.status(400).json({ message: "Fecha, cliente, categoria y total son obligatorios" });
    }

    const sale = await VentaMensual.findByIdAndUpdate(
      req.params.id,
      { ...payload, month: getMonthFromDate(payload.date) },
      { new: true }
    );

    if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
    return res.json({ message: "Venta actualizada", sale });
  } catch (error) {
    console.error("Error actualizando venta:", error?.message || error);
    return res.status(500).json({ message: "No se pudo actualizar la venta" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const sale = await VentaMensual.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ message: "Venta no encontrada" });
    return res.json({ message: "Venta eliminada" });
  } catch (error) {
    console.error("Error eliminando venta:", error?.message || error);
    return res.status(500).json({ message: "No se pudo eliminar la venta" });
  }
});

export default router;
