import { API_URL, apiFetch, authHeaders } from "./http";

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function getEstadisticasGenerales(month) {
  const response = await apiFetch(`${API_URL}/api/estadisticas?month=${encodeURIComponent(month)}`, {
    headers: authHeaders(),
  });
  return readJson(response, "No se pudieron cargar las estadisticas");
}

export async function trackModuleUsage(modulo, categoria = "modulo") {
  try {
    const key = `sm-module-usage-${modulo}-${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    await apiFetch(`${API_URL}/api/estadisticas/uso`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ modulo, categoria }),
    });
  } catch {
    // El tracking no debe bloquear el uso del modulo.
  }
}
