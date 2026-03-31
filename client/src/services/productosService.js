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

export async function obtenerProductosCatalogo({ q = "", categoria = "", subcategoria = "", page = 1, limit = 60 } = {}) {
  const url = new URL(`${API_URL}/api/productos`);
  if (q) url.searchParams.set("q", q);
  if (categoria) url.searchParams.set("categoria", categoria);
  if (subcategoria) url.searchParams.set("subcategoria", subcategoria);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total || 0),
    page: Number(data?.page || page),
    limit: Number(data?.limit || limit),
  };
}

export async function obtenerFiltrosProductos() {
  const res = await fetch(`${API_URL}/api/productos/filtros`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudieron obtener los filtros");
  return data;
}

export async function crearCategoriaOSubcategoria(payload) {
  const res = await fetch(`${API_URL}/api/productos/categorias`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo crear la categoria o subcategoria");
  return data;
}

export async function actualizarClasificacionMultiple(ids, payload) {
  const res = await fetch(`${API_URL}/api/productos/clasificacion-multiple`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ids, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo actualizar la clasificacion multiple");
  return data;
}

export async function obtenerHistorialProductos() {
  const res = await fetch(`${API_URL}/api/productos/historial`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo obtener el historial");
  return data;
}

export async function guardarAccionHistorial(payload) {
  const res = await fetch(`${API_URL}/api/productos/historial`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo guardar la accion en el historial");
  return data;
}

export async function limpiarHistorialProductos() {
  const res = await fetch(`${API_URL}/api/productos/historial`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo limpiar el historial");
  return data;
}

export async function eliminarCategoria(nombre) {
  const res = await fetch(`${API_URL}/api/productos/categorias/${encodeURIComponent(nombre)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo eliminar la categoria");
  return data;
}

export async function eliminarSubcategoria(categoria, subcategoria) {
  const res = await fetch(`${API_URL}/api/productos/subcategorias`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ categoria, subcategoria }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo eliminar la subcategoria");
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
