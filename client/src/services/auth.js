const KEY = "sm_auth";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function login(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function logout() {
  localStorage.removeItem(KEY);
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const a = getAuth();
  return Boolean(a?.token);
}

export async function loginRequest({ username, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "No se pudo iniciar sesión");
  }

  return res.json(); // { token, user }
}
