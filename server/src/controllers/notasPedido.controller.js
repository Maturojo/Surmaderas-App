import NotaPedido from "../models/NotaPedido.js";

function getClienteNombre(doc) {
  if (typeof doc?.cliente === "string") return doc.cliente;
  return doc?.cliente?.nombre || "";
}

function telefonoValido(value) {
  return /^\d{10}$/.test(String(value || "").replace(/\D/g, ""));
}

function formatearTelefono(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);

  if (digits.startsWith("11")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getClienteTelefono(doc) {
  if (typeof doc?.cliente === "string") return "";
  return doc?.cliente?.telefono || "";
}

function normalizeNotaPayload(body = {}) {
  const clienteBody = body?.cliente;
  const cliente =
    typeof clienteBody === "string"
      ? { nombre: clienteBody, telefono: "", direccion: "" }
      : {
          nombre: String(clienteBody?.nombre || ""),
          telefono: String(clienteBody?.telefono || ""),
          direccion: String(clienteBody?.direccion || ""),
        };

  const totalesBody = body?.totales || {};
  const total = Number(totalesBody?.total ?? body?.total ?? 0);

  return {
    numero: String(body?.numero || ""),
    fecha: String(body?.fecha || ""),
    entrega: String(body?.entrega || ""),
    diasHabiles: Number(body?.diasHabiles || 0),
    cliente,
    vendedor: String(body?.vendedor || ""),
    medioPago: String(body?.medioPago || ""),
    items: Array.isArray(body?.items) ? body.items : [],
    total,
    totales: {
      subtotal: Number(totalesBody?.subtotal || 0),
      descuento: Number(totalesBody?.descuento || 0),
      total,
      adelanto: Number(totalesBody?.adelanto || 0),
      resta: Number(totalesBody?.resta || 0),
    },
    pdfBase64: String(body?.pdfBase64 || ""),
    estado: String(body?.estado || "pendiente"),
    caja: body?.caja || undefined,
  };
}

function enrichNota(doc) {
  const item = doc?.toObject ? doc.toObject() : doc;
  item.clienteNombre = getClienteNombre(item);
  item.clienteTelefono = getClienteTelefono(item);
  item.total = Number(item?.totales?.total ?? item?.total ?? 0);
  return item;
}

export async function listarNotasPedido(req, res) {
  try {
    const { q = "", page = 1, limit = 25, guardada } = req.query;

    const filter = {};
    if (guardada === "true") {
      filter["caja.guardada"] = true;
    } else if (guardada === "false") {
      filter.$or = [{ "caja.guardada": { $exists: false } }, { "caja.guardada": false }];
    }

    if (q) {
      const rx = new RegExp(String(q), "i");
      const searchClauses = [
        { numero: rx },
        { cliente: rx },
        { "cliente.nombre": rx },
        { "cliente.telefono": rx },
        { vendedor: rx },
        { entrega: rx },
        { estado: rx },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchClauses }];
        delete filter.$or;
      } else {
        filter.$or = searchClauses;
      }
    }

    const p = Math.max(1, Number(page || 1));
    const l = Math.min(500, Math.max(1, Number(limit || 25)));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      NotaPedido.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l),
      NotaPedido.countDocuments(filter),
    ]);

    res.json({ items: items.map(enrichNota), page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error listando notas" });
  }
}

export async function crearNotaPedido(req, res) {
  try {
    const payload = normalizeNotaPayload(req.body);
    if (!String(payload?.cliente?.nombre || "").trim()) {
      return res.status(400).json({ message: "Falta el nombre del cliente" });
    }
    if (!String(payload?.cliente?.telefono || "").trim()) {
      return res.status(400).json({ message: "Falta el telefono del cliente" });
    }
    if (!telefonoValido(payload?.cliente?.telefono)) {
      return res.status(400).json({ message: "El telefono debe tener formato valido, por ejemplo 223-595-4165" });
    }
    payload.cliente.telefono = formatearTelefono(payload.cliente.telefono);
    const doc = await NotaPedido.create(payload);
    res.status(201).json(enrichNota(doc));
  } catch (e) {
    res.status(400).json({ message: e?.message || "Error creando nota" });
  }
}

export async function obtenerNotaPedido(req, res) {
  try {
    const { id } = req.params;
    const doc = await NotaPedido.findById(id);
    if (!doc) return res.status(404).json({ message: "Nota no encontrada" });
    res.json(enrichNota(doc));
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

    res.json(enrichNota(updated));
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error guardando caja" });
  }
}
