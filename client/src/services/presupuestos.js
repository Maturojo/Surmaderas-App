const STORAGE_KEY = "sm_presupuestos_drafts_v1";

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listPresupuestoDrafts() {
  return safeRead().sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function getPresupuestoDraft(id) {
  return safeRead().find((item) => item.id === id) || null;
}

export function savePresupuestoDraft(payload) {
  const all = safeRead();
  const now = new Date().toISOString();
  const next = {
    id: payload.id || `pres-${Date.now()}`,
    createdAt: payload.createdAt || now,
    updatedAt: now,
    cliente: payload.cliente || "",
    fecha: payload.fecha || "",
    empresa: payload.empresa || "",
    telefono: payload.telefono || "",
    email: payload.email || "",
    proyecto: payload.proyecto || "",
    entrega: payload.entrega || "",
    detalle: payload.detalle || "",
    materiales: payload.materiales || "",
    observaciones: payload.observaciones || "",
    itemsTexto: payload.itemsTexto || "",
    imagen: payload.imagen || null,
  };

  const idx = all.findIndex((item) => item.id === next.id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...next };
  } else {
    all.push(next);
  }

  safeWrite(all);
  return next;
}

export function deletePresupuestoDraft(id) {
  const filtered = safeRead().filter((item) => item.id !== id);
  safeWrite(filtered);
}
