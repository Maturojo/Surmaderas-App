import NotaPedido from "../models/NotaPedido.js";

import { colorProveedorPorNombre } from "../utils/proveedorColor.js";

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

function sameMoney(a, b) {
  return Math.round(Number(a || 0) * 100) === Math.round(Number(b || 0) * 100);
}

function normalizeComprobantePayload(item = {}) {
  if (!item?.dataUrl) return null;
  return {
    nombre: String(item?.nombre || "comprobante"),
    tipo: String(item?.tipo || ""),
    dataUrl: String(item?.dataUrl || ""),
    monto: Number(item?.monto || 0),
  };
}

function normalizeComprobantesPayload({ comprobantes, comprobante }) {
  const list = Array.isArray(comprobantes) ? comprobantes : [];
  const normalized = list.map(normalizeComprobantePayload).filter(Boolean);
  const legacy = normalizeComprobantePayload(comprobante);
  if (!normalized.length && legacy) return [legacy];
  return normalized;
}

function sumComprobantesMonto(comprobantes = []) {
  return comprobantes.reduce((sum, item) => sum + Number(item?.monto || 0), 0);
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

  const items = Array.isArray(body?.items)
    ? body.items.map((item = {}) => ({
        ...item,
        data: item?.data && typeof item.data === "object" ? item.data : {},
        imagen: item?.imagen || item?.data?.imagen || null,
      }))
    : [];

  return {
    numero: String(body?.numero || ""),
    fecha: String(body?.fecha || ""),
    entrega: String(body?.entrega || ""),
    diasHabiles: Number(body?.diasHabiles || 0),
    cliente,
    vendedor: String(body?.vendedor || ""),
    medioPago: String(body?.medioPago || ""),
    items,
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
  item.estadoOperativo = item?.estadoOperativo || "Pendiente";
  item.proveedores = Array.isArray(item?.proveedores) ? item.proveedores : [];
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
        { estadoOperativo: rx },
        { "proveedores.nombre": rx },
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

    const listSelect = [
      "numero",
      "fecha",
      "entrega",
      "cliente",
      "vendedor",
      "estado",
      "estadoOperativo",
      "proveedores",
      "total",
      "totales",
      "createdAt",
      "updatedAt",
      "caja.guardada",
      "caja.tipo",
      "caja.monto",
      "caja.subtotal",
      "caja.descuento",
      "caja.total",
      "caja.adelanto",
      "caja.resta",
      "caja.fecha",
      "caja.metodo",
      "caja.nota",
      "caja.comprobantes",
      "caja.comprobante",
    ].join(" ");

    const [items, total] = await Promise.all([
      NotaPedido.find(filter).select(listSelect).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
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
    if (!String(payload?.vendedor || "").trim()) {
      return res.status(400).json({ message: "Falta el vendedor de la nota" });
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
    const {
      tipo = "pago",
      monto = 0,
      subtotal = undefined,
      descuento = 0,
      total = undefined,
      adelanto = undefined,
      resta = undefined,
      metodo = "",
      nota = "",
      comprobante = null,
      comprobantes = [],
    } = req.body;

    const notaActual = await NotaPedido.findById(id);
    if (!notaActual) return res.status(404).json({ message: "Nota no encontrada" });

    const t = String(tipo).toLowerCase();
    const esSena = t === "seña" || t === "sena" || t === "senia";
    const esPago = t === "pago";
    const estado = esSena ? "señada" : esPago ? "pagada" : "pendiente";
    const subtotalNota = Number(notaActual?.totales?.subtotal ?? notaActual?.total ?? 0);
    const subtotalCaja = Math.max(0, Number(subtotal ?? subtotalNota));
    const descuentoPedido = Math.min(subtotalCaja, Math.max(0, Number(descuento || 0)));
    const descuentoCaja = subtotalCaja < 100000 && !esPago ? 0 : descuentoPedido;
    const totalCalculado = Math.max(0, Math.round((subtotalCaja - descuentoCaja) * 100) / 100);
    const totalCajaPedido = Number(total ?? totalCalculado);
    const totalCaja = sameMoney(totalCajaPedido, totalCalculado) ? totalCajaPedido : totalCalculado;
    const adelantoCaja = esSena ? Math.min(totalCaja, Math.max(0, Number(adelanto ?? monto))) : 0;
    const restaCaja = esPago ? 0 : Math.max(0, Number(resta ?? totalCaja - adelantoCaja));
    const montoNumero = esPago ? totalCaja : Number(monto || 0);
    const guardarImportesNota = esSena || esPago;
    const metodoTexto = String(metodo || "");
    const esEfectivo = metodoTexto.toLowerCase() === "efectivo";
    const guardaComprobante = esPago || (esSena && !esEfectivo);
    const comprobantesPayload = (esSena || esPago)
      ? normalizeComprobantesPayload({ comprobantes, comprobante })
      : [];
    const montoComprobantes = sumComprobantesMonto(comprobantesPayload);

    if (esSena && !(montoNumero > 0)) {
      return res.status(400).json({ message: "Si la nota queda señada, el monto debe ser mayor a 0" });
    }

    if (guardaComprobante) {
      if (!comprobantesPayload.length) {
        return res.status(400).json({ message: "Tenes que adjuntar al menos un comprobante para este medio de pago" });
      }

      if (comprobantesPayload.some((item) => !(Number(item?.monto || 0) > 0))) {
        return res.status(400).json({ message: "Tenes que cargar el monto de cada comprobante" });
      }

      if (!sameMoney(montoComprobantes, montoNumero)) {
        return res.status(400).json({ message: "La suma de los comprobantes no coincide con el monto de caja" });
      }
    }

    const update = {
      estado,
      caja: {
        guardada: true,
        tipo: esSena ? "seña" : esPago ? "pago" : "",
        monto: esSena || esPago ? montoNumero : 0,
        subtotal: guardarImportesNota ? subtotalCaja : 0,
        descuento: guardarImportesNota ? descuentoCaja : 0,
        total: guardarImportesNota ? totalCaja : 0,
        adelanto: guardarImportesNota ? adelantoCaja : 0,
        resta: guardarImportesNota ? restaCaja : 0,
        metodo: esSena || esPago ? metodoTexto : "",
        nota: String(nota || ""),
        comprobante: comprobantesPayload[0],
        comprobantes: comprobantesPayload,
        fecha: new Date(),
      },
    };

    if (guardarImportesNota) {
      update.total = totalCaja;
      update["totales.subtotal"] = subtotalCaja;
      update["totales.descuento"] = descuentoCaja;
      update["totales.total"] = totalCaja;
      update["totales.adelanto"] = adelantoCaja;
      update["totales.resta"] = restaCaja;
    }

    const updated = await NotaPedido.findByIdAndUpdate(id, update, { new: true });

    res.json(enrichNota(updated));
  } catch (e) {
    res.status(500).json({ message: e?.message || "Error guardando caja" });
  }
}

export async function actualizarOperacionNota(req, res) {
  try {
    const { id } = req.params;
    const estadoOperativo = String(req.body?.estadoOperativo || "Pendiente").trim() || "Pendiente";
    const proveedores = Array.isArray(req.body?.proveedores)
      ? req.body.proveedores
          .map((item) => ({
            proveedorId: item?.proveedorId,
            nombre: String(item?.nombre || "").trim(),
            color: String(item?.color || colorProveedorPorNombre(item?.nombre)).trim(),
            observacion: String(item?.observacion || "").trim(),
            enviadoWhatsapp: Boolean(item?.enviadoWhatsapp),
            asignadoAt: item?.asignadoAt ? new Date(item.asignadoAt) : new Date(),
          }))
          .filter((item) => item.proveedorId && item.nombre)
      : [];

    const estadosPermitidos = new Set(["Pendiente", "En taller", "Enviado a proveedor", "Finalizado"]);
    if (!estadosPermitidos.has(estadoOperativo)) {
      return res.status(400).json({ message: "Estado operativo invalido" });
    }

    if (estadoOperativo === "Enviado a proveedor" && proveedores.length === 0) {
      return res.status(400).json({ message: "Tenes que asignar al menos un proveedor" });
    }

    const updated = await NotaPedido.findByIdAndUpdate(
      id,
      { $set: { estadoOperativo, proveedores } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Nota no encontrada" });

    res.json(enrichNota(updated));
  } catch (e) {
    res.status(400).json({ message: e?.message || "Error actualizando operacion de la nota" });
  }
}
