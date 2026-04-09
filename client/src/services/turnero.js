import { API_URL, apiFetch, authHeaders } from "./http";

export async function getTurnero() {
  const response = await apiFetch(`${API_URL}/api/turnero`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar el turnero");
  }

  return response.json();
}

export async function takeTurno() {
  const response = await apiFetch(`${API_URL}/api/turnero/take`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo tomar el turno");
  }

  return response.json();
}
