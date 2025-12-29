import { useEffect, useMemo, useRef, useState } from "react";
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
  // Presets de medidas reales por tipo (mm)
  const DIM_PRESETS = useMemo(
    () => ({
      escritorio: {
        ancho: 1200, // 120 cm
        alto: 750, // 75 cm
        profundidad: 600, // 60 cm
        espesor: 18,
        falda: 80,
      },
      estanteria: {
        ancho: 800, // 80 cm
        alto: 1800, // 180 cm
        profundidad: 300, // 30 cm
        espesor: 18,
        estantes: 5,
      },
      modulo_zonas: {
        ancho: 1200, // 120 cm
        alto: 2000, // 200 cm
        profundidad: 500, // 50 cm
        espesor: 18,
        estantes: 5,
      },
    }),
    []
  );

  const [m, setM] = useState({
    material: "melamina_blanca",
    fondoModo: "habitacion",
    // Nota: ahora ya no dependés del piso, pero dejo el campo por compatibilidad
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

  // Aplicar presets cuando cambia el tipo
  const lastTipoRef = useRef(m.tipo);

  useEffect(() => {
    const tipo = m.tipo;
    if (!tipo) return;

    // Solo actuar cuando efectivamente cambió el tipo
    if (lastTipoRef.current === tipo) return;

    const preset = DIM_PRESETS[tipo];

    setM((prev) => {
      const next = { ...prev };

      // 1) Medidas "reales" por tipo
      if (preset) {
        next.ancho = preset.ancho ?? next.ancho;
        next.alto = preset.alto ?? next.alto;
        next.profundidad = preset.profundidad ?? next.profundidad;
        next.espesor = preset.espesor ?? next.espesor;

        // Campos comunes que algunos tipos usan
        if (typeof preset.estantes === "number") next.estantes = preset.estantes;
        if (typeof preset.falda === "number") next.falda = preset.falda;
      }

      // 2) Defaults específicos para evitar “arrastres” entre tipos
      if (tipo === "escritorio") {
        next.patas = next.patas ?? { activo: true, altura: 120 };
        next.falda = typeof next.falda === "number" ? next.falda : 80;

        next.escritorio = {
          traseraModo: "falda",
          fondoAlturaMm: 0,
          cortePorPatas: true,
          ladoIzq: defaultDeskSide(),
          ladoDer: { ...defaultDeskSide(), tipo: "estanteria", estantes: 2, ancho: 300 },
        };
      }

      if (tipo === "estanteria") {
        // Para estantería, patas suelen ser opcionales
        next.patas = next.patas ?? { activo: false, altura: 0 };
        // escritorio/zonas pueden quedar, pero no son relevantes; las dejamos para no romper Panel.
      }

      if (tipo === "modulo_zonas") {
        next.zonas = {
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
        };
      }

      return next;
    });

    lastTipoRef.current = tipo;
  }, [m.tipo, DIM_PRESETS]);

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
