import Counter from "../models/Counter.js";

function pad(n, size = 4) {
  return String(n).padStart(size, "0");
}

export async function nextNotaNumero(fechaISO) {
  // fechaISO: "YYYY-MM-DD"
  const key = `nota:${fechaISO}`;

  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Formato sugerido (ajustable): NP-YYYYMMDD-0001
  const ymd = fechaISO.replaceAll("-", "");
  return `NP-${ymd}-${pad(doc.seq, 4)}`;
}
