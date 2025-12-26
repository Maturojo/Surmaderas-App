export const TIPOS = [
  { id: "estanteria", label: "Estantería (simple)" },
  { id: "escritorio", label: "Escritorio (lados configurables)" },
  { id: "modulo_zonas", label: "Módulo (arriba/abajo configurable)" },
];

/* =========================
   Material por pieza (DEFAULT)
========================= */
export const MATERIALES_POR_PIEZA_DEFAULT = {
  cuerpo: "melamina_blanca",
  tapa: "melamina_blanca",
  estantes: "melamina_blanca",
  frentes: "melamina_blanca",
  fondo: "melamina_blanca",
  patas: "pino",
};

/* =========================
   Defaults de configuraciones
========================= */
export function defaultSideTop() {
  return {
    tipo: "puertas", // puertas | estanteria | vacio
    estantes: 1,
    puertas: { activo: true, hojas: 2 },
  };
}

export function defaultSideBottom() {
  return {
    tipo: "cajonera", // estanteria | cajonera | puertas | vacio
    estantes: 1,
    puertas: { activo: false, hojas: 2 },
    cajones: [{ alto: 160 }, { alto: 160 }, { alto: 220 }],
  };
}

export function defaultDeskSide() {
  return {
    activo: true,
    ancho: 350,
    tipo: "cajonera", // cajonera | estanteria | vacio
    estantes: 2,
    cajones: [{ alto: 140 }, { alto: 140 }, { alto: 180 }],
    soporteVacio: "placa", // placa | marco | patas
  };
}
