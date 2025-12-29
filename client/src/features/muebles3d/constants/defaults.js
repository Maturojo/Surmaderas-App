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

export const DEFAULT_DIMENSIONS_BY_TIPO = {
  escritorio: {
    ancho: 1200,        // 120 cm
    alto: 750,          // 75 cm
    profundidad: 400,   // 40 cm
    espesor: 18,
    falda: 80,
  },
  estanteria: {
    ancho: 800,         // 80 cm
    alto: 1800,         // 180 cm
    profundidad: 300,   // 30 cm
    espesor: 18,
    estantes: 4,
  },
  modulo_zonas: {
    ancho: 1200,        // 120 cm
    alto: 2000,         // 200 cm
    profundidad: 500,   // 50 cm
    espesor: 18,
    estantes: 5,
  },
};
