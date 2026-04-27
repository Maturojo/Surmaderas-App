export const DEFAULT_TIPO = "producto";

export function buildDescripcionFromItem(item) {
  const tipo = item?.tipo || DEFAULT_TIPO;
  const d = item?.data || {};

  // Prioridad: si el usuario escribio descripcion manual, usala.
  const manual = (item?.descripcion || "").trim();
  if (manual) return manual;

  if (tipo === "producto") {
    // Si no hay descripcion manual, usa busqueda o data.nombre
    return String(item?.busqueda || d?.nombre || "").trim();
  }

  if (tipo === "corte") {
    const mat = d.material || "Material";
    const largo = d.largoMm ? `${d.largoMm}cm` : "";
    const ancho = d.anchoMm ? `${d.anchoMm}cm` : "";
    const dims = [largo, ancho].filter(Boolean).join(" x ");
    const cantCortes = d.cortes ? ` (${d.cortes} cortes)` : "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `${mat}${dims ? " " + dims : ""}${cantCortes}${obs}`.trim();
  }

  if (tipo === "marco") {
    if (Array.isArray(d.resumenLineas) && d.resumenLineas.length > 0) {
      const resumen = d.resumenLineas
        .filter((linea) => linea?.label && linea?.value)
        .map((linea) => `${linea.label}: ${linea.value}`)
        .join(" | ");
      const obs = d.obs ? ` | Observaciones: ${d.obs}` : "";
      return resumen ? `${resumen}${obs}`.trim() : `Marco${obs}`.trim();
    }

    const a = d.anchoMm ? `${d.anchoMm}mm` : "";
    const h = d.altoMm ? `${d.altoMm}mm` : "";
    const perfil = d.perfil || "Moldura";
    const dims = [a, h].filter(Boolean).join(" x ");
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `Marco ${perfil}${dims ? " - " + dims : ""}${obs}`.trim();
  }

  if (tipo === "calado") {
    const mat = d.material || "Material";
    const diseno = d.diseno || "";
    const largo = d.largoCm ? `${d.largoCm}cm` : "";
    const ancho = d.anchoCm ? `${d.anchoCm}cm` : "";
    const medidas = [largo, ancho].filter(Boolean).join(" x ") || d.medidas || "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `Calado - ${mat}${diseno ? " - " + diseno : ""}${medidas ? " - " + medidas : ""}${obs}`.trim();
  }

  if (tipo === "mueble") {
    const nombre = d.nombre || "Mueble";
    const medidas = d.medidas || "";
    const mat = d.material || "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `${nombre}${medidas ? " - " + medidas : ""}${mat ? " - " + mat : ""}${obs}`.trim();
  }

  if (tipo === "prestamo") {
    const desc = d.descripcion || "Prestamo";
    const dev = d.fechaDevolucion ? ` (Dev: ${d.fechaDevolucion})` : "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `${desc}${dev}${obs}`.trim();
  }

  return "Item";
}
