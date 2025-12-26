import { MM_TO_UNITS } from "../constants/medidas";
import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { usePieces } from "../hooks/usePiece";
import { Piece } from "./Piece";

export function Mueble3D({ m, materialPropsByKey }) {
  const { pieces } = usePieces(m);
  const H = Math.max(1, m.alto) * MM_TO_UNITS;

  const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

  return (
    <group position={[0, H / 2, 0]}>
      {pieces.map((p, idx) => {
        const matKey = materialesPorPieza[p.pieza] || m.material;
        const materialProps = materialPropsByKey[matKey] || materialPropsByKey[m.material];
        return <Piece key={idx} size={p.size} position={p.pos} materialProps={materialProps} />;
      })}
    </group>
  );
}
