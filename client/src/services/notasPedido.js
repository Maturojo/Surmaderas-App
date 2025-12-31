const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ---------------------------------------------
   Helpers
--------------------------------------------- */
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonSafe(r) {
  return r.json().catch(() => ({}));
}

/* ---------------------------------------------
   Crear Nota de Pedido (SOLO DATOS)
--------------------------------------------- */
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

  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error(data?.message || "Error creando nota de pedido");
  return data; // nota creada
}

/* ---------------------------------------------
   Listar Notas de Pedido
--------------------------------------------- */
export async function listarNotasPedido({ q = "", page = 1, limit = 25 } = {}) {
  const url = new URL(`${API_BASE}/api/notas-pedido`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const r = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
  });

  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error(data?.message || "Error listando notas de pedido");

  return data;
}

/* ---------------------------------------------
   Obtener Nota de Pedido por ID
--------------------------------------------- */
export async function obtenerNotaPedido(id) {
  if (!id) throw new Error("Falta id de la nota");

  const r = await fetch(`${API_BASE}/api/notas-pedido/${id}`, {
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error(data?.message || "Error obteniendo nota de pedido");

  return data.item;
}

/* ---------------------------------------------
   Guardar PDF (BASE64) luego de creada la nota
--------------------------------------------- */
export async function guardarPdfNotaPedido(id, pdfBase64) {
  if (!id) throw new Error("Falta id de la nota");
  if (!pdfBase64) throw new Error("Falta pdfBase64");

  const r = await fetch(`${API_BASE}/api/notas-pedido/${id}/pdf`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ pdfBase64 }),
  });

  const data = await parseJsonSafe(r);
  if (!r.ok) throw new Error(data?.message || "Error guardando PDF");

  return data.item;
}

/* ---------------------------------------------
   CAJA: Guardar descuento / precio especial / tipo pago / seña
   PUT /api/notas-pedido/:id/caja
   Header: x-caja-key (clave)
--------------------------------------------- */
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
    // 🔥 Mostramos el error real del backend
    const msg = data?.message || "Error actualizando caja";
    const extra = data?.error ? `\n${data.error}` : "";
    throw new Error(msg + extra);
  }

  return data;
}

