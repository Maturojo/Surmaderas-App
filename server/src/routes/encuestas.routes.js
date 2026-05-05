import { Router } from "express";
import EncuestaCliente from "../models/EncuestaCliente.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const IVA_TO_TAX_ID = {
  consumidor_final: "DNI",
  monotributista: "CUIT",
  responsable_inscripto: "CUIT",
  exento: "CUIL",
};

const PRODUCT_OPTIONS = new Set(["madera", "tableros", "herrajes", "servicio_corte", "otro"]);
const REASON_OPTIONS = new Set([
  "lo_necesitaba_ya",
  "ya_los_conozco",
  "me_asesoraron_bien",
  "precio",
  "a_medida",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeArray(value, allowedSet, maxItems = 10) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(item))
    .filter((item) => allowedSet.has(item))
    .slice(0, maxItems);
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function createCouponCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `SM15-${randomPart}`;
    const exists = await EncuestaCliente.exists({ couponCode: code });

    if (!exists) return code;
  }

  return `SM15-${Date.now().toString(36).toUpperCase()}`;
}

router.post("/", async (req, res) => {
  try {
    const fullName = normalizeText(req.body?.fullName);
    const phone = normalizeText(req.body?.phone);
    const email = normalizeText(req.body?.email).toLowerCase();
    const ivaCondition = normalizeText(req.body?.ivaCondition);
    const address = normalizeText(req.body?.address);
    const taxId = normalizeText(req.body?.taxId).replace(/[^\d-]/g, "");
    const taxIdType = IVA_TO_TAX_ID[ivaCondition];

    if (!fullName || !phone || !email || !ivaCondition || !taxId || !address) {
      return res.status(400).json({ message: "Completa todos los datos obligatorios" });
    }

    if (!taxIdType) {
      return res.status(400).json({ message: "Condicion frente al IVA invalida" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Ingresa un mail valido" });
    }

    const rating = Number(req.body?.rating);
    const ratingValue = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
    const choiceReasons = normalizeArray(req.body?.choiceReasons, REASON_OPTIONS, 3);

    const encuesta = await EncuestaCliente.create({
      fullName,
      phone,
      email,
      ivaCondition,
      taxIdType,
      taxId,
      address,
      rating: ratingValue,
      purchasedProducts: normalizeArray(req.body?.purchasedProducts, PRODUCT_OPTIONS),
      choiceReasons,
      purchaseDriver: ["emprendimiento", "personal"].includes(req.body?.purchaseDriver)
        ? req.body.purchaseDriver
        : "",
      npsChoice: ["seguro", "probablemente", "no_se"].includes(req.body?.npsChoice)
        ? req.body.npsChoice
        : "",
      improvement: normalizeText(req.body?.improvement),
      couponCode: await createCouponCode(),
      couponDiscount: 15,
    });

    return res.status(201).json({
      message: "Formulario cargado correctamente",
      coupon: {
        code: encuesta.couponCode,
        discount: encuesta.couponDiscount,
      },
    });
  } catch (error) {
    console.error("Error creando encuesta:", error?.message || error);
    return res.status(500).json({ message: "No se pudo guardar el formulario" });
  }
});

router.get("/", requireAuth, requireRole("admin", "taller", "ventas"), async (_req, res) => {
  try {
    const encuestas = await EncuestaCliente.find({}).sort({ createdAt: -1 }).lean();
    const total = encuestas.length;
    const usedCoupons = encuestas.filter((item) => item.couponUsed).length;
    const ratings = encuestas.map((item) => item.rating).filter(Boolean);
    const averageRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
        : null;

    return res.json({
      summary: {
        total,
        activeCoupons: total - usedCoupons,
        usedCoupons,
        averageRating,
      },
      items: encuestas,
    });
  } catch (error) {
    console.error("Error listando encuestas:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron obtener las encuestas" });
  }
});

router.get("/export", requireAuth, requireRole("admin", "taller", "ventas"), async (_req, res) => {
  try {
    const encuestas = await EncuestaCliente.find({}).sort({ createdAt: -1 }).lean();
    const headers = [
      "fecha",
      "nombre",
      "celular",
      "mail",
      "iva",
      "tipo_documento",
      "documento",
      "direccion",
      "estrellas",
      "productos",
      "motivos",
      "motor_compra",
      "vuelve",
      "mejora",
      "cupon",
      "cupon_usado",
      "fecha_uso",
      "usado_por",
    ];

    const rows = encuestas.map((item) => [
      item.createdAt?.toISOString?.() || "",
      item.fullName,
      item.phone,
      item.email,
      item.ivaCondition,
      item.taxIdType,
      item.taxId,
      item.address,
      item.rating || "",
      item.purchasedProducts?.join(" | ") || "",
      item.choiceReasons?.join(" | ") || "",
      item.purchaseDriver,
      item.npsChoice,
      item.improvement,
      item.couponCode,
      item.couponUsed ? "si" : "no",
      item.couponUsedAt?.toISOString?.() || "",
      item.couponUsedBy || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=encuestas-sur-maderas.csv");
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    console.error("Error exportando encuestas:", error?.message || error);
    return res.status(500).json({ message: "No se pudo exportar el listado" });
  }
});

router.post(
  "/cupones/consultar",
  requireAuth,
  requireRole("admin", "taller", "ventas"),
  async (req, res) => {
    try {
      const couponCode = normalizeText(req.body?.couponCode).toUpperCase();

      if (!couponCode) {
        return res.status(400).json({ message: "Ingresa el numero de cupon" });
      }

      const coupon = await EncuestaCliente.findOne({ couponCode }).lean();

      if (!coupon) {
        return res.status(404).json({ message: "Cupon no encontrado" });
      }

      return res.json({
        message: coupon.couponUsed ? "Cupon ya utilizado" : "Cupon disponible para usar",
        coupon,
      });
    } catch (error) {
      console.error("Error consultando cupon:", error?.message || error);
      return res.status(500).json({ message: "No se pudo consultar el cupon" });
    }
  }
);

router.post(
  "/cupones/validar",
  requireAuth,
  requireRole("admin", "taller", "ventas"),
  async (req, res) => {
    try {
      const couponCode = normalizeText(req.body?.couponCode).toUpperCase();

      if (!couponCode) {
        return res.status(400).json({ message: "Ingresa el numero de cupon" });
      }

      const coupon = await EncuestaCliente.findOne({ couponCode });

      if (!coupon) {
        return res.status(404).json({ message: "Cupon no encontrado" });
      }

      if (coupon.couponUsed) {
        return res.status(409).json({
          message: "Cupon ya utilizado",
          coupon,
        });
      }

      coupon.couponUsed = true;
      coupon.couponUsedAt = new Date();
      coupon.couponUsedBy = req.user?.name || req.user?.username || "Usuario";
      await coupon.save();

      return res.json({
        message: "Cupon validado correctamente",
        coupon,
      });
    } catch (error) {
      console.error("Error validando cupon:", error?.message || error);
      return res.status(500).json({ message: "No se pudo validar el cupon" });
    }
  }
);

export default router;
