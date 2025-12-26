import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import { Panel, Scene, ScreenshotRig } from "../features/muebles3d/components";
import { usePieces } from "../features/muebles3d/hooks/usePiece";
import {
  MATERIALES_POR_PIEZA_DEFAULT,
  defaultDeskSide,
  defaultSideBottom,
  defaultSideTop,
} from "../features/muebles3d/constants/defaults";

export default function GeneradorMueble3D() {
  const [m, setM] = useState({
    material: "melamina_blanca",
    fondoModo: "habitacion",
    pisoModo: "cuadros",

    materialesPorPieza: { ...MATERIALES_POR_PIEZA_DEFAULT },

    tipo: "modulo_zonas",
    ancho: 800,
    alto: 1800,
    profundidad: 350,
    espesor: 18,

    estantes: 4,
    falda: 80,

    patas: { activo: true, altura: 120 },

    escritorio: {
      traseraModo: "falda",
      fondoAlturaMm: 0,
      cortePorPatas: true,
      ladoIzq: defaultDeskSide(),
      ladoDer: { ...defaultDeskSide(), tipo: "estanteria", estantes: 2, ancho: 300 },
    },

    zonas: {
      altoSuperior: 900,
      layoutArriba: "split",
      layoutAbajo: "split",
      arriba: {
        single: defaultSideTop(),
        izquierda: defaultSideTop(),
        derecha: { tipo: "estanteria", estantes: 2, puertas: { activo: false, hojas: 2 } },
      },
      abajo: {
        single: defaultSideBottom(),
        izquierda: { ...defaultSideBottom(), tipo: "estanteria", estantes: 2 },
        derecha: defaultSideBottom(),
      },
    },
  });

  const { despiece } = usePieces(m);

  const [shotApi, setShotApi] = useState(null);
  const mWithShot = useMemo(() => ({ ...m, __shotApi: shotApi }), [m, shotApi]);

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      <Panel m={mWithShot} setM={setM} despiece={despiece} />

      <div style={{ flex: 1, height: "100vh", background: "#f2f2f2" }}>
        <Canvas
          shadows
          camera={{ position: [0, 2.4, 7.5], fov: 45, near: 0.1, far: 200 }}
          gl={{ antialias: true, physicallyCorrectLights: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
          }}
        >
          <ScreenshotRig onReady={setShotApi} />
          <Scene m={m} />
        </Canvas>
      </div>
    </div>
  );
}
