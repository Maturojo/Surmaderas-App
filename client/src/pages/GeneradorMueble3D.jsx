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
    // material global
    material: "melamina_blanca",

    // escena / fondo
    fondoModo: "habitacion",

    // ✅ soporte global (nuevo)
    soporte: "patas", // "patas" | "zocalo" | "nada"

    // ✅ patas (se usa cuando soporte === "patas")
    patas: { activo: true, altura: 120 },

    // ✅ zócalo (se usa cuando soporte === "zocalo")
    zocalo: { altura: 80, retiro: 20 }, // retiro 0 = al ras | >0 = metido (vuelo)

    // materiales por pieza
    materialesPorPieza: { ...MATERIALES_POR_PIEZA_DEFAULT },

    // tipo de mueble + medidas
    tipo: "modulo_zonas",
    ancho: 800,
    alto: 1800,
    profundidad: 350,
    espesor: 18,

    // estantería simple
    estantes: 4,

    // escritorio
    falda: 80,
    escritorio: {
      traseraModo: "falda", // "falda" | "fondo"
      fondoAlturaMm: 0,
      cortePorPatas: true,

      // ✅ nuevos
      tapaVuelo: 0,    // mm de vuelo de tapa
      patasRas: false, // si true, patas acompañan el vuelo

      // laterales del escritorio
      ladoIzq: defaultDeskSide(),
      ladoDer: defaultDeskSide(),
    },

    // módulo por zonas
    zonas: {
      altoSuperior: 900,

      // "split" = izq/der, "single" = un bloque
      layoutArriba: "split",
      layoutAbajo: "split",

      arriba: {
        // si layoutArriba = single
        single: { tipo: "estanteria", estantes: 1, puertas: { activo: false, hojas: 2 }, cajones: [] },

        // si layoutArriba = split
        izquierda: { tipo: "estanteria", estantes: 1, puertas: { activo: false, hojas: 2 }, cajones: [] },
        derecha: { tipo: "puertas", estantes: 0, puertas: { activo: true, hojas: 2 }, cajones: [] },
      },

      abajo: {
        // si layoutAbajo = single
        single: { tipo: "cajonera", estantes: 0, puertas: { activo: false, hojas: 2 }, cajones: [{ alto: 160 }, { alto: 160 }, { alto: 220 }] },

        // si layoutAbajo = split
        izquierda: { tipo: "cajonera", estantes: 0, puertas: { activo: false, hojas: 2 }, cajones: [{ alto: 160 }, { alto: 160 }] },
        derecha: { tipo: "estanteria", estantes: 2, puertas: { activo: false, hojas: 2 }, cajones: [] },
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const materialLabel = (m.material || "material").replaceAll("_", " ");
  const fondoLabel = (m.fondoModo || "habitacion").replaceAll("_", " ");

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top right, rgba(205, 182, 146, 0.18), transparent 24%), linear-gradient(180deg, #f7f1e8 0%, #ece7df 100%)",
      }}
    >
      <Panel m={mWithShot} setM={setM} despiece={despiece} />

      <div style={{ flex: 1, height: "100vh", padding: 18 }}>
        <div
          style={{
            position: "relative",
            height: "100%",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(80, 60, 35, 0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(245,240,232,0.82) 100%)",
            boxShadow: "0 24px 60px rgba(55, 40, 20, 0.12)",
            backdropFilter: "blur(6px)",
          }}
        >
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

          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              display: "grid",
              gap: 10,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "fit-content",
                padding: "10px 14px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.86)",
                border: "1px solid rgba(80, 60, 35, 0.12)",
                boxShadow: "0 10px 26px rgba(55, 40, 20, 0.12)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "#8a7457",
                  marginBottom: 4,
                }}
              >
                Generador 3D
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#2d241c", lineHeight: 1.05 }}>
                Vista interactiva del mueble
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                `Material ${materialLabel}`,
                `Fondo ${fondoLabel}`,
                `${m.ancho} x ${m.alto} x ${m.profundidad} mm`,
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(80, 60, 35, 0.12)",
                    color: "#4e4032",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: "0 8px 18px rgba(55, 40, 20, 0.08)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              right: 18,
              bottom: 18,
              display: "grid",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 18,
              background: "rgba(31, 25, 20, 0.72)",
              color: "#fffaf3",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 16px 32px rgba(20, 14, 8, 0.24)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Controles
            </div>
            <div style={{ fontSize: 13, opacity: 0.92 }}>Arrastrá para rotar</div>
            <div style={{ fontSize: 13, opacity: 0.92 }}>Usá la rueda para hacer zoom</div>
            <div style={{ fontSize: 13, opacity: 0.92 }}>
              Capturas {shotApi ? "listas" : "disponibles al cargar la escena"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
