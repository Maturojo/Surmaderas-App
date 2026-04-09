import { API_URL, apiFetch, authHeaders } from "./http";

export async function listarPedidosProveedor({ q = "", proveedorId = "", estado = "" } = {}) {
  const url = new URL(`${API_URL}/api/pedidos-proveedor`);
  if (q) url.searchParams.set("q", q);
  if (proveedorId) url.searchParams.set("proveedorId", proveedorId);
  if (estado) url.searchParams.set("estado", estado);

  const r = await apiFetch(url.toString(), {
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await r.json().catch(() => ([]));
  if (!r.ok) throw new Error(data?.message || "Error obteniendo pedidos");
  return Array.isArray(data) ? data : [];
}

export async function crearPedidoProveedor(payload) {
  const r = await apiFetch(`${API_URL}/api/pedidos-proveedor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error creando pedido");
  return data;
}

export async function actualizarPedidoProveedor(id, payload) {
  const r = await apiFetch(`${API_URL}/api/pedidos-proveedor/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error actualizando pedido");
  return data;
}

export async function eliminarPedidoProveedor(id) {
  const r = await apiFetch(`${API_URL}/api/pedidos-proveedor/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Error eliminando pedido");
  return data;
}
