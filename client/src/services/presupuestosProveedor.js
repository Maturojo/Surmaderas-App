import { API_URL, apiFetch, authHeaders } from "./http";

export async function listarPresupuestosProveedor({ q = "", proveedorId = "" } = {}) {
  const url = new URL(`${API_URL}/api/presupuestos-proveedor`);
  if (q) url.searchParams.set("q", q);
  if (proveedorId) url.searchParams.set("proveedorId", proveedorId);

  const response = await apiFetch(url.toString(), {
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Error obteniendo presupuestos de proveedor");
  return Array.isArray(data) ? data : [];
}

export async function crearPresupuestoProveedor(payload) {
  const response = await apiFetch(`${API_URL}/api/presupuestos-proveedor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error guardando presupuesto de proveedor");
  return data;
}

export async function actualizarPresupuestoProveedor(id, payload) {
  const response = await apiFetch(`${API_URL}/api/presupuestos-proveedor/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error actualizando presupuesto de proveedor");
  return data;
}

export async function eliminarPresupuestoProveedor(id) {
  const response = await apiFetch(`${API_URL}/api/presupuestos-proveedor/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error eliminando presupuesto de proveedor");
  return data;
}
