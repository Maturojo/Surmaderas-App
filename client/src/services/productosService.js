// client/src/services/productosService.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function listarProductos({ q = "", page = 1, limit = 25 } = {}) {
  const params = new URLSearchParams();
  if (q && q.trim()) params.set("q", q.trim());
  params.set("page", String(page));
  params.set("limit", String(limit));

  const url = `${API_URL}/api/productos?${params.toString()}`;

  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${txt ? `- ${txt}` : ""}`.trim());
  }

  return r.json(); // { items, total, page, limit }
}
