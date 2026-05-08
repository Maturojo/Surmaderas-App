import "dotenv/config";

import mongoose from "mongoose";
import { ensureDbConnection } from "../dbConnect.js";
import VentaMensual from "../models/VentaMensual.js";
import VentasConfiguracion from "../models/VentasConfiguracion.js";
import VentasObjetivo from "../models/VentasObjetivo.js";

const MONTH = "2026-05";

const sales = [
  {
    date: "2026-05-04",
    client: "CLIENTE FINAL",
    contact: "+54 9 2234 21-4222",
    category: "PRODUCTOS A MEDIDA",
    subcategory: "",
    description: "Separador de listones",
    total: 420000,
    commission: 42000,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-04",
    client: "CLIENTE FINAL",
    contact: "+54 9 2266 66-2555",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES RECTOS",
    description: "FF5",
    total: 6700,
    commission: 670,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-05",
    client: "CLIENTE FINAL",
    contact: "2235 95-0668",
    category: "MARCOS / PORTARRETRATOS",
    subcategory: "",
    description: "2 marcos con bombe de 1,5",
    total: 33288,
    commission: 3328.8,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "CLIENTE FINAL",
    contact: "+54 9 2234 38-6177",
    category: "PRODUCTOS A MEDIDA",
    subcategory: "",
    description: "Estanteria melamina",
    total: 138000,
    commission: 13800,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "CLIENTE FINAL",
    contact: "+54 9 2236 03-6073",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES LASER",
    description: "Tapa de mesa calada",
    total: 77182,
    commission: 7718.2,
    paymentStatus: "senado",
  },
  {
    date: "2026-05-06",
    client: "CLIENTE FINAL",
    contact: "+54 9 2291 45-7606",
    category: "MOLDURAS",
    subcategory: "",
    description: "bombe 1,5",
    total: 28352,
    commission: 2835.2,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "CLIENTE FINAL",
    contact: "+54 9 2235 95-0668",
    category: "PRODUCTOS A MEDIDA",
    subcategory: "",
    description: "2 estantes flotantes de pino",
    total: 65042,
    commission: 6504.2,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "CLIENTE FINAL",
    contact: "+54 9 2236 88-1891",
    category: "CORTES A MEDIDA",
    subcategory: "CORTE ESPECIAL",
    description: "Corte en L",
    total: 63534,
    commission: 6353.4,
    paymentStatus: "senado",
  },
  {
    date: "2026-05-06",
    client: "CLIENTE FINAL",
    contact: "+54 9 2236 03-6073",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES LASER",
    description: "Tapa de mesa calada",
    total: 77182,
    commission: 7718.2,
    paymentStatus: "senado",
  },
  {
    date: "2026-05-07",
    client: "CLIENTE FINAL",
    contact: "223 498 7561",
    category: "MUEBLES ESTANDAR",
    subcategory: "",
    description: "MPVM",
    total: 212044,
    commission: 21204.4,
    paymentStatus: "pendiente",
  },
  {
    date: "2026-05-07",
    client: "CLIENTE FINAL",
    contact: "+54 9 2236 83-1288",
    category: "MARCOS / PORTARRETRATOS",
    subcategory: "",
    description: "Marcos de MC927",
    total: 140784,
    commission: 14078.4,
    paymentStatus: "pendiente",
  },
  {
    date: "2026-05-07",
    client: "CLIENTE FINAL",
    contact: "+54 9 2235 85-7064",
    category: "PRODUCTOS A MEDIDA",
    subcategory: "",
    description: "Mueble con 2 puertas",
    total: 290400,
    commission: 29040,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-01",
    client: "ELVIA ROSSI",
    contact: "",
    category: "OTROS",
    subcategory: "",
    description: "1 juego",
    total: 170000,
    commission: 8500,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-05",
    client: "MANOLO",
    contact: "",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES RECTOS",
    description: "ff3, chb yff12",
    total: 22300,
    commission: 1115,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "ELVIA ROSSI",
    contact: "",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES LASER",
    description: "3 juegos",
    total: 511000,
    commission: 25550,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "MANOLO",
    contact: "",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES RECTOS",
    description: "",
    total: 83000,
    commission: 4150,
    paymentStatus: "pagado",
  },
  {
    date: "2026-05-06",
    client: "MANOLO",
    contact: "",
    category: "CORTES A MEDIDA",
    subcategory: "CORTES RECTOS",
    description: "",
    total: 13200,
    commission: 660,
    paymentStatus: "pagado",
  },
].map((sale, index) => {
  const saleType = sale.client === "ELVIA ROSSI" || sale.client === "MANOLO" ? "especial" : "normal";
  return {
    ...sale,
    saleType,
    commissionRate: saleType === "especial" ? 0.05 : 0.1,
    importKey: `ventas-mayo-2026-${String(index + 1).padStart(2, "0")}`,
  };
});

function asDate(value) {
  return new Date(`${value}T12:00:00.000Z`);
}

function saleFilter(sale) {
  return {
    date: asDate(sale.date),
    client: sale.client,
    contact: sale.contact,
    category: sale.category,
    subcategory: sale.subcategory,
    description: sale.description,
    total: sale.total,
    commission: sale.commission,
  };
}

async function importSales() {
  await ensureDbConnection();

  let matched = 0;
  let inserted = 0;
  let modified = 0;
  const claimedIds = [];

  for (const sale of sales) {
    const payload = {
      ...sale,
      date: asDate(sale.date),
      month: MONTH,
      createdBy: "importacion mayo 2026",
    };

    const keyed = await VentaMensual.findOneAndUpdate(
      { importKey: sale.importKey },
      { $set: payload },
      { new: true }
    );

    if (keyed) {
      matched += 1;
      modified += 1;
      claimedIds.push(keyed._id);
      continue;
    }

    const existing = await VentaMensual.findOneAndUpdate(
      {
        ...saleFilter(sale),
        importKey: { $in: ["", null] },
        _id: { $nin: claimedIds },
      },
      { $set: payload },
      { new: true }
    );

    if (existing) {
      matched += 1;
      modified += 1;
      claimedIds.push(existing._id);
      continue;
    }

    const created = await VentaMensual.create(payload);
    inserted += 1;
    claimedIds.push(created._id);
  }

  await VentasObjetivo.findOneAndUpdate(
    { month: MONTH },
    { $set: { salesGoal: 12960000, commissionGoal: 1296000 } },
    { upsert: true, new: true }
  );

  await VentasConfiguracion.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: { key: "default" },
      $addToSet: {
        categories: { $each: ["MARCOS / PORTARRETRATOS", "OTROS"] },
        subcategories: { $each: ["CORTES RECTOS", "CORTES LASER", "CORTE ESPECIAL"] },
        clients: { $each: ["CLIENTE FINAL", "ELVIA ROSSI", "MANOLO"] },
      },
    },
    { upsert: true, new: true }
  );

  const imported = await VentaMensual.find({ month: MONTH }).lean();
  const total = imported.reduce((sum, item) => sum + item.total, 0);
  const commission = imported.reduce((sum, item) => sum + item.commission, 0);

  console.log(
    JSON.stringify(
      {
        matched,
        inserted,
        modified,
        month: MONTH,
        salesTotal: total,
        commissionTotal: commission,
        recordsInMonth: imported.length,
      },
      null,
      2
    )
  );
}

importSales()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
