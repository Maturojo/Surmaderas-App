const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const KEY = "sm_auth";

export function getToken() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY));
    return a?.token || null;
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export async function apiFetch(input, init = {}) {
  const response = await fetch(input, init);
  const cloned = response.clone();
  const data = await cloned.json().catch(() => null);
  const message = data?.message || data?.error || "";

  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    (message === "Token inválido" ||
      message === "Token invÃ¡lido" ||
      message === "No autorizado")
  ) {
    clearAuth();
    window.location.replace("/login");
  }

  return response;
}

export { API_URL };
