// Normalización: espesor = menor, largo = mayor, ancho = medio (y “respeta” espesor nominal si coincide)
export function normalizeDimsMm(mmA, mmB, mmC, espesorNominalMm) {
  const dims = [mmA, mmB, mmC].map((n) => Math.round(Math.abs(n)));
  dims.sort((a, b) => a - b); // [menor, medio, mayor]

  const tol = 1.0;
  const eNom = Number(espesorNominalMm);

  let espesor = dims[0];
  if (Number.isFinite(eNom)) {
    const close = dims.find((d) => Math.abs(d - eNom) <= tol);
    if (close != null) espesor = close;
  }

  return {
    ancho_mm: dims[1],   // medio
    largo_mm: dims[2],   // mayor
    espesor_mm: espesor, // menor (o nominal si coincide)
  };
}
