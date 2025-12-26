// src/pages/GeneradorMueble3D.jsx
import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Bounds,
  ContactShadows,
  Environment,
  Edges,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

/* =========================
   Fallbacks
========================= */
const WHITE_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/aeuFJ0AAAAASUVORK5CYII=";

const NORMAL_NEUTRAL = WHITE_PIXEL;

/* =========================
   Constantes
========================= */
const MM_TO_UNITS = 0.01;
const FRONT_GAP_MM = 2;
const DOOR_THICK_MM = 18;
const LEG_SIZE_MM = 40;

const TIPOS = [
  { id: "estanteria", label: "Estantería (simple)" },
  { id: "escritorio", label: "Escritorio (lados configurables)" },
  { id: "modulo_zonas", label: "Módulo (arriba/abajo configurable)" },
];

const MATERIALES = {
  pino: {
    label: "Pino natural",
    color: "#ffffff",
    roughness: 0.75,
    metalness: 0.0,
    mapUrl: "/materiales/pino.jpg",
    normalUrl: "",
    roughUrl: "",
    repeat: [1.25, 1.25],
    clearcoat: 0.05,
    clearcoatRoughness: 0.65,
    specularIntensity: 0.25,
    envMapIntensity: 0.65,
  },
  melamina_blanca: {
    label: "Melamina blanca",
    color: "#ffffff",
    roughness: 0.28,
    metalness: 0.02,
    mapUrl: "/materiales/melamina_blanca.jpg",
    normalUrl: "",
    roughUrl: "",
    repeat: [1.0, 1.0],
    clearcoat: 0.85,
    clearcoatRoughness: 0.06,
    specularIntensity: 0.9,
    envMapIntensity: 1.25,
  },
  melamina_negra: {
    label: "Melamina negra",
    color: "#ffffff",
    roughness: 0.22,
    metalness: 0.06,
    mapUrl: "/materiales/melamina_negra.jpg",
    normalUrl: "",
    roughUrl: "",
    repeat: [1.0, 1.0],
    clearcoat: 0.9,
    clearcoatRoughness: 0.07,
    specularIntensity: 1.0,
    envMapIntensity: 1.35,
  },
};

/* =========================
   Helpers
========================= */
function clampNum(v, min = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}

function defaultSideTop() {
  return {
    tipo: "puertas", // puertas | estanteria | vacio
    estantes: 1,
    puertas: { activo: true, hojas: 2 },
  };
}
function defaultSideBottom() {
  return {
    tipo: "cajonera", // estanteria | cajonera | puertas | vacio
    estantes: 1,
    puertas: { activo: false, hojas: 2 },
    cajones: [{ alto: 160 }, { alto: 160 }, { alto: 220 }],
  };
}
function defaultDeskSide() {
  return {
    activo: true,
    ancho: 350,
    tipo: "cajonera", // cajonera | estanteria | vacio
    estantes: 2,
    cajones: [{ alto: 140 }, { alto: 140 }, { alto: 180 }],
    soporteVacio: "placa", // placa | marco | patas
  };
}

/* =========================
   3D Piece
========================= */
function Piece({ size, position, materialProps }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial {...materialProps} />
      <Edges color="#111" />
    </mesh>
  );
}

