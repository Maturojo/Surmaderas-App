export const CORTE_MATERIALES = [
  { code: "CHP", descripcion: "CHAPADUR PERFORADO 3 MM", precioM2: 38927.13 },
  { code: "ESP02", descripcion: "ESPEJO 3 MM A MEDIDA", precioM2: 52662.39 },
  { code: "FE18", descripcion: "FENOLICO 18 MM", precioM2: 51709.24 },
  { code: "FE8", descripcion: "FENOLICO 8 MM", precioM2: 30578.35 },
  { code: "FE12", descripcion: "FENOLICO12 MM", precioM2: 41926.39 },
  { code: "FF12", descripcion: "FIBRO FACIL 12 MM.", precioM2: 24643.96 },
  { code: "FF15", descripcion: "FIBRO FACIL 15 MM.", precioM2: 30333.16 },
  { code: "FF18", descripcion: "FIBRO FACIL 18 MM", precioM2: 36456.64 },
  { code: "FF3", descripcion: "FIBRO FACIL 3 MM", precioM2: 10684.41 },
  { code: "FF5", descripcion: "FIBRO FACIL 5.5 MM.", precioM2: 14170.09 },
  { code: "FF9", descripcion: "FIBRO FACIL 9 MM.", precioM2: 19745 },
  { code: "CHB", descripcion: "FIBRO PLUS BLANCO/NEGRO", precioM2: 16469.20 },
  { code: "MB", descripcion: "MELAMINA BLANCA 18 MM", precioM2: 36239.61 },
  { code: "MBF", descripcion: "MELAMINA BLANCA DE MDF 18MM", precioM2: 42275.86 },
  { code: "MN", descripcion: "MELAMINA NEGRA 18MM", precioM2: 42275.86 },
  { code: "OSB10", descripcion: "OSB 10 MM.", precioM2: 38218.40 },
  { code: "CHPN", descripcion: "PIZARRON NEGRO", precioM2: 37639.58 },
  { code: "CHPV", descripcion: "PIZARRON VERDE", precioM2: 37639.58 },
  { code: "TB15", descripcion: "TABLERO PINO 15 MM.", precioM2: 56385.45 },
  { code: "TB18", descripcion: "TABLERO PINO 18 MM.", precioM2: 70605.37 },
  { code: "TB21", descripcion: "TABLERO PINO 21 MM", precioM2: 78450.46 },
  { code: "TB30", descripcion: "TABLERO PINO 30MM", precioM2: 104417.61 },
  { code: "TER3", descripcion: "TERCIADO 3MM", precioM2: 19463.51 },
  { code: "VAR", descripcion: "VARILLADO M2 1/2 X 1 1/2 CON FONDO FF9", precioM2: 106293.66 },
  { code: "VM02", descripcion: "VIDRIO 2 MM. A MEDIDA", precioM2: 29890.63 },
];

export function getCorteMaterialByCode(code) {
  return CORTE_MATERIALES.find((item) => item.code === code) || null;
}
