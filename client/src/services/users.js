import { API_URL, apiFetch, authHeaders } from "./http";

export async function getUsers() {
  const response = await apiFetch(`${API_URL}/api/users`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo cargar la lista de usuarios");
  }

  return response.json();
}

export async function createUser(payload) {
  const response = await apiFetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "No se pudo crear el usuario");
  }

  return data;
}

export async function updateUser(userId, payload) {
  const response = await apiFetch(`${API_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "No se pudo actualizar el usuario");
  }

  return data;
}
