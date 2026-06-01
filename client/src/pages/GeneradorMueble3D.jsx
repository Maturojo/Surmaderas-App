import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import { Panel, Scene, ScreenshotRig } from "../features/muebles3d/components";
import { createPreset } from "../features/muebles3d/constants/defaults";
import { usePieces } from "../features/muebles3d/hooks/usePiece";
import { trackModuleUsage } from "../services/estadisticas";

export default function GeneradorMueble3D() {
  useEffect(() => {
    trackModuleUsage("Generador 3D", "herramientas");
  }, []);

  const [m, setM] = useState(() => createPreset("biblioteca"));
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
        background: "linear-gradient(180deg, #f8f7f5 0%, #ece7df 100%)",
      }}
    >
      <Panel m={mWithShot} setM={setM} despiece={despiece} />

      <div style={{ flex: 1, height: "100vh", padding: 18 }}>
        <div
          style={{
            position: "relative",
            height: "100%",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(80, 60, 35, 0.12)",
            background: "#f3eee6",
            boxShadow: "0 24px 60px rgba(55, 40, 20, 0.12)",
          }}
        >
          <Canvas
            shadows
            camera={{ position: [0, 2.6, 8], fov: 45, near: 0.1, far: 200 }}
            gl={{ antialias: true, physicallyCorrectLights: true, preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.12;
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
                borderRadius: 8,
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(80, 60, 35, 0.12)",
                boxShadow: "0 10px 26px rgba(55, 40, 20, 0.12)",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800, color: "#8a7457", marginBottom: 4 }}>
                Generador 3D
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#2d241c", lineHeight: 1.05 }}>
                Mueble 100% editable
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                `Tipo ${m.tipo}`,
                `Material ${materialLabel}`,
                `Fondo ${fondoLabel}`,
                `${m.ancho} x ${m.alto} x ${m.profundidad} mm`,
                `${despiece.length} piezas`,
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.84)",
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
              borderRadius: 8,
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
            <div style={{ fontSize: 13, opacity: 0.92 }}>Arrastra para rotar</div>
            <div style={{ fontSize: 13, opacity: 0.92 }}>Rueda para zoom</div>
            <div style={{ fontSize: 13, opacity: 0.92 }}>{shotApi ? "Captura lista" : "Inicializando captura"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
