import { API_URL, authHeaders } from "./http";

export async function crearNotaPedido(payload) {
  const res = await fetch(`${API_URL}/notas-pedido`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${res.statusText} - ${err}`);
  }
  return res.json();
}

export async function listarNotasPedido() {
  const res = await fetch(`${API_URL}/notas-pedido`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${res.statusText} - ${err}`);
  }
  return res.json();
}
