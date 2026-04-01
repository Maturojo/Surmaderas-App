const PALETA = [
  "#d8ecff",
  "#e8defc",
  "#dff3e4",
  "#ffe7cc",
  "#ffe0e7",
  "#e2f1ef",
  "#f6e5d8",
  "#e8ebff",
  "#e7f7d9",
  "#f9e0f2",
];

function normalizarTexto(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function colorProveedorPorNombre(nombre = "") {
  const texto = normalizarTexto(nombre);
  if (!texto) return PALETA[0];

  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }

  return PALETA[hash % PALETA.length];
}

export function estiloProveedor(color = PALETA[0]) {
  return {
    backgroundColor: color,
    borderColor: color,
  };
}