/* =========================
   Generación de piezas
========================= */
function usePieces(m) {
  const s = MM_TO_UNITS;

  const W = Math.max(1, m.ancho) * s;
  const H = Math.max(1, m.alto) * s;
  const D = Math.max(1, m.profundidad) * s;
  const T = Math.max(1, m.espesor) * s;

  const usableDepth = Math.max(D - T, T);
  const zUsableCenter = T / 2;

  const legsOn = !!m.patas?.activo;
  const legH = (legsOn ? Math.max(0, Number(m.patas.altura || 0)) : 0) * s;

  return useMemo(() => {
    const list = [];
    const addBox = (size, pos) => list.push({ size, pos });

    const zFront = D / 2 + (DOOR_THICK_MM * s) / 2 + FRONT_GAP_MM * s;

    const makeCaja = () => {
      const bodyH = H;
      const yBodyCenter = 0;

      const xSide = W / 2 - T / 2;
      const innerW = Math.max(W - 2 * T, T);

      // laterales
      addBox([T, bodyH, D], [xSide, yBodyCenter, 0]);
      addBox([T, bodyH, D], [-xSide, yBodyCenter, 0]);

      // base/tapa
      const yBase = yBodyCenter - bodyH / 2 + T / 2;
      const yTop = yBodyCenter + bodyH / 2 - T / 2;
      addBox([innerW, T, usableDepth], [0, yBase, zUsableCenter]);
      addBox([innerW, T, usableDepth], [0, yTop, zUsableCenter]);

      // fondo
      const zBack = -D / 2 + T / 2;
      addBox([innerW, bodyH, T], [0, yBodyCenter, zBack]);

      return { innerW, bodyH, yBodyCenter };
    };

    /* ====== ESTANTERÍA SIMPLE ====== */
    if (m.tipo === "estanteria") {
      const { innerW, bodyH, yBodyCenter } = makeCaja();
      const yInnerBottom = yBodyCenter - bodyH / 2 + T;
      const innerH = Math.max(bodyH - 2 * T, T);

      const n = Math.max(0, Math.floor(m.estantes || 0));
      if (n > 0) {
        const step = innerH / (n + 1);
        for (let i = 1; i <= n; i++) {
          addBox([innerW, T, usableDepth], [0, yInnerBottom + step * i, zUsableCenter]);
        }
      }
    }

    /* ====== ESCRITORIO ====== */
    if (m.tipo === "escritorio") {
      const faldaMm = Math.max(0, Number(m.falda || 0));
      const falda = faldaMm * s;

      // tapa
      const yTop = H / 2 - T / 2;
      addBox([W, T, D], [0, yTop, 0]);

      const left = m.escritorio?.ladoIzq ?? defaultDeskSide();
      const right = m.escritorio?.ladoDer ?? defaultDeskSide();

      const leftW = (left.activo ? clampNum(left.ancho, 0) : 0) * s;
      const rightW = (right.activo ? clampNum(right.ancho, 0) : 0) * s;

      const maxSide = Math.max((W - T) / 2, 0);
      const lW = Math.min(leftW, maxSide);
      const rW = Math.min(rightW, maxSide);

      const innerTopY = yTop - T;
      const supportH = Math.max(H - T, T);
      const ySupportCenter = innerTopY - supportH / 2;

      // Hueco real entre lados (no asumimos centrado)
      const xLeftEdge = -W / 2 + lW;
      const xRightEdge = W / 2 - rW;

      const panelW = Math.max(xRightEdge - xLeftEdge, 0);
      const panelX = (xLeftEdge + xRightEdge) / 2;

      const EPS = 0.0005;
      const zBack = -D / 2 + T / 2 - EPS;

      const traseraModo = m.escritorio?.traseraModo || "falda";

      // Fondo cerrado (altura configurable / corte por patas)
      if (traseraModo === "fondo" && panelW > 0) {
        const fondoAlturaMm = clampNum(m.escritorio?.fondoAlturaMm ?? 0, 0);
        const fondoAltura = fondoAlturaMm > 0 ? fondoAlturaMm * s : 0;

        const cortePorPatas = m.escritorio?.cortePorPatas !== false;

        const floorY = -H / 2;
        const bottomClear = cortePorPatas && legsOn ? legH : 0;

        const yTopInner = yTop - T / 2;
        const yBottomLimit = floorY + bottomClear;

        const maxFondoH = Math.max(yTopInner - yBottomLimit, T);
        const fondoH = fondoAltura > 0 ? Math.min(fondoAltura, maxFondoH) : maxFondoH;

        const yFondoCenter = yTopInner - fondoH / 2;
        addBox([panelW, fondoH, T], [panelX, yFondoCenter, zBack]);
      }

      // Falda (siempre atrás, ajustada al hueco)
      if (traseraModo === "falda" && falda > 0 && panelW > 0) {
        const yFalda = yTop - T / 2 - falda / 2;
        addBox([panelW, falda, T], [panelX, yFalda, zBack]);
      }

      const renderDeskSide = (cfg, xCenter, sideW, isLeft) => {
        if (!cfg?.activo || sideW <= 0) return;

        const xStart = xCenter - sideW / 2;
        const xEnd = xCenter + sideW / 2;

        const yBottom = ySupportCenter - supportH / 2;
        const yTopLocal = ySupportCenter + supportH / 2;

        // VACÍO: placa/marco/patas
        if (cfg.tipo === "vacio") {
          const modo = cfg.soporteVacio || "placa";

          if (modo === "placa") {
            const xPanel = isLeft ? xStart + T / 2 : xEnd - T / 2;
            addBox([T, supportH, D], [xPanel, ySupportCenter, 0]);
            return;
          }

          if (modo === "marco") {
            const xOuter = isLeft ? xStart + T / 2 : xEnd - T / 2;
            const xInner = isLeft ? xEnd - T / 2 : xStart + T / 2;
            addBox([T, supportH, D], [xOuter, ySupportCenter, 0]);
            addBox([T, supportH, D], [xInner, ySupportCenter, 0]);
            return;
          }

          if (modo === "patas") {
            const legSize = Math.min(LEG_SIZE_MM * s, sideW / 3, D / 3);
            const x1 = xStart + legSize / 2;
            const x2 = xEnd - legSize / 2;
            const z1 = D / 2 - legSize / 2;
            const z2 = -D / 2 + legSize / 2;

            addBox([legSize, supportH, legSize], [x1, ySupportCenter, z1]);
            addBox([legSize, supportH, legSize], [x2, ySupportCenter, z1]);
            addBox([legSize, supportH, legSize], [x1, ySupportCenter, z2]);
            addBox([legSize, supportH, legSize], [x2, ySupportCenter, z2]);
            return;
          }

          return;
        }

        // carcasa
        const innerSideW = Math.max(sideW - 2 * T, T);

        addBox([T, supportH, D], [xStart + T / 2, ySupportCenter, 0]);
        addBox([T, supportH, D], [xEnd - T / 2, ySupportCenter, 0]);

        addBox([innerSideW, T, usableDepth], [xCenter, yBottom + T / 2, zUsableCenter]);
        addBox([innerSideW, T, usableDepth], [xCenter, yTopLocal - T / 2, zUsableCenter]);

        // fondo lateral
        const zBackSide = -D / 2 + T / 2;
        addBox([Math.max(sideW - T, T), supportH, T], [xCenter, ySupportCenter, zBackSide]);

        // estantería
        if (cfg.tipo === "estanteria") {
          const n = Math.max(0, Math.floor(cfg.estantes || 0));
          if (n > 0) {
            const usableH = Math.max(supportH - 2 * T, T);
            const step = usableH / (n + 1);
            const yShelfStart = yBottom + T;
            for (let i = 1; i <= n; i++) {
              const y = yShelfStart + step * i;
              addBox([innerSideW, T, usableDepth], [xCenter, y, zUsableCenter]);
            }
          }
        }

        // cajonera (frentes)
        if (cfg.tipo === "cajonera") {
          const doorT = DOOR_THICK_MM * s;
          const yStart = yBottom + T;
          const usableH = Math.max(supportH - 2 * T, T);

          let yStack = yStart;
          const cajones = Array.isArray(cfg.cajones) ? cfg.cajones : [];

          for (let i = 0; i < cajones.length; i++) {
            const h = clampNum(cajones[i].alto, 40) * s;
            if (yStack + h > yStart + usableH) break;

            addBox([innerSideW, h, doorT], [xCenter, yStack + h / 2, zFront]);
            yStack += h;
          }
        }
      };

      const xLeftCenter = -W / 2 + lW / 2;
      const xRightCenter = W / 2 - rW / 2;

      renderDeskSide(left, xLeftCenter, lW, true);
      renderDeskSide(right, xRightCenter, rW, false);
    }

    /* ====== MÓDULO POR ZONAS ====== */
    if (m.tipo === "modulo_zonas") {
      const { innerW, bodyH, yBodyCenter } = makeCaja();

      const yInnerBottom = yBodyCenter - bodyH / 2 + T;
      const innerH = Math.max(bodyH - 2 * T, T);

      const hSupMm = clampNum(m.zonas?.altoSuperior ?? 0, 0);
      const hSup = Math.min(hSupMm * s, innerH);
      const hInf = Math.max(innerH - hSup, 0);

      const hasDivider = hSup > 0 && hInf > 0;
      if (hasDivider) addBox([innerW, T, usableDepth], [0, yInnerBottom + hInf, zUsableCenter]);

      const halfW = innerW / 2;

      const renderCfgBlock = (cfg, xCenter, yStart, zoneH, width, allowCajonera) => {
        if (!cfg || cfg.tipo === "vacio" || zoneH <= 0) return;

        // estantes
        if (cfg.tipo === "estanteria") {
          const n = Math.max(0, Math.floor(cfg.estantes || 0));
          if (n > 0) {
            const step = zoneH / (n + 1);
            for (let i = 1; i <= n; i++) {
              addBox([width, T, usableDepth], [xCenter, yStart + step * i, zUsableCenter]);
            }
          }
        }

        // puertas (frentes)
        if (cfg.tipo === "puertas" && cfg.puertas?.activo) {
          const hojas = Math.max(1, Math.floor(cfg.puertas.hojas || 1));
          const doorT = DOOR_THICK_MM * s;
          const doorH = Math.max(zoneH, T);
          const yDoor = yStart + doorH / 2;
          const eachW = width / hojas;

          for (let h = 0; h < hojas; h++) {
            const x = xCenter - width / 2 + eachW * h + eachW / 2;
            addBox([eachW, doorH, doorT], [x, yDoor, zFront]);
          }
        }

        // cajones (frentes)
        if (allowCajonera && cfg.tipo === "cajonera") {
          const doorT = DOOR_THICK_MM * s;
          const cajones = Array.isArray(cfg.cajones) ? cfg.cajones : [];
          let yStack = yStart;

          for (let i = 0; i < cajones.length; i++) {
            const h = clampNum(cajones[i].alto, 40) * s;
            if (yStack + h > yStart + zoneH) break;
            addBox([width, h, doorT], [xCenter, yStack + h / 2, zFront]);
            yStack += h;
          }
        }
      };

      const yInf = yInnerBottom;
      const ySup = yInnerBottom + hInf + (hasDivider ? T : 0);

      // ABAJO
      if (m.zonas.layoutAbajo === "single") {
        renderCfgBlock(m.zonas.abajo.single, 0, yInf, hInf, innerW, true);
      } else {
        addBox([T, hInf, D], [0, yInf + hInf / 2, 0]);
        renderCfgBlock(m.zonas.abajo.izquierda, -innerW / 4, yInf, hInf, halfW, true);
        renderCfgBlock(m.zonas.abajo.derecha, innerW / 4, yInf, hInf, halfW, true);
      }

      // ARRIBA
      if (m.zonas.layoutArriba === "single") {
        renderCfgBlock(m.zonas.arriba.single, 0, ySup, hSup, innerW, false);
      } else {
        addBox([T, hSup, D], [0, ySup + hSup / 2, 0]);
        renderCfgBlock(m.zonas.arriba.izquierda, -innerW / 4, ySup, hSup, halfW, false);
        renderCfgBlock(m.zonas.arriba.derecha, innerW / 4, ySup, hSup, halfW, false);
      }
    }

    // PATAS GLOBALES (solo visual, en el piso)
    if (legsOn) {
      const sLeg = Math.min(LEG_SIZE_MM * s, W / 8, D / 6);
      const yLegCenter = sLeg / 2;

      const x1 = -W / 2 + sLeg;
      const x2 = W / 2 - sLeg;
      const z1 = D / 2 - sLeg;
      const z2 = -D / 2 + sLeg;

      addBox([sLeg, legH, sLeg], [x1, yLegCenter, z1]);
      addBox([sLeg, legH, sLeg], [x2, yLegCenter, z1]);
      addBox([sLeg, legH, sLeg], [x1, yLegCenter, z2]);
      addBox([sLeg, legH, sLeg], [x2, yLegCenter, z2]);
    }

    return list;
  }, [
    m.tipo,
    m.ancho,
    m.alto,
    m.profundidad,
    m.espesor,
    m.estantes,
    m.falda,
    m.patas?.activo,
    m.patas?.altura,
    m.zonas,
    m.escritorio,
  ]);
}

