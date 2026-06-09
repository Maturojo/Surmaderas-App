import { Router } from "express";
import EncuestaCliente from "../models/EncuestaCliente.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { syncEncuestaToDoppler } from "../services/doppler.js";

const router = Router();

const IVA_TO_TAX_ID = {
  consumidor_final: "DNI",
  monotributista: "CUIT",
  responsable_inscripto: "CUIT",
  exento: "CUIL",
};

const PRODUCT_OPTIONS = new Set([
  "madera",
  "tableros",
  "herrajes",
  "servicio_corte",
  "otro",
  "cortes_placas",
  "listoneria",
  "molduras",
  "marcos_portarretratos",
  "productos_muebles_estandar",
  "proyecto_producto_medida",
  "productos_varios",
  "artistica",
]);
const REASON_OPTIONS = new Set([
  "lo_necesitaba_ya",
  "ya_los_conozco",
  "me_asesoraron_bien",
  "precio",
  "a_medida",
]);
const BRANCH_OPTIONS = new Set(["luro", "independencia"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function isValidBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const oldest = new Date();
  oldest.setFullYear(today.getFullYear() - 120);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date <= today &&
    date >= oldest
  );
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) digits = digits.slice(2);
  while (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.startsWith("15")) {
    digits = `911${digits.slice(2)}`;
  } else if (digits.length >= 5 && digits.slice(2, 4) === "15") {
    digits = `9${digits.slice(0, 2)}${digits.slice(4)}`;
  } else if (digits.length >= 6 && digits.slice(3, 5) === "15") {
    digits = `9${digits.slice(0, 3)}${digits.slice(5)}`;
  } else if (digits.length === 10 && !digits.startsWith("9")) {
    digits = `9${digits}`;
  }

  return digits;
}

