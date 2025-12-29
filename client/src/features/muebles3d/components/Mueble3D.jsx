import { MM_TO_UNITS } from "../constants/medidas";
import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { usePieces } from "../hooks/usePiece";
import { Piece } from "./Piece";

export function Mueble3D({ m, materialPropsByKey }) {
  const { pieces } = usePieces(m);

  const H = Math.max(1, Number(m.alto || 1)) * MM_TO_UNITS;
  const D = Math.max(1, Number(m.profundidad || 1)) * MM_TO_UNITS;

  // Queremos que la espalda del mueble toque la pared (Z = 0).
  // Si el mueble está centrado en Z, su cara trasera está en -D/2.
  // Entonces lo movemos +D/2 para que -D/2 + D/2 = 0.
  const zPegadoAPared = D / 2;

  const materialesPorPieza = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;

  return (
    <group position={[0, H / 2, zPegadoAPared]}>
      {pieces.map((p, idx) => {
        const matKey = materialesPorPieza[p.pieza] || m.material;
        const materialProps = materialPropsByKey[matKey] || materialPropsByKey[m.material];

        return <Piece key={idx} size={p.size} position={p.pos} materialProps={materialProps} />;
      })}
    </group>
  );
}
