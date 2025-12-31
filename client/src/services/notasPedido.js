const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* =========================
   CREAR NOTA
========================= */
export async function crearNotaPedido(payload) {
  const r = await fetch(`${API_BASE}/api/notas-pedido`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error creando nota");
  return data;
}

/* =========================
   LISTAR NOTAS (paginado + búsqueda)
========================= */
export async function listarNotasPedido({ q = "", page = 1, limit = 25 } = {}) {
  const url = new URL(`${API_BASE}/api/notas-pedido`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const r = await fetch(url, {
    headers: {
      ...authHeaders(),
    },
    credentials: "include",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error listando notas");
  return data;
}

/* =========================
   OBTENER DETALLE
========================= */
export async function obtenerNotaPedido(id) {
  const r = await fetch(`${API_BASE}/api/notas-pedido/${id}`, {
    headers: {
      ...authHeaders(),
    },
    credentials: "include",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error obteniendo nota");
  return data;
}

/* =========================
   GUARDAR PDF EN BD (si lo usás)
========================= */
export async function guardarPdfNotaPedido(id, pdfBase64) {
  const r = await fetch(`${API_BASE}/api/notas-pedido/${id}/pdf`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ pdfBase64 }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error guardando PDF");
  return data;
}

/* =========================
   ACTUALIZAR CAJA (sin clave)
========================= */
export async function actualizarCajaNota(id, payload) {
  const r = await fetch(`${API_BASE}/api/notas-pedido/${id}/caja`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.message || "Error actualizando caja";
    const extra = data?.error ? `\n${data.error}` : "";
    throw new Error(msg + extra);
  }
  return data;
}

/* =========================
   ELIMINAR NOTA (soft delete)
========================= */
export async function eliminarNotaPedido(id) {
  const r = await fetch(`${API_BASE}/api/notas-pedido/${id}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
    credentials: "include",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error eliminando nota");
  return data;
}
