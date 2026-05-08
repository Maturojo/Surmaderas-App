import { API_URL, apiFetch, authHeaders } from "./http";

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function getVentasMensuales(month) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales?month=${encodeURIComponent(month)}`, {
    headers: authHeaders(),
  });
  return readJson(response, "No se pudieron cargar las ventas");
}

export async function createVentaMensual(payload) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo cargar la venta");
}

export async function updateVentaMensual(id, payload) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo actualizar la venta");
}

export async function deleteVentaMensual(id) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readJson(response, "No se pudo eliminar la venta");
}

export async function updateVentasObjetivos(month, payload) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/objetivos/${month}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudieron guardar los objetivos");
}

export async function getVentasTransferencias(month) {
  const response = await apiFetch(
    `${API_URL}/api/ventas-mensuales/transferencias?month=${encodeURIComponent(month)}`,
    { headers: authHeaders() }
  );
  return readJson(response, "No se pudieron cargar las transferencias");
}

export async function createVentasTransferencia(payload) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/transferencias`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo cargar la transferencia");
}

export async function updateVentasTransferencia(id, payload) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/transferencias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo actualizar la transferencia");
}

export async function deleteVentasTransferencia(id) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/transferencias/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readJson(response, "No se pudo eliminar la transferencia");
}

export async function getVentasConfiguracion() {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/configuracion`, {
    headers: authHeaders(),
  });
  return readJson(response, "No se pudo cargar la configuracion");
}

export async function updateVentasConfiguracion(payload) {
  const response = await apiFetch(`${API_URL}/api/ventas-mensuales/configuracion`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readJson(response, "No se pudo guardar la configuracion");
}
