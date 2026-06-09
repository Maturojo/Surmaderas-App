import { API_URL, apiFetch, authHeaders } from "./http";

export async function submitEncuesta(payload) {
  const response = await apiFetch(`${API_URL}/api/encuestas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "No se pudo enviar el formulario");
  }

  return data;
}

export async function getEncuestas() {
  const response = await apiFetch(`${API_URL}/api/encuestas`, {
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron cargar las encuestas");
  }

  return data;
}

export async function resetEncuestas() {
  const response = await apiFetch(`${API_URL}/api/encuestas`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron reiniciar los datos");
  }

  return data;
}

export async function deleteEncuesta(id) {
  const response = await apiFetch(`${API_URL}/api/encuestas/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "No se pudo borrar el registro");
  }

  return data;
}

export async function validateCoupon(couponCode) {
  const response = await apiFetch(`${API_URL}/api/encuestas/cupones/validar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ couponCode }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "No se pudo validar el cupon");
    error.status = response.status;
    error.coupon = data?.coupon;
    throw error;
  }

  return data;
}

export async function lookupCoupon(couponCode) {
  const response = await apiFetch(`${API_URL}/api/encuestas/cupones/consultar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ couponCode }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || "No se pudo consultar el cupon");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getEncuestasExportUrl() {
  const token = authHeaders().Authorization?.replace("Bearer ", "");
  const url = new URL(`${API_URL}/api/encuestas/export`);

  return token ? { url: url.toString(), token } : { url: url.toString(), token: "" };
}
