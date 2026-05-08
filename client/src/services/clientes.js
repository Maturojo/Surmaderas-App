import { API_URL, apiFetch, authHeaders } from "./http";

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function getClientes() {
  const response = await apiFetch(`${API_URL}/api/clients`, { headers: authHeaders() });
  return readJson(response, "No se pudieron cargar los clientes");
}

export async function createCliente(payload) {
  const response = await apiFetch(`${API_URL}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo crear el cliente");
}

export async function updateCliente(id, payload) {
  const response = await apiFetch(`${API_URL}/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo actualizar el cliente");
}

export async function deleteCliente(id) {
  const response = await apiFetch(`${API_URL}/api/clients/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readJson(response, "No se pudo eliminar el cliente");
}