/* =========================
   Mueble3D wrapper
========================= */
function Mueble3D({ m, materialProps }) {
  const pieces = usePieces(m);
  const H = Math.max(1, m.alto) * MM_TO_UNITS;

  return (
    <group position={[0, H / 2, 0]}>
      {pieces.map((p, idx) => (
        <Piece key={idx} size={p.size} position={p.pos} materialProps={materialProps} />
      ))}
    </group>
  );
}

/* =========================
   Scene (material + fondo + luz)
========================= */
function Scene({ m }) {
  const cfg = MATERIALES[m.material] || MATERIALES.pino;
  const fondoModo = m.fondoModo || "habitacion"; // hdri | habitacion | gris

  // Texturas del material (con fallback si no existen archivos)
  const tex = useTexture({
    map: cfg.mapUrl || WHITE_PIXEL,
    normalMap: cfg.normalUrl || NORMAL_NEUTRAL,
    roughnessMap: cfg.roughUrl || WHITE_PIXEL,
  });

  useEffect(() => {
    const [rx, ry] = cfg.repeat || [1, 1];

    const setupMap = (t, isColorMap = false) => {
      if (!t) return;
      if (isColorMap) t.colorSpace = THREE.SRGBColorSpace;

      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);

      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
    };

    setupMap(tex.map, true);
    setupMap(tex.normalMap, false);
    setupMap(tex.roughnessMap, false);
  }, [cfg.repeat, tex]);

  const materialProps = useMemo(() => {
    return {
      color: cfg.color,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      map: tex.map,

      clearcoat: cfg.clearcoat ?? 0,
      clearcoatRoughness: cfg.clearcoatRoughness ?? 0.2,

      specularIntensity: cfg.specularIntensity ?? 0.5,
      specularColor: new THREE.Color(1, 1, 1),

      envMapIntensity: cfg.envMapIntensity ?? 1.0,

      normalMap: cfg.normalUrl ? tex.normalMap : null,
      roughnessMap: cfg.roughUrl ? tex.roughnessMap : null,
    };
  }, [cfg, tex]);

  // Fondo habitación (como background real)
  const { scene } = useThree();
  const roomBg = useTexture(fondoModo === "habitacion" ? "/fondos/habitacion.jpg" : WHITE_PIXEL);

  useEffect(() => {
    // fondo “gris”
    if (fondoModo === "gris") {
      scene.background = new THREE.Color("#e9eaec");
      return () => {
        scene.background = null;
      };
    }

    // fondo “habitación”
    if (fondoModo === "habitacion") {
      roomBg.colorSpace = THREE.SRGBColorSpace;
      scene.background = roomBg;
      return () => {
        scene.background = null;
      };
    }

    // hdri: lo maneja Environment
    scene.background = null;
    return () => {
      scene.background = null;
    };
  }, [fondoModo, roomBg, scene]);

  return (
    <>
      {/* HDRI: se ve solo si fondoModo === "hdri" */}
      <Environment preset="warehouse" background={fondoModo === "hdri"} />

      <ambientLight intensity={0.18} />

      <directionalLight
        position={[8, 12, 6]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-6, 6, -8]} intensity={0.35} />

      {/* Piso showroom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#efefef" roughness={0.92} metalness={0.0} />
      </mesh>

      <ContactShadows position={[0, 0.001, 0]} scale={18} blur={2.6} opacity={0.55} far={10} />

      <Bounds fit clip observe margin={1.25}>
        <Mueble3D m={m} materialProps={materialProps} />
      </Bounds>

      <OrbitControls
        makeDefault
        target={[0, 0.9, 0]}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={2.5}
        maxDistance={40}
      />
    </>
  );
}

/* =========================
   Panel UI (completo, sin faltantes)
========================= */
function Panel({ m, setM }) {
  const labelStyle = { display: "block", marginBottom: 6, fontSize: 12, color: "#333" };
  const inputBase = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e6e6e6" };
  const cardStyle = {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    marginBottom: 12,
  };
  const cardTitle = { fontSize: 13, fontWeight: 900, marginBottom: 10 };

  const setField =
    (key, min = 0) =>
    (e) =>
      setM((p) => ({ ...p, [key]: clampNum(e.target.value, min) }));

  const setDeep = (mutator) => {
    setM((p) => {
      const next = structuredClone(p);
      mutator(next);
      return next;
    });
  };

  const setTipo = (e) => {
    const tipo = e.target.value;

    setM((p) => {
      if (tipo === "escritorio") {
        return {
          ...p,
          tipo,
          ancho: 1400,
          alto: 750,
          profundidad: 650,
          espesor: p.espesor ?? 18,
          falda: 80,
          patas: { ...p.patas, activo: false },
          escritorio: {
            traseraModo: "falda",
            fondoAlturaMm: 0,
            cortePorPatas: true,
            ladoIzq: defaultDeskSide(),
            ladoDer: { ...defaultDeskSide(), tipo: "estanteria", estantes: 2, ancho: 300 },
          },
        };
      }

      if (tipo === "modulo_zonas") {
        return {
          ...p,
          tipo,
          ancho: 800,
          alto: 1800,
          profundidad: 350,
          espesor: p.espesor ?? 18,
          patas: { activo: true, altura: 120 },
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
        };
      }

      return {
        ...p,
        tipo,
        ancho: 800,
        alto: 1800,
        profundidad: 350,
        espesor: p.espesor ?? 18,
        estantes: 4,
        patas: { ...p.patas, activo: false },
      };
    });
  };

  const DeskSideEditor = ({ keyName, title }) => {
    const cfg = m.escritorio?.[keyName];
    if (!cfg) return null;

    return (
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 10 }}>{title}</div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={!!cfg.activo}
            onChange={() =>
              setDeep((next) => {
                next.escritorio[keyName].activo = !next.escritorio[keyName].activo;
              })
            }
          />
          <span style={{ fontSize: 12 }}>Activo</span>
        </label>

        {cfg.activo && (
          <>
            <label style={labelStyle}>Ancho (mm)</label>
            <input
              type="number"
              value={cfg.ancho}
              onChange={(e) =>
                setDeep((next) => {
                  next.escritorio[keyName].ancho = clampNum(e.target.value, 0);
                })
              }
              style={inputBase}
            />

            <div style={{ height: 10 }} />

            <label style={labelStyle}>Tipo</label>
            <select
              value={cfg.tipo}
              onChange={(e) =>
                setDeep((next) => {
                  next.escritorio[keyName].tipo = e.target.value;
                })
              }
              style={inputBase}
            >
              <option value="cajonera">Cajonera</option>
              <option value="estanteria">Estantería</option>
              <option value="vacio">Vacío</option>
            </select>

            {cfg.tipo === "vacio" && (
              <>
                <div style={{ height: 10 }} />
                <label style={labelStyle}>Soporte (vacío)</label>
                <select
                  value={cfg.soporteVacio || "placa"}
                  onChange={(e) =>
                    setDeep((next) => {
                      next.escritorio[keyName].soporteVacio = e.target.value;
                    })
                  }
                  style={inputBase}
                >
                  <option value="placa">Placa</option>
                  <option value="marco">Marco (2 placas)</option>
                  <option value="patas">Patas</option>
                </select>
              </>
            )}

            {cfg.tipo === "estanteria" && (
              <>
                <div style={{ height: 10 }} />
                <label style={labelStyle}>Estantes</label>
                <input
                  type="number"
                  min={0}
                  value={cfg.estantes ?? 0}
                  onChange={(e) =>
                    setDeep((next) => {
                      next.escritorio[keyName].estantes = clampNum(e.target.value, 0);
                    })
                  }
                  style={inputBase}
                />
              </>
            )}

            {cfg.tipo === "cajonera" && (
              <>
                <div style={{ height: 12 }} />
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Cajones (alto frente)</div>

                {(cfg.cajones ?? []).map((c, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      type="number"
                      value={c.alto}
                      onChange={(e) =>
                        setDeep((next) => {
                          next.escritorio[keyName].cajones[idx].alto = clampNum(e.target.value, 40);
                        })
                      }
                      style={{ ...inputBase, flex: 1, margin: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDeep((next) => {
                          next.escritorio[keyName].cajones.splice(idx, 1);
                        })
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #e6e6e6",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      X
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setDeep((next) => {
                      next.escritorio[keyName].cajones.push({ alto: 160 });
                    })
                  }
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #e6e6e6",
                    background: "#f7f7f7",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  + Agregar cajón
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const SideEditor = ({ title, cfg, onChangeCfg, allowCajonera }) => {
    return (
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 10 }}>{title}</div>

        <label style={labelStyle}>Tipo</label>
        <select
          value={cfg.tipo}
          onChange={(e) => onChangeCfg((draft) => (draft.tipo = e.target.value))}
          style={inputBase}
        >
          <option value="estanteria">Estantería</option>
          <option value="puertas">Puertas</option>
          {allowCajonera && <option value="cajonera">Cajonera</option>}
          <option value="vacio">Vacío</option>
        </select>

        {cfg.tipo === "estanteria" && (
          <>
            <div style={{ height: 10 }} />
            <label style={labelStyle}>Estantes</label>
            <input
              type="number"
              min={0}
              value={cfg.estantes ?? 0}
              onChange={(e) => onChangeCfg((draft) => (draft.estantes = clampNum(e.target.value, 0)))}
              style={inputBase}
            />
          </>
        )}

        {cfg.tipo === "puertas" && (
          <>
            <div style={{ height: 10 }} />
            <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={!!cfg.puertas?.activo}
                onChange={() => onChangeCfg((draft) => (draft.puertas.activo = !draft.puertas.activo))}
              />
              <span style={{ fontSize: 12 }}>Activar puertas</span>
            </label>

            {cfg.puertas?.activo && (
              <>
                <label style={labelStyle}>Hojas</label>
                <input
                  type="number"
                  min={1}
                  value={cfg.puertas?.hojas ?? 2}
                  onChange={(e) => onChangeCfg((draft) => (draft.puertas.hojas = clampNum(e.target.value, 1)))}
                  style={inputBase}
                />
              </>
            )}
          </>
        )}

        {allowCajonera && cfg.tipo === "cajonera" && (
          <>
            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Cajones (alto frente)</div>

            {(cfg.cajones ?? []).map((c, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="number"
                  value={c.alto}
                  onChange={(e) => onChangeCfg((draft) => (draft.cajones[idx].alto = clampNum(e.target.value, 40)))}
                  style={{ ...inputBase, flex: 1, margin: 0 }}
                />
                <button
                  type="button"
                  onClick={() => onChangeCfg((draft) => draft.cajones.splice(idx, 1))}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e6e6e6",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  X
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => onChangeCfg((draft) => draft.cajones.push({ alto: 160 }))}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e6e6e6",
                background: "#f7f7f7",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              + Agregar cajón
            </button>
          </>
        )}
      </div>
    );
  };

  const updateZonas = (path, mutator) => {
    setM((p) => {
      const next = structuredClone(p);
      let ref = next.zonas;
      for (const key of path) ref = ref[key];
      mutator(ref);
      return next;
    });
  };

  return (
    <div
      style={{
        width: 430,
        height: "100vh",
        overflowY: "auto",
        borderRight: "1px solid #e7e7e7",
        background: "#fafafa",
      }}
    >
      <div style={{ padding: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Generador 3D</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Fondo habitación + módulos completos (izq/der, cajones, puertas, estantes).
          </div>
        </div>

        {/* LOOK & FEEL */}
        <div style={cardStyle}>
          <div style={cardTitle}>Look & Feel</div>

          <label style={labelStyle}>Fondo</label>
          <select
            value={m.fondoModo || "habitacion"}
            onChange={(e) => setM((p) => ({ ...p, fondoModo: e.target.value }))}
            style={inputBase}
          >
            <option value="habitacion">Habitación (imagen)</option>
            <option value="hdri">Taller/Galpón (HDRI warehouse)</option>
            <option value="gris">Gris neutro</option>
          </select>

          {m.fondoModo === "habitacion" && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#777" }}>
              Archivo: <b>client/public/fondos/habitacion.jpg</b>
            </div>
          )}

          <div style={{ height: 10 }} />

          <label style={labelStyle}>Material</label>
          <select
            value={m.material}
            onChange={(e) => setM((p) => ({ ...p, material: e.target.value }))}
            style={inputBase}
          >
            {Object.entries(MATERIALES).map(([key, mat]) => (
              <option key={key} value={key}>
                {mat.label}
              </option>
            ))}
          </select>
        </div>

        {/* CONFIG GENERAL */}
        <div style={cardStyle}>
          <div style={cardTitle}>Configuración</div>

          <label style={labelStyle}>Tipo</label>
          <select value={m.tipo} onChange={setTipo} style={inputBase}>
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <div style={{ height: 10 }} />
          <label style={labelStyle}>Ancho (mm)</label>
          <input type="number" value={m.ancho} onChange={setField("ancho", 1)} style={inputBase} />

          <div style={{ height: 10 }} />
          <label style={labelStyle}>Alto (mm)</label>
          <input type="number" value={m.alto} onChange={setField("alto", 1)} style={inputBase} />

          <div style={{ height: 10 }} />
          <label style={labelStyle}>Profundidad (mm)</label>
          <input type="number" value={m.profundidad} onChange={setField("profundidad", 1)} style={inputBase} />

          <div style={{ height: 10 }} />
          <label style={labelStyle}>Espesor (mm)</label>
          <input type="number" value={m.espesor} onChange={setField("espesor", 1)} style={inputBase} />
        </div>

        {/* PATAS */}
        <div style={cardStyle}>
          <div style={cardTitle}>Base</div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={!!m.patas?.activo}
              onChange={() =>
                setDeep((next) => {
                  next.patas.activo = !next.patas.activo;
                })
              }
            />
            <span style={{ fontSize: 12 }}>Patas (global)</span>
          </label>

          {m.patas?.activo && (
            <>
              <label style={labelStyle}>Altura patas (mm)</label>
              <input
                type="number"
                value={m.patas.altura}
                onChange={(e) =>
                  setDeep((next) => {
                    next.patas.altura = clampNum(e.target.value, 0);
                  })
                }
                style={inputBase}
              />
            </>
          )}
        </div>

        {/* ESTANTERÍA SIMPLE */}
        {m.tipo === "estanteria" && (
          <div style={cardStyle}>
            <div style={cardTitle}>Estantería</div>
            <label style={labelStyle}>Cantidad de estantes</label>
            <input
              type="number"
              min={0}
              value={m.estantes ?? 0}
              onChange={(e) => setM((p) => ({ ...p, estantes: clampNum(e.target.value, 0) }))}
              style={inputBase}
            />
          </div>
        )}

        {/* ESCRITORIO */}
        {m.tipo === "escritorio" && (
          <div style={cardStyle}>
            <div style={cardTitle}>Escritorio</div>

            <label style={labelStyle}>Trasera</label>
            <select
              value={m.escritorio?.traseraModo || "falda"}
              onChange={(e) =>
                setDeep((next) => {
                  next.escritorio.traseraModo = e.target.value;
                })
              }
              style={inputBase}
            >
              <option value="fondo">Fondo cerrado</option>
              <option value="falda">Falda</option>
              <option value="nada">Nada</option>
            </select>

            {m.escritorio?.traseraModo === "fondo" && (
              <>
                <div style={{ height: 10 }} />
                <label style={labelStyle}>Altura fondo (mm) (0 = auto)</label>
                <input
                  type="number"
                  min={0}
                  value={m.escritorio?.fondoAlturaMm ?? 0}
                  onChange={(e) =>
                    setDeep((next) => {
                      next.escritorio.fondoAlturaMm = clampNum(e.target.value, 0);
                    })
                  }
                  style={inputBase}
                />

                <div style={{ height: 10 }} />
                <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={m.escritorio?.cortePorPatas !== false}
                    onChange={() =>
                      setDeep((next) => {
                        next.escritorio.cortePorPatas = !(next.escritorio.cortePorPatas !== false);
                      })
                    }
                  />
                  <span style={{ fontSize: 12 }}>Cortar fondo si hay patas globales</span>
                </label>
              </>
            )}

            {m.escritorio?.traseraModo === "falda" && (
              <>
                <div style={{ height: 10 }} />
                <label style={labelStyle}>Falda (mm)</label>
                <input
                  type="number"
                  min={0}
                  value={m.falda ?? 0}
                  onChange={(e) => setM((p) => ({ ...p, falda: clampNum(e.target.value, 0) }))}
                  style={inputBase}
                />
              </>
            )}

            <div style={{ height: 12 }} />
            <div style={{ fontSize: 12, color: "#666" }}>
              Lados izquierda/derecha: cajonera / estantería / vacío.
            </div>

            <DeskSideEditor keyName="ladoIzq" title="Lado izquierdo" />
            <DeskSideEditor keyName="ladoDer" title="Lado derecho" />
          </div>
        )}

        {/* MÓDULO POR ZONAS */}
        {m.tipo === "modulo_zonas" && (
          <div style={cardStyle}>
            <div style={cardTitle}>Módulo por zonas</div>

            <label style={labelStyle}>Alto zona superior (mm)</label>
            <input
              type="number"
              min={0}
              value={m.zonas?.altoSuperior ?? 0}
              onChange={(e) =>
                setDeep((next) => {
                  next.zonas.altoSuperior = clampNum(e.target.value, 0);
                })
              }
              style={inputBase}
            />

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Arriba</div>

            <label style={labelStyle}>Modo</label>
            <select
              value={m.zonas?.layoutArriba || "split"}
              onChange={(e) =>
                setDeep((next) => {
                  next.zonas.layoutArriba = e.target.value;
                })
              }
              style={inputBase}
            >
              <option value="split">Izquierda / Derecha</option>
              <option value="single">Bloque único</option>
            </select>

            {m.zonas?.layoutArriba === "single" ? (
              <SideEditor
                title="Arriba (único)"
                cfg={m.zonas.arriba.single}
                allowCajonera={false}
                onChangeCfg={(mutator) => updateZonas(["arriba", "single"], mutator)}
              />
            ) : (
              <>
                <SideEditor
                  title="Arriba (izquierda)"
                  cfg={m.zonas.arriba.izquierda}
                  allowCajonera={false}
                  onChangeCfg={(mutator) => updateZonas(["arriba", "izquierda"], mutator)}
                />
                <SideEditor
                  title="Arriba (derecha)"
                  cfg={m.zonas.arriba.derecha}
                  allowCajonera={false}
                  onChangeCfg={(mutator) => updateZonas(["arriba", "derecha"], mutator)}
                />
              </>
            )}

            <div style={{ height: 12 }} />
            <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Abajo</div>

            <label style={labelStyle}>Modo</label>
            <select
              value={m.zonas?.layoutAbajo || "split"}
              onChange={(e) =>
                setDeep((next) => {
                  next.zonas.layoutAbajo = e.target.value;
                })
              }
              style={inputBase}
            >
              <option value="split">Izquierda / Derecha</option>
              <option value="single">Bloque único</option>
            </select>

            {m.zonas?.layoutAbajo === "single" ? (
              <SideEditor
                title="Abajo (único)"
                cfg={m.zonas.abajo.single}
                allowCajonera={true}
                onChangeCfg={(mutator) => updateZonas(["abajo", "single"], mutator)}
              />
            ) : (
              <>
                <SideEditor
                  title="Abajo (izquierda)"
                  cfg={m.zonas.abajo.izquierda}
                  allowCajonera={true}
                  onChangeCfg={(mutator) => updateZonas(["abajo", "izquierda"], mutator)}
                />
                <SideEditor
                  title="Abajo (derecha)"
                  cfg={m.zonas.abajo.derecha}
                  allowCajonera={true}
                  onChangeCfg={(mutator) => updateZonas(["abajo", "derecha"], mutator)}
                />
              </>
            )}
          </div>
        )}

        <div style={{ fontSize: 11, color: "#777" }}>
          Tip: rueda = zoom, click derecho = pan, click izquierdo = orbitar.
        </div>
      </div>
    </div>
  );
}

/* =========================
   Componente principal
========================= */
export default function GeneradorMueble3D() {
  const [m, setM] = useState({
    material: "melamina_blanca",
    fondoModo: "habitacion", // "hdri" | "habitacion" | "gris"

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

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      <Panel m={m} setM={setM} />

      <div style={{ flex: 1, height: "100vh", background: "#f2f2f2" }}>
        <Canvas
          shadows
          camera={{ position: [0, 2.4, 7.5], fov: 45, near: 0.1, far: 200 }}
          gl={{ antialias: true, physicallyCorrectLights: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
          }}
        >
          <Scene m={m} />
        </Canvas>
      </div>
    </div>
  );
}
