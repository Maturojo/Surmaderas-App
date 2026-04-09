import { API_URL, apiFetch, authHeaders } from "./http";

export async function obtenerCalendario({ month, fecha, desde, hasta } = {}) {
  const url = new URL(`${API_URL}/api/calendar`);
  if (month) url.searchParams.set("month", month);
  if (fecha) url.searchParams.set("fecha", fecha);
  if (desde) url.searchParams.set("desde", desde);
  if (hasta) url.searchParams.set("hasta", hasta);

  const response = await apiFetch(url.toString(), {
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error obteniendo calendario");
  return data;
}

export async function crearRecordatorio(payload) {
  const response = await apiFetch(`${API_URL}/api/calendar/recordatorios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error creando recordatorio");
  return data;
}

export async function actualizarRecordatorio(id, payload) {
  const response = await apiFetch(`${API_URL}/api/calendar/recordatorios/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error actualizando recordatorio");
  return data;
}

export async function eliminarRecordatorio(id) {
  const response = await apiFetch(`${API_URL}/api/calendar/recordatorios/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Error eliminando recordatorio");
  return data;
}
