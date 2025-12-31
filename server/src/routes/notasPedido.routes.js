import { Router } from "express";
import NotaPedido from "../models/NotaPedido.js";

const router = Router();

/* ===============================
   Middleware: clave de caja
   Header requerido: x-caja-key
   (CAJA_KEY en .env)
================================ */
function requireCajaKey(req, res, next) {
  const key = req.headers["x-caja-key"];
  if (!process.env.CAJA_KEY) {
    return res.status(500).json({ message: "CAJA_KEY no configurada en el servidor" });
  }
  if (!key || key !== process.env.CAJA_KEY) {
    return res.status(403).json({ message: "Clave de caja incorrecta" });
  }
  next();
}

/* ===============================
   Crear Nota de Pedido (VENDEDOR)
   POST /api/notas-pedido
   - No guarda descuento/adelanto/medio pago desde vendedor.
   - Calcula subtotal/total “lista”.
================================ */
router.post("/", async (req, res) => {
  try {
    const { numero, fecha, entrega, diasHabiles, cliente, vendedor, pdfBase64 } = req.body;

    // aceptar items en raíz o dentro de entrega (compatibilidad)
    const items = req.body.items ?? req.body?.entrega?.items ?? [];

    if (!numero) return res.status(400).json({ message: "Falta numero" });
    if (!fecha) return res.status(400).json({ message: "Falta fecha" });
    if (!entrega) return res.status(400).json({ message: "Falta entrega" });
    if (!cliente?.nombre) return res.status(400).json({ message: "Falta cliente.nombre" });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items vacíos" });

    // total lista
    const subtotal = items.reduce(
      (acc, it) => acc + Number(it.cantidad || 0) * Number(it.precioUnit || 0),
      0
    );

    const creada = await NotaPedido.create({
      numero,
      fecha,
      entrega,
      diasHabiles: Number(diasHabiles || 0),
      cliente,
      vendedor: vendedor || "",
      items,

      // compat: guardo totales lista en tu estructura original
      totales: {
        subtotal,
        descuento: 0,
        total: subtotal,
        adelanto: 0,
        resta: subtotal,
      },

      // compat: medioPago vacío al crear
      medioPago: "",

      // caja inicial vacía
      caja: {
        ajuste: { modo: "sin", descuentoMonto: 0, descuentoPct: 0, precioEspecial: 0, motivo: "" },
        pago: { tipo: "", adelanto: 0, estado: "pendiente", updatedAt: null },
        totales: { descuentoAplicado: 0, totalFinal: subtotal, resta: subtotal },
      },

      pdfBase64: pdfBase64 || "",
    });

    return res.status(201).json(creada);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "El numero de nota ya existe (duplicado)" });
    }
    return res.status(500).json({ message: "Error creando nota", error: err.message });
  }
});

/* ===============================
   Listar notas (historial)
   GET /api/notas-pedido?q=&page=&limit=&estado=&vendedor=&from=&to=&dateField=fecha|entrega&userId=
================================ */
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

    const query = String(q || "").trim();
    if (query) {
      filter.$or = [
        { numero: { $regex: query, $options: "i" } },
        { "cliente.nombre": { $regex: query, $options: "i" } },
        { "cliente.telefono": { $regex: query, $options: "i" } },
      ];
    }

    if (String(estado).trim()) filter.estado = String(estado).trim();
    if (String(vendedor).trim()) filter.vendedor = String(vendedor).trim();
    if (String(userId).trim()) filter.userId = String(userId).trim();

    const df = dateField === "entrega" ? "entrega" : "fecha";
    if (from || to) {
      filter[df] = {};
      if (from) filter[df].$gte = String(from);
      if (to) filter[df].$lte = String(to);
    }

    const projection = { pdfBase64: 0, __v: 0 };

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
    return res.status(500).json({ message: "Error listando notas", error: err.message });
  }
});

/* ===============================
   Obtener nota por ID (detalle)
   GET /api/notas-pedido/:id
================================ */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await NotaPedido.findById(id).lean();
    if (!item) return res.status(404).json({ message: "Nota no encontrada" });

    return res.json({ ok: true, item });
  } catch (err) {
    return res.status(500).json({ message: "Error obteniendo nota", error: err.message });
  }
});

/* ===============================
   Actualizar CAJA (protegiendo con clave)
   PUT /api/notas-pedido/:id/caja
   Body:
   {
     ajuste: { modo, descuentoMonto, descuentoPct, precioEspecial, motivo? },
     pago: { tipo, adelanto }
   }
================================ */
  router.put("/:id/caja", async (req, res) => {
  try {
    const { id } = req.params;
    const { ajuste = {}, pago = {} } = req.body || {};

    const nota = await NotaPedido.findById(id);
    if (!nota) return res.status(404).json({ message: "Nota no encontrada" });

    // ✅ asegurá subdocumentos
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

    const rawTipo = String(pago.tipo || "").trim();

    // normaliza a valores esperados por enum (minúsculas)
    const tipo = rawTipo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // saca acentos

    // opcional: mapeos por si viene con otras palabras
    const tipoMap = {
      "transf": "transferencia",
      "transferencia": "transferencia",
      "efectivo": "efectivo",
      "debito": "debito",
      "débito": "debito",
      "credito": "credito",
      "crédito": "credito",
      "qr": "qr",
      "mixto": "mixto",
      "otro": "otro",
    };

    const tipoFinal = tipoMap[tipo] || tipo; // fallback

    const adelanto = Math.max(0, Number(pago.adelanto || 0));
    const resta = totalFinal - adelanto;

    const estadoPago = resta <= 0 ? "pagado" : adelanto > 0 ? "parcial" : "pendiente";

    // Guardado en caja (fuente de verdad)
    nota.caja = {
      ajuste: {
        modo,
        descuentoMonto,
        descuentoPct,
        precioEspecial,
        motivo: String(ajuste.motivo || ""),
      },
      pago: {
        tipoFinal,
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

    // Compatibilidad con campos viejos
    nota.medioPago = tipo || "";
    nota.totales.descuento = descuentoAplicado;
    nota.totales.total = totalFinal;
    nota.totales.adelanto = adelanto;
    nota.totales.resta = resta;

    await nota.save();

    return res.json({ ok: true, item: nota });
  } catch (err) {
    // ✅ devolvé más info para debug
    return res.status(500).json({
      message: "Error actualizando caja",
      error: err.message,
      stack: err.stack, // si no querés exponer stack, sacalo luego
    });
  }
});



/* ===============================
   Guardar/actualizar PDF de una nota
   PATCH /api/notas-pedido/:id/pdf
================================ */
router.patch("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfBase64 } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ message: "Falta pdfBase64" });
    }

    const updated = await NotaPedido.findByIdAndUpdate(id, { pdfBase64 }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Nota no encontrada" });

    return res.json({ ok: true, item: updated });
  } catch (err) {
    return res.status(500).json({ message: "Error guardando PDF", error: err.message });
  }
});

export default router;
