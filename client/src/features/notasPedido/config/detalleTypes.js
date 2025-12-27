export const DEFAULT_TIPO = "producto";

export function buildDescripcionFromItem(item) {
  const tipo = item?.tipo || DEFAULT_TIPO;
  const d = item?.data || {};

  // Prioridad: si el usuario escribió descripcion manual, úsala.
  const manual = (item?.descripcion || "").trim();
  if (manual) return manual;

  if (tipo === "producto") {
    // Si no hay descripcion manual, usa busqueda o data.nombre
    return String(item?.busqueda || d?.nombre || "").trim();
  }

  if (tipo === "corte") {
    const mat = d.material || "Material";
    const largo = d.largoMm ? `${d.largoMm}mm` : "";
    const ancho = d.anchoMm ? `${d.anchoMm}mm` : "";
    const esp = d.espesorMm ? `${d.espesorMm}mm` : "";
    const dims = [largo, ancho, esp].filter(Boolean).join(" x ");
    const cantCortes = d.cortes ? ` (${d.cortes} cortes)` : "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `${mat}${dims ? " " + dims : ""}${cantCortes}${obs}`.trim();
  }

  if (tipo === "marco") {
    const mat = d.material || "Material";
    const a = d.anchoMm ? `${d.anchoMm}mm` : "";
    const h = d.altoMm ? `${d.altoMm}mm` : "";
    const perfil = d.perfil || "";
    const dims = [a, h].filter(Boolean).join(" x ");
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `Marco${perfil ? " " + perfil : ""} - ${mat}${dims ? " " + dims : ""}${obs}`.trim();
  }

  if (tipo === "calado") {
    const mat = d.material || "Material";
    const dis = d.diseno || "Diseño";
    const horas = d.horas ? `${d.horas} hs` : "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `Calado - ${mat} - ${dis}${horas ? " (" + horas + ")" : ""}${obs}`.trim();
  }

  if (tipo === "mueble") {
    const nombre = d.nombre || "Mueble";
    const medidas = d.medidas || "";
    const mat = d.material || "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `${nombre}${medidas ? " - " + medidas : ""}${mat ? " - " + mat : ""}${obs}`.trim();
  }

  if (tipo === "prestamo") {
    const desc = d.descripcion || "Préstamo";
    const dev = d.fechaDevolucion ? ` (Dev: ${d.fechaDevolucion})` : "";
    const obs = d.obs ? ` - ${d.obs}` : "";
    return `${desc}${dev}${obs}`.trim();
  }

  return "Ítem";
}
