import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { MM_TO_UNITS } from "../constants/medidas";
import { usePieces } from "../hooks/usePiece";
import { Piece } from "./Piece";

export function Mueble3D({ m, materialPropsByKey }) {
  const { pieces } = usePieces(m);

  const D = Math.max(1, Number(m.profundidad || 1)) * MM_TO_UNITS;
  const zPegadoAPared = D / 2;

  // ✅ Separar del fondo (imagen) para que “respire”
  const Z_FONDO_OFFSET_MM = 250; // ajustá 150–400 según gusto
  const zFondoOffset = Z_FONDO_OFFSET_MM * MM_TO_UNITS;

  const rootRef = useRef(null);

  // ✅ bodyRef mide SOLO el cuerpo (sin patas/zócalo) para no “volar” el mueble
  const bodyRef = useRef(null);

  // Auto-ground: solo con el CUERPO del mueble (no patas/zócalo)
  useLayoutEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    body.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(body);
    if (!Number.isFinite(box.min.y)) return;

    root.position.y = root.position.y - box.min.y;
  }, [
    pieces,
    m.tipo,
    m.ancho,
    m.alto,
    m.profundidad,
    m.espesor,
    m.estantes,
    m.falda,
    m.soporte,
    m.patas?.activo,
    m.patas?.altura,
    m.zocalo?.altura,
    m.zocalo?.retiro,
    m.escritorio?.traseraModo,
    m.escritorio?.tapaVuelo,
    m.escritorio?.patasRas,
    m.zonas?.layoutArriba,
    m.zonas?.layoutAbajo,
    m.zonas?.altoSuperior,
  ]);

  // ✅ Global: fuerza el material de TODO el mueble
  const globalMatKey = m.material;

  // ✅ Para evitar “cache” visual: incluimos globalMatKey en la key
  const renderPiece = (p, k) => {
    const materialProps =
      materialPropsByKey?.[globalMatKey] || materialPropsByKey?.[m.material];

    return (
      <Piece
        key={`${k}-${globalMatKey}`}
        size={p.size}
        position={p.pos}
        materialProps={materialProps}
      />
    );
  };

  // ✅ body = todo menos patas/zócalo (para medir piso)
  const bodyPieces = pieces.filter((p) => p.pieza !== "patas" && p.pieza !== "zocalo");
  const soportePieces = pieces.filter((p) => p.pieza === "patas" || p.pieza === "zocalo");

  return (
    <group ref={rootRef} position={[0, 0, zPegadoAPared + zFondoOffset]}>
      {/* CUERPO (define el apoyo al piso) */}
      <group ref={bodyRef}>
        {bodyPieces.map((p, idx) => renderPiece(p, `b-${idx}`))}
      </group>

      {/* SOPORTES (no afectan el auto-ground) */}
      <group>
        {soportePieces.map((p, idx) => renderPiece(p, `s-${idx}`))}
      </group>
    </group>
  );
}
