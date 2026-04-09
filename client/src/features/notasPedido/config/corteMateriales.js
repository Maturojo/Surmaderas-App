export const CORTE_MATERIALES = [
  { code: "CHP", descripcion: "CHAPADUR PERFORADO 3 MM", precioM2: 35388.3 },
  { code: "ESP02", descripcion: "ESPEJO 3 MM A MEDIDA", precioM2: 47874.9 },
  { code: "FE18", descripcion: "FENOLICO 18 MM", precioM2: 47008.4 },
  { code: "FE8", descripcion: "FENOLICO 8 MM", precioM2: 27798.5 },
  { code: "FE12", descripcion: "FENOLICO12 MM", precioM2: 38114.9 },
  { code: "FF12", descripcion: "FIBRO FACIL 12 MM.", precioM2: 22403.6 },
  { code: "FF15", descripcion: "FIBRO FACIL 15 MM.", precioM2: 27575.6 },
  { code: "FF18", descripcion: "FIBRO FACIL 18 MM", precioM2: 33142.4 },
  { code: "FF3", descripcion: "FIBRO FACIL 3 MM", precioM2: 9713.1 },
  { code: "FF5", descripcion: "FIBRO FACIL 5.5 MM.", precioM2: 12881.9 },
  { code: "FF9", descripcion: "FIBRO FACIL 9 MM.", precioM2: 17950 },
  { code: "CHB", descripcion: "FIBRO PLUS BLANCO/NEGRO", precioM2: 14972 },
  { code: "MB", descripcion: "MELAMINA BLANCA 18 MM", precioM2: 32945.1 },
  { code: "MBF", descripcion: "MELAMINA BLANCA DE MDF 18MM", precioM2: 38432.6 },
  { code: "MN", descripcion: "MELAMINA NEGRA 18MM", precioM2: 38432.6 },
  { code: "OSB10", descripcion: "OSB 10 MM.", precioM2: 34744 },
  { code: "CHPN", descripcion: "PIZARRON NEGRO", precioM2: 34217.8 },
  { code: "CHPV", descripcion: "PIZARRON VERDE", precioM2: 34217.8 },
  { code: "TB15", descripcion: "TABLERO PINO 15 MM.", precioM2: 51259.5 },
  { code: "TB18", descripcion: "TABLERO PINO 18 MM.", precioM2: 64186.7 },
  { code: "TB21", descripcion: "TABLERO PINO 21 MM", precioM2: 71318.6 },
  { code: "TB30", descripcion: "TABLERO PINO 30MM", precioM2: 94925.1 },
  { code: "TER3", descripcion: "TERCIADO 3MM", precioM2: 17694.1 },
  { code: "VAR", descripcion: "VARILLADO M2 1/2 X 1 1/2 CON FONDO FF9", precioM2: 96630.6 },
  { code: "VM02", descripcion: "VIDRIO 2 MM. A MEDIDA", precioM2: 27173.3 },
];

export function getCorteMaterialByCode(code) {
  return CORTE_MATERIALES.find((item) => item.code === code) || null;
}
