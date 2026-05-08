import "dotenv/config";

import mongoose from "mongoose";
import { ensureDbConnection } from "../dbConnect.js";
import VentaTransferencia from "../models/VentaTransferencia.js";

const MONTH = "2026-05";

const transfers = [
  {
    date: "2026-05-04",
    number: "Mariano Ariel Balardini",
    origin: "",
    destination: "Gustavo",
    detail: "Mostrador y banqueta",
    amount: 59800,
  },
  {
    date: "2026-05-04",
    number: "+54 9 2266 66-2555",
    origin: "Selena milagros",
    destination: "Gustavo",
    detail: "cortes de FF5",
    amount: 6700,
  },
  {
    date: "2026-05-05",
    number: "+54 9 2235 95-0668",
    origin: "ayelen",
    destination: "payway",
    detail: "",
    amount: 33288,
  },
  {
    date: "2026-05-06",
    number: "+54 9 2291 45-7606",
    origin: "Patricia",
    destination: "gustavo",
    detail: "",
    amount: 28352,
  },
  {
    date: "2026-05-06",
    number: "+54 9 2236 88-1891",
    origin: "Florencia",
    destination: "Gusravo",
    detail: "",
    amount: 20000,
  },
  {
    date: "2026-05-06",
    number: "",
    origin: "Moncia",
    destination: "Gustavo",
    detail: "",
    amount: 46720,
  },
  {
    date: "2026-05-07",
    number: "+54 9 2235 85-7064",
    origin: "Stella",
    destination: "payway",
    detail: "",
    amount: 290400,
  },
].map((transfer, index) => ({
  ...transfer,
  importKey: `transferencias-mayo-2026-${String(index + 1).padStart(2, "0")}`,
}));

function asDate(value) {
  return new Date(`${value}T12:00:00.000Z`);
}

async function importTransfers() {
  await ensureDbConnection();

  let matched = 0;
  let inserted = 0;
  let modified = 0;

  for (const transfer of transfers) {
    const payload = {
      ...transfer,
      date: asDate(transfer.date),
      month: MONTH,
      client: transfer.number,
      contact: transfer.origin,
      reference: transfer.destination,
      notes: transfer.detail,
      status: "recibida",
      createdBy: "importacion transferencias mayo 2026",
    };

    const existing = await VentaTransferencia.findOneAndUpdate(
      { importKey: transfer.importKey },
      { $set: payload },
      { new: true }
    );

    if (existing) {
      matched += 1;
      modified += 1;
      continue;
    }

    await VentaTransferencia.create(payload);
    inserted += 1;
  }

  const rows = await VentaTransferencia.find({ month: MONTH }).lean();
  const total = rows.reduce((sum, item) => sum + (item.amount || 0), 0);

  console.log(
    JSON.stringify(
      {
        matched,
        inserted,
        modified,
        month: MONTH,
        total,
        recordsInMonth: rows.length,
      },
      null,
      2
    )
  );
}

importTransfers()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
