import { API_URL, apiFetch, authHeaders } from "./http";

async function readJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || fallbackMessage);
  return data;
}

export async function listarIvanProductos({ q = "", page = 1, limit = 30 } = {}) {
  const url = new URL(`${API_URL}/api/ivan/productos`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await apiFetch(url.toString(), {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return readJsonResponse(response, "No se pudieron cargar los productos");
}

export async function guardarIvanProducto(payload, id = "") {
  const response = await apiFetch(`${API_URL}/api/ivan/productos${id ? `/${id}` : ""}`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(response, "No se pudo guardar el producto");
}

export async function borrarIvanProducto(id) {
  const response = await apiFetch(`${API_URL}/api/ivan/productos/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return readJsonResponse(response, "No se pudo borrar el producto");
}

export async function listarIvanRemitos({ page = 1, limit = 30 } = {}) {
  const url = new URL(`${API_URL}/api/ivan/remitos`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await apiFetch(url.toString(), {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return readJsonResponse(response, "No se pudieron cargar los remitos");
}

export async function crearIvanRemito(payload) {
  const response = await apiFetch(`${API_URL}/api/ivan/remitos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(response, "No se pudo crear el remito");
}
