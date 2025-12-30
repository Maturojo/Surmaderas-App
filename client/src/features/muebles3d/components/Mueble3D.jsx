import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { MM_TO_UNITS } from "../constants/medidas";
import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { usePieces } from "../hooks/usePiece";
import { Piece } from "./Piece";

export function Mueble3D({ m, materialPropsByKey }) {
  const { pieces } = usePieces(m);
  const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

  const D = Math.max(1, Number(m.profundidad || 1)) * MM_TO_UNITS;
  const zPegadoAPared = D / 2;

  // ✅ Separar del fondo (imagen) para que “respire”
  const Z_FONDO_OFFSET_MM = 250; // ajustá 150–400 según gusto
  const zFondoOffset = Z_FONDO_OFFSET_MM * MM_TO_UNITS;

  const rootRef = useRef(null);
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    content.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(content);
    if (!Number.isFinite(box.min.y)) return;

    // ✅ apoyo al piso: minY -> 0
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
    m.patas?.activo,
    m.patas?.altura,
    m.escritorio?.traseraModo,
    m.zonas?.layoutArriba,
    m.zonas?.layoutAbajo,
  ]);

  return (
    <group ref={rootRef} position={[0, 0, zPegadoAPared + zFondoOffset]}>
      <group ref={contentRef}>
        {pieces.map((p, idx) => {
          const matKey = materialesPorPieza[p.pieza] || m.material;
          const materialProps = materialPropsByKey[matKey] || materialPropsByKey[m.material];
          return <Piece key={idx} size={p.size} position={p.pos} materialProps={materialProps} />;
        })}
      </group>
    </group>
  );
}
