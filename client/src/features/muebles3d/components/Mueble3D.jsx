import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { MM_TO_UNITS } from "../constants/medidas";
import { usePieces } from "../hooks/usePiece";
import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { Piece } from "./Piece";

export function Mueble3D({ m, materialPropsByKey }) {
  const { pieces } = usePieces(m);

  const D = Math.max(1, Number(m.profundidad || 1)) * MM_TO_UNITS;
  const zPegadoAPared = D / 2;

  // ✅ Separar del fondo (imagen) para que “respire”
  const Z_FONDO_OFFSET_MM = 250; // ajustá 150–400 según gusto
  const zFondoOffset = Z_FONDO_OFFSET_MM * MM_TO_UNITS;

  const rootRef = useRef(null);

  // ✅ bodyRef mide SOLO el cuerpo del mueble
  const bodyRef = useRef(null);
  const supportRef = useRef(null);

  const bodyPieces = pieces.filter((p) => p.pieza !== "patas" && p.pieza !== "zocalo");
  const soportePieces = pieces.filter((p) => p.pieza === "patas" || p.pieza === "zocalo");
  const supportGroundMode = soportePieces.length > 0;

  // Auto-ground: si hay soporte real, el piso lo define el soporte; si no, el cuerpo.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const anchor = supportGroundMode ? supportRef.current : bodyRef.current;
    if (!root || !anchor) return;

    anchor.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(anchor);
    if (!Number.isFinite(box.min.y)) return;

    root.position.y = root.position.y - box.min.y;
  }, [
    supportGroundMode,
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

  const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

  const renderPiece = (p, k) => {
    const pieceMatKey = materialesPorPieza[p.pieza] || m.material;
    const materialProps =
      materialPropsByKey?.[pieceMatKey] || materialPropsByKey?.[m.material];

    return (
      <Piece
        key={`${k}-${pieceMatKey}`}
        size={p.size}
        position={p.pos}
        materialProps={materialProps}
      />
    );
  };

  return (
    <group ref={rootRef} position={[0, 0, zPegadoAPared + zFondoOffset]}>
      {/* CUERPO */}
      <group ref={bodyRef}>
        {bodyPieces.map((p, idx) => renderPiece(p, `b-${idx}`))}
      </group>

      {/* SOPORTES */}
      <group ref={supportRef}>
        {soportePieces.map((p, idx) => renderPiece(p, `s-${idx}`))}
      </group>
    </group>
  );
}
