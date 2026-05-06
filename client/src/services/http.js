function getDefaultApiUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const host = window.location.hostname || "localhost";
  const isLocalHost = host === "localhost" || host === "127.0.0.1";

  if (isLocalHost) {
    return `http://${host}:4000`;
  }

  if (window.location.protocol === "https:") {
    return "https://surmaderas-gestion-server.vercel.app";
  }

  return `http://${host}:4000`;
}

function normalizeConfiguredUrl(value) {
  return String(value || "")
    .replace(/\\r|\\n|\r|\n/g, "")
    .trim()
    .replace(/\/+$/, "");
}

function getApiUrl() {
  const configured = normalizeConfiguredUrl(import.meta.env.VITE_API_URL);
  if (!configured || typeof window === "undefined") return configured || getDefaultApiUrl();

  const host = window.location.hostname || "localhost";
  const isLocalHost = host === "localhost" || host === "127.0.0.1";

  if (!isLocalHost && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured)) {
    return getDefaultApiUrl();
  }

  return configured;
}

const API_URL = getApiUrl();
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
  let response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    const fallbackApiUrl = getDefaultApiUrl();
    try {
      const originalUrl = new URL(String(input));
      const fallbackUrl = new URL(fallbackApiUrl);
      if (originalUrl.origin !== fallbackUrl.origin) {
        response = await fetch(`${fallbackApiUrl}${originalUrl.pathname}${originalUrl.search}`, init);
      } else {
        throw error;
      }
    } catch {
      throw error;
    }
  }
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
