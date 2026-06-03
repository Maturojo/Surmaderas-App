export const TIPOS = [
  { id: "biblioteca", label: "Biblioteca" },
  { id: "placard", label: "Placard / ropero" },
  { id: "bajo_mesada", label: "Bajo mesada" },
  { id: "rack_tv", label: "Rack TV" },
  { id: "mesa_luz", label: "Mesa de luz" },
  { id: "escritorio", label: "Escritorio" },
  { id: "modulo_libre", label: "Modulo libre" },
];

export const CELL_TYPES = [
  { id: "estantes", label: "Estantes" },
  { id: "puertas", label: "Puertas" },
  { id: "cajones", label: "Cajones" },
  { id: "perchero", label: "Perchero" },
  { id: "vacio", label: "Vacio" },
];

export const MATERIALES_POR_PIEZA_DEFAULT = {
  cuerpo: "melamina_blanca",
  tapa: "melamina_blanca",
  estantes: "melamina_blanca",
  frentes: "melamina_blanca",
  fondo: "melamina_blanca",
  patas: "pino",
  barral: "metal_cromado",
  tiradores: "metal_cromado",
};

function cell(tipo, extra = {}) {
  return {
    tipo,
    estantes: tipo === "estantes" ? 2 : 0,
    puertas: { activo: tipo === "puertas", hojas: 2 },
    cajones: tipo === "cajones" ? [{ alto: 160 }, { alto: 160 }, { alto: 190 }] : [],
    ...extra,
  };
}

function grid(columnas, filas, celdas) {
  return { columnas, filas, celdas };
}

export function makeGridKey(row, col) {
  return `${row}-${col}`;
}

export function createPreset(tipo = "biblioteca") {
  const base = {
    tipo,
    material: "melamina_blanca",
    fondoModo: "estudio",
    ancho: 1000,
    alto: 1800,
    profundidad: 350,
    espesor: 18,
    fondoActivo: true,
    soporte: "nada",
    patas: { activo: false, altura: 100 },
    zocalo: { altura: 80, retiro: 20 },
    materialesPorPieza: { ...MATERIALES_POR_PIEZA_DEFAULT },
    grid: grid([{ pct: 50 }, { pct: 50 }], [{ pct: 100 }], {
      [makeGridKey(0, 0)]: cell("estantes", { estantes: 3 }),
      [makeGridKey(0, 1)]: cell("puertas", { puertas: { activo: true, hojas: 2 } }),
    }),
    escritorio: {
      tapaVuelo: 30,
      falda: 80,
      traseraModo: "falda",
      ladoIzq: { activo: true, ancho: 360, tipo: "cajones", cajones: [{ alto: 140 }, { alto: 140 }, { alto: 180 }] },
      ladoDer: { activo: true, ancho: 320, tipo: "estantes", estantes: 2, cajones: [] },
    },
  };

  if (tipo === "biblioteca") {
    return {
      ...base,
      ancho: 900,
      alto: 1900,
      profundidad: 320,
      soporte: "zocalo",
      grid: grid([{ pct: 33 }, { pct: 34 }, { pct: 33 }], [{ pct: 100 }], {
        [makeGridKey(0, 0)]: cell("estantes", { estantes: 5 }),
        [makeGridKey(0, 1)]: cell("estantes", { estantes: 5 }),
        [makeGridKey(0, 2)]: cell("estantes", { estantes: 5 }),
      }),
    };
  }

  if (tipo === "placard") {
    return {
      ...base,
      ancho: 1600,
      alto: 2200,
      profundidad: 560,
      soporte: "zocalo",
      grid: grid([{ pct: 38 }, { pct: 37 }, { pct: 25 }], [{ pct: 68 }, { pct: 32 }], {
        [makeGridKey(0, 0)]: cell("perchero"),
        [makeGridKey(0, 1)]: cell("perchero"),
        [makeGridKey(0, 2)]: cell("estantes", { estantes: 4 }),
        [makeGridKey(1, 0)]: cell("cajones", { cajones: [{ alto: 170 }, { alto: 170 }] }),
        [makeGridKey(1, 1)]: cell("cajones", { cajones: [{ alto: 170 }, { alto: 170 }] }),
        [makeGridKey(1, 2)]: cell("puertas", { puertas: { activo: true, hojas: 1 } }),
      }),
    };
  }

  if (tipo === "bajo_mesada") {
    return {
      ...base,
      ancho: 1400,
      alto: 820,
      profundidad: 520,
      soporte: "zocalo",
      grid: grid([{ pct: 34 }, { pct: 33 }, { pct: 33 }], [{ pct: 100 }], {
        [makeGridKey(0, 0)]: cell("puertas", { puertas: { activo: true, hojas: 2 } }),
        [makeGridKey(0, 1)]: cell("cajones", { cajones: [{ alto: 140 }, { alto: 140 }, { alto: 180 }] }),
        [makeGridKey(0, 2)]: cell("puertas", { puertas: { activo: true, hojas: 1 } }),
      }),
    };
  }

  if (tipo === "rack_tv") {
    return {
      ...base,
      ancho: 1800,
      alto: 520,
      profundidad: 420,
      soporte: "zocalo",
      zocalo: { altura: 55, retiro: 35 },
      grid: grid([{ pct: 30 }, { pct: 40 }, { pct: 30 }], [{ pct: 45 }, { pct: 55 }], {
        [makeGridKey(0, 0)]: cell("vacio"),
        [makeGridKey(0, 1)]: cell("vacio"),
        [makeGridKey(0, 2)]: cell("vacio"),
        [makeGridKey(1, 0)]: cell("cajones", { cajones: [{ alto: 180 }] }),
        [makeGridKey(1, 1)]: cell("puertas", { puertas: { activo: true, hojas: 2 } }),
        [makeGridKey(1, 2)]: cell("cajones", { cajones: [{ alto: 180 }] }),
      }),
    };
  }

  if (tipo === "mesa_luz") {
    return {
      ...base,
      ancho: 450,
      alto: 600,
      profundidad: 380,
      soporte: "zocalo",
      zocalo: { altura: 45, retiro: 28 },
      grid: grid([{ pct: 100 }], [{ pct: 35 }, { pct: 65 }], {
        [makeGridKey(0, 0)]: cell("vacio"),
        [makeGridKey(1, 0)]: cell("cajones", { cajones: [{ alto: 150 }, { alto: 170 }] }),
      }),
    };
  }

  if (tipo === "escritorio") {
    return {
      ...base,
      ancho: 1300,
      alto: 760,
      profundidad: 600,
      soporte: "nada",
      patas: { activo: false, altura: 80 },
      fondoActivo: false,
      grid: grid([{ pct: 100 }], [{ pct: 100 }], { [makeGridKey(0, 0)]: cell("vacio") }),
    };
  }

  return {
    ...base,
    ancho: 1000,
    alto: 1200,
    profundidad: 400,
    soporte: "nada",
    grid: grid([{ pct: 50 }, { pct: 50 }], [{ pct: 50 }, { pct: 50 }], {
      [makeGridKey(0, 0)]: cell("estantes", { estantes: 1 }),
      [makeGridKey(0, 1)]: cell("puertas", { puertas: { activo: true, hojas: 1 } }),
      [makeGridKey(1, 0)]: cell("cajones", { cajones: [{ alto: 160 }, { alto: 160 }] }),
      [makeGridKey(1, 1)]: cell("vacio"),
    }),
  };
}

export function defaultCell() {
  return cell("estantes", { estantes: 1 });
}
