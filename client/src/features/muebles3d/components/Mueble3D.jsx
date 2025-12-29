import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MM_TO_UNITS } from "../constants/medidas";
import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { usePieces } from "../hooks/usePiece";
import { Piece } from "./Piece";

export function Mueble3D({ m, materialPropsByKey }) {
  const { pieces } = usePieces(m);
  const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

  // Pegado a pared (si tu escena es “contra pared”)
  const D = Math.max(1, Number(m.profundidad || 1)) * MM_TO_UNITS;
  const zPegadoAPared = D / 2;

  // Refs para medir bounding box real
  const rootRef = useRef(null);
  const contentRef = useRef(null);

  // Cuando cambian piezas o dimensiones, recalculamos el “apoyo al piso”
  useLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    // Asegurar matrices actualizadas
    content.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(content);
    if (!Number.isFinite(box.min.y)) return;

    // Queremos que el punto más bajo quede en y=0
    // root está en coordenadas locales de la escena, así que ajustamos position.y
    root.position.y = root.position.y - box.min.y;

    // (Opcional) Evitar acumulación si corre varias veces:
    // Normalizamos: si min.y ya está ~0, no toca.
    // Pero el set directo de arriba es estable porque box.min.y cambia con el nuevo root.position.y.
  }, [
    // Dependencias que cambian el modelo
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

  // Nota: rootRef aplica el pegado a pared y el auto-ground.
  // contentRef contiene únicamente el contenido medible.
  return (
    <group ref={rootRef} position={[0, 0, zPegadoAPared]}>
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
