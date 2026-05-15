import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import HistorialAccion from "../models/HistorialAccion.js";
import NotaPedido from "../models/NotaPedido.js";
import VentaMensual from "../models/VentaMensual.js";
import VentasObjetivo from "../models/VentasObjetivo.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "ventas"));

function normalizeMonth(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 7);
}

function normalizeSellerLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "Sin vendedor asignado";
  if (text.toLowerCase().startsWith("importacion")) return "Sin vendedor asignado";
  return text;
}

function addMetric(map, label, amount = 0, count = 1, extra = {}) {
  const key = String(label || "").trim() || "Sin dato";
  const current = map.get(key) || { label: key, total: 0, count: 0, ...extra };
  current.total += Number(amount || 0);
  current.count += Number(count || 0);
  Object.assign(current, extra);
  map.set(key, current);
}

function sortMetrics(map) {
  return [...map.values()].sort((a, b) => {
    if ((b.total || 0) !== (a.total || 0)) return (b.total || 0) - (a.total || 0);
    return (b.count || 0) - (a.count || 0);
  });
}

function getItemLabel(item = {}) {
  if (item.nombre) return item.nombre;
  if (item.name) return item.name;
  if (item.producto) return item.producto;
  if (item.descripcion) return item.descripcion;
  if (item.detalle) return item.detalle;
  if (item.tipo) return item.tipo;
  if (item.data?.nombre) return item.data.nombre;
  if (item.data?.producto) return item.data.producto;
  return "Concepto sin nombre";
}

function getItemQuantity(item = {}) {
  const value = item.cantidad ?? item.qty ?? item.quantity ?? item.data?.cantidad ?? 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getItemAmount(item = {}) {
  const candidates = [
    item.total,
    item.subtotal,
    item.precioTotal,
    item.importe,
    item.precio,
    item.data?.total,
    item.data?.subtotal,
    item.data?.precio,
  ];
  const found = candidates.find((value) => Number.isFinite(Number(value)));
  return Number(found || 0);
}

function getSummary(items, goal) {
  const salesTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const commissionTotal = items.reduce((sum, item) => sum + Number(item.commission || 0), 0);
  const pendingTotal = items
    .filter((item) => item.paymentStatus === "pendiente")
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  return {
    salesTotal,
    commissionTotal,
    pendingTotal,
    salesGoal: goal?.salesGoal || 0,
    commissionGoal: goal?.commissionGoal || 0,
    salesRemaining: Math.max(0, Number(goal?.salesGoal || 0) - salesTotal),
    commissionRemaining: Math.max(0, Number(goal?.commissionGoal || 0) - commissionTotal),
  };
}

router.get("/", async (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    const [sales, goal, notes, moduleEvents] = await Promise.all([
      VentaMensual.find({ month }).sort({ date: 1, createdAt: 1 }).lean(),
      VentasObjetivo.findOne({ month }).lean(),
      NotaPedido.find({ createdAt: { $gte: monthStart, $lt: nextMonth } }, "numero cliente vendedor items total totales createdAt").lean(),
      HistorialAccion.find({
        tipo: "uso_modulo",
        createdAt: { $gte: monthStart, $lt: nextMonth },
      }).lean(),
    ]);

    const bySeller = new Map();
    const byCategory = new Map();
    const bySubcategory = new Map();
    const byClient = new Map();
    const byPayment = new Map();
    const bySaleType = new Map();

    sales.forEach((sale) => {
      const sellerLabel = normalizeSellerLabel(sale.createdBy);
      addMetric(bySeller, sellerLabel, sale.total, 1, {
        commission: (bySeller.get(sellerLabel)?.commission || 0) + Number(sale.commission || 0),
      });
      addMetric(byCategory, sale.category || "Sin categoria", sale.total);
      addMetric(bySubcategory, sale.subcategory || "Sin subcategoria", sale.total);
      addMetric(byClient, sale.client || "Sin cliente", sale.total);
      addMetric(byPayment, sale.paymentStatus || "Sin estado", sale.total);
      addMetric(bySaleType, sale.saleType || "Sin tipo", sale.total);
    });

    const soldItems = new Map();
    notes.forEach((note) => {
      (Array.isArray(note.items) ? note.items : []).forEach((item) => {
        addMetric(soldItems, getItemLabel(item), getItemAmount(item), getItemQuantity(item));
      });
    });

    const moduleUsage = new Map();
    moduleEvents.forEach((event) => {
      addMetric(moduleUsage, event.subcategoria || event.descripcion || "Modulo", 0, Number(event.cantidad || 1), {
        category: event.categoria || "",
      });
    });

    res.json({
      month,
      summary: getSummary(sales, goal),
      totals: {
        salesCount: sales.length,
        notesCount: notes.length,
        moduleEventsCount: moduleEvents.length,
      },
      rankings: {
        sellers: sortMetrics(bySeller).map((item) => ({ ...item, commission: item.commission || 0 })),
        categories: sortMetrics(byCategory),
        subcategories: sortMetrics(bySubcategory),
        clients: sortMetrics(byClient),
        payments: sortMetrics(byPayment),
        saleTypes: sortMetrics(bySaleType),
        soldItems: sortMetrics(soldItems),
        moduleUsage: sortMetrics(moduleUsage),
      },
    });
  } catch (error) {
    console.error("Error cargando estadisticas:", error?.message || error);
    res.status(500).json({ message: "No se pudieron cargar las estadisticas" });
  }
});

router.post("/uso", async (req, res) => {
  try {
    const modulo = String(req.body?.modulo || "").trim();
    const categoria = String(req.body?.categoria || "modulo").trim();

    if (!modulo) {
      return res.status(400).json({ message: "Modulo obligatorio" });
    }

    await HistorialAccion.create({
      tipo: "uso_modulo",
      descripcion: modulo,
      cantidad: 1,
      categoria,
      subcategoria: modulo,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "No se pudo registrar el uso" });
  }
});

export default router;
