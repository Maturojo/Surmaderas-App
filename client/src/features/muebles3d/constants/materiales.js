/* =========================
   Fallbacks
========================= */
export const WHITE_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/aeuFJ0AAAAASUVORK5CYII=";

export const NORMAL_NEUTRAL = WHITE_PIXEL;

/* =========================
   Materiales
========================= */
export const MATERIALES = {
  pino: {
    label: "Pino natural",
    color: "#ffffff",
    roughness: 0.75,
    metalness: 0.0,
    mapUrl: "/materiales/pino.jpg",
    normalUrl: "",
    roughUrl: "",
    repeat: [1.25, 1.25],
    clearcoat: 0.05,
    clearcoatRoughness: 0.65,
    specularIntensity: 0.25,
    envMapIntensity: 0.65,
  },
  melamina_blanca: {
    label: "Melamina blanca",
    color: "#ffffff",
    roughness: 0.28,
    metalness: 0.02,
    mapUrl: "/materiales/melamina_blanca.jpg",
    normalUrl: "",
    roughUrl: "",
    repeat: [1.0, 1.0],
    clearcoat: 0.85,
    clearcoatRoughness: 0.06,
    specularIntensity: 0.9,
    envMapIntensity: 1.25,
  },
  melamina_negra: {
    label: "Melamina negra",
    color: "#ffffff",
    roughness: 0.22,
    metalness: 0.06,
    mapUrl: "/materiales/melamina_negra.jpg",
    normalUrl: "",
    roughUrl: "",
    repeat: [1.0, 1.0],
    clearcoat: 0.9,
    clearcoatRoughness: 0.07,
    specularIntensity: 1.0,
    envMapIntensity: 1.35,
  },
};
