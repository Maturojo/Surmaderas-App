import { Edges } from "@react-three/drei";

export function Piece({ size, position, materialProps }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial {...materialProps} />
      <Edges color="#3a332a" threshold={20} />
    </mesh>
  );
}
