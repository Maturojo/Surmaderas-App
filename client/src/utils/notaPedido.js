export function getNotaClienteNombre(nota) {
  if (typeof nota?.cliente === "string") return nota.cliente;
  return nota?.cliente?.nombre || nota?.clienteNombre || "-";
}

export function getNotaClienteTelefono(nota) {
  if (typeof nota?.cliente === "string") return "";
  return nota?.cliente?.telefono || nota?.clienteTelefono || "";
}

export function getNotaClienteDireccion(nota) {
  if (typeof nota?.cliente === "string") return "";
  return nota?.cliente?.direccion || "";
}

export function getNotaTotal(nota) {
  const total = nota?.totales?.total ?? nota?.total ?? 0;
  return Number(total || 0);
}