function formatPhoneForDisplay(value) {
  const digits = normalizePhone(value);
  if (digits.startsWith("911") && digits.length === 11) {
    return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return value;
}

function isExpired(coupon) {
  return coupon?.couponExpiresAt && new Date(coupon.couponExpiresAt).getTime() < Date.now();
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

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildEncuestasExportRows(encuestas) {
  const headers = [
    "fecha",
    "nombre",
    "celular",
    "mail",
    "sucursal",
    "iva",
    "tipo_documento",
    "documento",
    "direccion",
    "fecha_nacimiento",
    "estrellas",
    "productos",
    "motivos",
    "motor_compra",
    "vuelve",
    "mejora",
    "cupon",
    "cupon_usado",
    "cupon_vencimiento",
    "fecha_uso",
    "usado_por",
  ];

  const rows = encuestas.map((item) => [
    item.createdAt?.toISOString?.() || "",
    item.fullName,
    item.phone,
    item.email,
    item.branch || "",
    item.ivaCondition,
    item.taxIdType,
    item.taxId,
    item.address,
    item.birthDate || "",
    item.rating || "",
    item.purchasedProducts?.join(" | ") || "",
    item.choiceReasons?.join(" | ") || "",
    item.purchaseDriver,
    item.npsChoice,
    item.improvement,
    item.couponCode,
    item.couponUsed ? "si" : "no",
    item.couponExpiresAt?.toISOString?.() || "",
    item.couponUsedAt?.toISOString?.() || "",
    item.couponUsedBy || "",
  ]);

  return { headers, rows };
}

const COUPON_NUMBER_START = 111;
const COUPON_NUMBER_END = 999;
const COUPON_NUMBERS_PER_LETTER_BLOCK = COUPON_NUMBER_END - COUPON_NUMBER_START + 1;
const COUPON_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COUPON_CODE_REGEX = /^[A-Z]{3}\d{3}$/;

function indexToLetters(index) {
  const first = Math.floor(index / (COUPON_LETTERS.length * COUPON_LETTERS.length));
  const second = Math.floor(index / COUPON_LETTERS.length) % COUPON_LETTERS.length;
  const third = index % COUPON_LETTERS.length;

  return `${COUPON_LETTERS[first]}${COUPON_LETTERS[second]}${COUPON_LETTERS[third]}`;
}

function sequenceToCouponCode(sequence) {
  const letterBlock = Math.floor(sequence / COUPON_NUMBERS_PER_LETTER_BLOCK);
  const number = COUPON_NUMBER_START + (sequence % COUPON_NUMBERS_PER_LETTER_BLOCK);
  const letters = indexToLetters(letterBlock);

  if (letters.includes("undefined")) return null;

  return `${letters}${number}`;
}

async function createCouponCode() {
  const existingCoupons = await EncuestaCliente.find({
    couponCode: COUPON_CODE_REGEX,
  })
    .select("couponCode")
    .lean();

  const usedCodes = new Set(existingCoupons.map((coupon) => coupon.couponCode));
  const maxSequence = COUPON_LETTERS.length ** 3 * COUPON_NUMBERS_PER_LETTER_BLOCK;

  for (let sequence = 0; sequence < maxSequence; sequence += 1) {
    const code = sequenceToCouponCode(sequence);
    if (!code) break;

    if (!usedCodes.has(code)) return code;
  }

  throw new Error("No quedan codigos de cupon disponibles");
}

router.post("/", async (req, res) => {
  try {
    const fullName = normalizeText(req.body?.fullName);
    const phoneNormalized = normalizePhone(req.body?.phone);
    const phone = formatPhoneForDisplay(req.body?.phone);
    const email = normalizeText(req.body?.email).toLowerCase();
    const branch = normalizeText(req.body?.branch);
    const ivaCondition = normalizeText(req.body?.ivaCondition);
    const address = normalizeText(req.body?.address);
    const birthDate = normalizeText(req.body?.birthDate);
    const taxId = normalizeText(req.body?.taxId).replace(/[^\d-]/g, "");
    const taxIdType = IVA_TO_TAX_ID[ivaCondition];

    if (!fullName || !phoneNormalized || !email || !ivaCondition || !taxId || !address || !branch || !birthDate) {
      return res.status(400).json({ message: "Completa todos los datos obligatorios" });
    }

    if (!BRANCH_OPTIONS.has(branch)) {
      return res.status(400).json({ message: "Selecciona una sucursal valida" });
    }

    if (phoneNormalized.length !== 11) {
      return res.status(400).json({ message: "Ingresa un celular argentino valido de 11 digitos, sin 0 ni 15" });
    }

    if (!taxIdType) {
      return res.status(400).json({ message: "Condicion frente al IVA invalida" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Ingresa un mail valido" });
    }

    if (!isValidBirthDate(birthDate)) {
      return res.status(400).json({ message: "Ingresa una fecha de nacimiento valida" });
    }

    const existing = await EncuestaCliente.findOne({
      $or: [{ email }, { taxId }, { phoneNormalized }, { phone }],
    }).lean();

    if (existing) {
      const repeatedField =
        existing.email === email
          ? "mail"
          : existing.taxId === taxId
            ? taxIdType
            : "celular";

      return res.status(409).json({
        message: `Ya existe un registro con ese ${repeatedField}. Si ya tenes cupon, consultalo en caja.`,
      });
    }

    const rating = Number(req.body?.rating);
    const ratingValue = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
    const choiceReasons = normalizeArray(req.body?.choiceReasons, REASON_OPTIONS, 3);

    const encuesta = await EncuestaCliente.create({
      fullName,
      phone,
      phoneNormalized,
      email,
      branch,
      ivaCondition,
      taxIdType,
      taxId,
      address,
      birthDate,
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
      couponExpiresAt: addDays(new Date(), 30),
    });

    try {
      const dopplerResult = await syncEncuestaToDoppler(encuesta);
      if (!dopplerResult.skipped) {
        encuesta.dopplerSyncedAt = new Date();
        encuesta.dopplerSyncError = "";
        await encuesta.save();
      }
    } catch (dopplerError) {
      encuesta.dopplerSyncError = dopplerError?.message || "No se pudo sincronizar con Doppler";
      await encuesta.save();
      console.error("Error sincronizando Doppler:", encuesta.dopplerSyncError);
    }

    return res.status(201).json({
      message: "Formulario cargado correctamente",
      coupon: {
        code: encuesta.couponCode,
        discount: encuesta.couponDiscount,
        expiresAt: encuesta.couponExpiresAt,
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
    const expiredCoupons = encuestas.filter((item) => !item.couponUsed && isExpired(item)).length;
    const ratings = encuestas.map((item) => item.rating).filter(Boolean);
    const averageRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
        : null;

    return res.json({
      summary: {
        total,
        activeCoupons: encuestas.filter((item) => !item.couponUsed && !isExpired(item)).length,
        usedCoupons,
        expiredCoupons,
        averageRating,
      },
      items: encuestas,
    });
  } catch (error) {
    console.error("Error listando encuestas:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron obtener las encuestas" });
  }
});

router.delete("/", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const result = await EncuestaCliente.deleteMany({});

    return res.json({
      message: "Datos del formulario reiniciados correctamente",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("Error reiniciando encuestas:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron reiniciar los datos" });
  }
});

router.get("/export", requireAuth, requireRole("admin", "taller", "ventas"), async (_req, res) => {
  try {
    const encuestas = await EncuestaCliente.find({}).sort({ createdAt: -1 }).lean();
    const { headers, rows } = buildEncuestasExportRows(encuestas);

    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=encuestas-sur-maderas.csv");
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    console.error("Error exportando encuestas:", error?.message || error);
    return res.status(500).json({ message: "No se pudo exportar el listado" });
  }
});

router.get("/export/excel", requireAuth, requireRole("admin", "taller", "ventas"), async (_req, res) => {
  try {
    const encuestas = await EncuestaCliente.find({}).sort({ createdAt: -1 }).lean();
    const { headers, rows } = buildEncuestasExportRows(encuestas);
    const tableRows = [headers, ...rows]
      .map((row, index) => {
        const tag = index === 0 ? "th" : "td";
        return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
      })
      .join("");
    const excelHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=encuestas-sur-maderas.xls");
    return res.send(`\uFEFF${excelHtml}`);
  } catch (error) {
    console.error("Error exportando Excel de encuestas:", error?.message || error);
    return res.status(500).json({ message: "No se pudo exportar el Excel" });
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
        message: coupon.couponUsed
          ? "Cupon ya utilizado"
          : isExpired(coupon)
            ? "Cupon vencido"
            : "Cupon disponible para usar",
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

      if (isExpired(coupon)) {
        return res.status(409).json({
          message: "Cupon vencido",
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

// ── Panel público de sucursal (sin autenticación) ─────────────────────────────

const VALID_BRANCHES = new Set(["luro", "independencia"]);

router.get("/sucursal/:branch", async (req, res) => {
  const branch = req.params.branch?.toLowerCase();
  if (!VALID_BRANCHES.has(branch)) {
    return res.status(400).json({ message: "Sucursal no válida" });
  }

  try {
    const encuestas = await EncuestaCliente.find({ branch })
      .sort({ createdAt: -1 })
      .select("fullName couponCode couponDiscount couponUsed couponExpiresAt couponUsedAt couponUsedBy createdAt")
      .lean();

    const now = Date.now();
    const items = encuestas.map((item) => ({
      id: item._id,
      fullName: item.fullName,
      couponCode: item.couponCode,
      couponDiscount: item.couponDiscount,
      couponUsed: item.couponUsed,
      couponUsedAt: item.couponUsedAt,
      couponUsedBy: item.couponUsedBy,
      couponExpiresAt: item.couponExpiresAt,
      expired: item.couponExpiresAt ? new Date(item.couponExpiresAt).getTime() < now : false,
      createdAt: item.createdAt,
    }));

    const active = items.filter((i) => !i.couponUsed && !i.expired).length;
    const used = items.filter((i) => i.couponUsed).length;
    const expired = items.filter((i) => !i.couponUsed && i.expired).length;

    return res.json({ summary: { active, used, expired, total: items.length }, items });
  } catch (error) {
    console.error("Error panel sucursal:", error?.message || error);
    return res.status(500).json({ message: "No se pudieron cargar los cupones" });
  }
});

router.post("/sucursal/:branch/validar", async (req, res) => {
  const branch = req.params.branch?.toLowerCase();
  if (!VALID_BRANCHES.has(branch)) {
    return res.status(400).json({ message: "Sucursal no válida" });
  }

  try {
    const couponCode = normalizeText(req.body?.couponCode).toUpperCase();
    if (!couponCode) {
      return res.status(400).json({ message: "Ingresá el código de cupón" });
    }

    const coupon = await EncuestaCliente.findOne({ couponCode, branch });
    if (!coupon) {
      return res.status(404).json({ message: "Cupón no encontrado en esta sucursal" });
    }
    if (coupon.couponUsed) {
      return res.status(409).json({ message: "El cupón ya fue utilizado", coupon });
    }
    if (coupon.couponExpiresAt && new Date(coupon.couponExpiresAt).getTime() < Date.now()) {
      return res.status(409).json({ message: "El cupón está vencido", coupon });
    }

    coupon.couponUsed = true;
    coupon.couponUsedAt = new Date();
    coupon.couponUsedBy = "Sucursal";
    await coupon.save();

    return res.json({ message: "Cupón canjeado correctamente", coupon });
  } catch (error) {
    console.error("Error validando cupón en sucursal:", error?.message || error);
    return res.status(500).json({ message: "No se pudo canjear el cupón" });
  }
});

export default router;
