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

function getItemDescripcion(item = {}) {
  const candidates = [
    item?.detalle,
    item?.descripcion,
    item?.nombre,
    item?.producto,
    item?.tipo,
    item?.busqueda,
    item?.data?.descripcion,
    item?.data?.nombre,
    item?.data?.producto,
    item?.data?.tipo,
    item?.data?.codigo,
  ];

  return candidates.map((value) => String(value || "").trim()).find(Boolean) || "";
}

export function getNotaResumenPedido(nota, maxLength = 48) {
  const items = Array.isArray(nota?.items) ? nota.items : [];
  const descriptions = items.map(getItemDescripcion).filter(Boolean);
  const base = descriptions[0] || nota?.detalle || nota?.descripcion || "Sin detalle";
  const extra = descriptions.length > 1 ? ` + ${descriptions.length - 1} item${descriptions.length > 2 ? "s" : ""}` : "";
  const text = `${base}${extra}`;

  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}
