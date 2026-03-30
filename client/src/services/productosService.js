import { API_URL, authHeaders } from "./http";

export async function listarProductos({ q = "", page = 1, limit = 25 } = {}) {
  const url = new URL(`${API_URL}/api/productos`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);

  // data = { items, total, page, limit }
  return data;
}

export async function listarTodosLosProductos({ q = "", pageSize = 200 } = {}) {
  let page = 1;
  let all = [];
  let total = Infinity;

  while (all.length < total) {
    const data = await listarProductos({ q, page, limit: pageSize });
    const items = Array.isArray(data?.items) ? data.items : [];
    total = Number(data?.total ?? total);

    all = all.concat(items);

    // Evita loop infinito si algo raro pasa
    if (items.length === 0) break;

    page += 1;
  }

  return all;
}
