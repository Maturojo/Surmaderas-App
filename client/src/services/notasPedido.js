const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function crearNotaPedido(payload) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/api/notas-pedido`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text(); // para capturar TODO
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    console.error("ERROR API /api/notas-pedido", {
    status: res.status,
    data,
    backendError: data?.error,
    });

    throw new Error(data?.message || `Error creando nota (${res.status})`);
  }

  return data;
}
