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

export { API_URL };
