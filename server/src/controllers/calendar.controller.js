import CalendarReminder from "../models/CalendarReminder.js";
import NotaPedido from "../models/NotaPedido.js";

function isValidYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function startOfMonth(dateString) {
  const [year, month] = String(dateString).split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function endOfMonth(dateString) {
  const [year, month] = String(dateString).split("-").map(Number);
  const end = new Date(year, month, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

function normalizeReminderPayload(body = {}) {
  return {
    titulo: String(body?.titulo || "").trim(),
    descripcion: String(body?.descripcion || "").trim(),
    fecha: String(body?.fecha || "").trim(),
    prioridad: String(body?.prioridad || "media").trim().toLowerCase(),
    completado: Boolean(body?.completado),
  };
}

function reminderToEvent(doc) {
  const item = doc?.toObject ? doc.toObject() : doc;
  return {
    _id: item._id,
    id: item._id,
    sourceId: item._id,
    type: "recordatorio",
    fecha: item.fecha,
    titulo: item.titulo,
    descripcion: item.descripcion || "",
    prioridad: item.prioridad || "media",
    completado: Boolean(item.completado),
    creadoPor: item.creadoPor || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function notaToEvent(doc) {
  const item = doc?.toObject ? doc.toObject() : doc;
  return {
    _id: item._id,
    id: `nota-${item._id}`,
    sourceId: item._id,
    type: "nota-pedido",
    fecha: item.entrega,
    titulo: item.numero || "Nota de pedido",
    descripcion: item?.cliente?.nombre
      ? `Entrega para ${item.cliente.nombre}`
      : "Entrega de nota de pedido",
    prioridad: "alta",
    completado: item.estadoOperativo === "Finalizado",
    numero: item.numero || "",
    cliente: item.cliente || {},
    vendedor: item.vendedor || "",
    estado: item.estado || "",
    estadoOperativo: item.estadoOperativo || "Pendiente",
    total: Number(item?.totales?.total ?? item?.total ?? 0),
    entrega: item.entrega || "",
    diasHabiles: Number(item?.diasHabiles || 0),
    items: Array.isArray(item?.items) ? item.items : [],
    proveedores: Array.isArray(item?.proveedores) ? item.proveedores : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function listarCalendario(req, res) {
  try {
    const month = String(req.query?.month || "").trim();
    const fecha = String(req.query?.fecha || "").trim();
    const desde = String(req.query?.desde || "").trim();
    const hasta = String(req.query?.hasta || "").trim();

    let rangeStart = "";
    let rangeEnd = "";

    if (isValidYmd(fecha)) {
      rangeStart = fecha;
      rangeEnd = fecha;
    } else if (/^\d{4}-\d{2}$/.test(month)) {
      rangeStart = startOfMonth(`${month}-01`);
      rangeEnd = endOfMonth(`${month}-01`);
    } else if (isValidYmd(desde) && isValidYmd(hasta)) {
      rangeStart = desde;
      rangeEnd = hasta;
    } else {
      return res.status(400).json({ message: "Tenes que indicar month, fecha o desde/hasta" });
    }

    const [recordatorios, notas] = await Promise.all([
      CalendarReminder.find({ fecha: { $gte: rangeStart, $lte: rangeEnd } }).sort({ fecha: 1, createdAt: 1 }),
      NotaPedido.find({ entrega: { $gte: rangeStart, $lte: rangeEnd } }).sort({ entrega: 1, createdAt: 1 }),
    ]);

    const eventos = [...recordatorios.map(reminderToEvent), ...notas.map(notaToEvent)].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return String(a.titulo || "").localeCompare(String(b.titulo || ""));
    });

    const byDay = eventos.reduce((acc, item) => {
      if (!acc[item.fecha]) acc[item.fecha] = [];
      acc[item.fecha].push(item);
      return acc;
    }, {});

    return res.json({
      desde: rangeStart,
      hasta: rangeEnd,
      eventos,
      byDay,
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Error obteniendo calendario" });
  }
}

export async function crearRecordatorio(req, res) {
  try {
    const payload = normalizeReminderPayload(req.body);
    if (!payload.titulo) {
      return res.status(400).json({ message: "Falta el titulo del recordatorio" });
    }
    if (!isValidYmd(payload.fecha)) {
      return res.status(400).json({ message: "La fecha del recordatorio no es valida" });
    }
    if (!["baja", "media", "alta"].includes(payload.prioridad)) {
      return res.status(400).json({ message: "La prioridad del recordatorio no es valida" });
    }

    const created = await CalendarReminder.create({
      ...payload,
      creadoPor: req.user?.name || req.user?.username || "",
    });

    return res.status(201).json(reminderToEvent(created));
  } catch (error) {
    return res.status(400).json({ message: error?.message || "Error creando recordatorio" });
  }
}

export async function actualizarRecordatorio(req, res) {
  try {
    const payload = normalizeReminderPayload(req.body);
    if (!payload.titulo) {
      return res.status(400).json({ message: "Falta el titulo del recordatorio" });
    }
    if (!isValidYmd(payload.fecha)) {
      return res.status(400).json({ message: "La fecha del recordatorio no es valida" });
    }
    if (!["baja", "media", "alta"].includes(payload.prioridad)) {
      return res.status(400).json({ message: "La prioridad del recordatorio no es valida" });
    }

    const updated = await CalendarReminder.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Recordatorio no encontrado" });
    }

    return res.json(reminderToEvent(updated));
  } catch (error) {
    return res.status(400).json({ message: error?.message || "Error actualizando recordatorio" });
  }
}

export async function eliminarRecordatorio(req, res) {
  try {
    const deleted = await CalendarReminder.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Recordatorio no encontrado" });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Error eliminando recordatorio" });
  }
}
