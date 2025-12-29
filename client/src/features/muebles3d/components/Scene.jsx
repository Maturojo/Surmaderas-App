import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Environment,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { MATERIALES, WHITE_PIXEL, NORMAL_NEUTRAL } from "../constants/materiales";

import { Mueble3D } from "./Mueble3D";

export function Scene({ m }) {
  const fondoModo = m.fondoModo || "habitacion"; // hdri | habitacion | gris

  // --- materiales ---
  const usedMatKeys = useMemo(() => {
    const set = new Set();
    set.add(m.material);
    const mp = m.materialesPorPieza || MATERIALES_POR_PIEZA_DEFAULT;
    Object.values(mp).forEach((k) => set.add(k));
    return Array.from(set);
  }, [m.material, m.materialesPorPieza]);

  const texUrls = useMemo(() => {
    const obj = {};
    for (const key of usedMatKeys) {
      const cfg = MATERIALES[key] || MATERIALES.pino;
      obj[`${key}__map`] = cfg.mapUrl || WHITE_PIXEL;
      obj[`${key}__normal`] = cfg.normalUrl || NORMAL_NEUTRAL;
      obj[`${key}__rough`] = cfg.roughUrl || WHITE_PIXEL;
    }
    return obj;
  }, [usedMatKeys]);

  const texAll = useTexture(texUrls);

  useEffect(() => {
    for (const key of usedMatKeys) {
      const cfg = MATERIALES[key] || MATERIALES.pino;
      const [rx, ry] = cfg.repeat || [1, 1];

      const map = texAll[`${key}__map`];
      const normalMap = texAll[`${key}__normal`];
      const roughnessMap = texAll[`${key}__rough`];

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

      setupMap(map, true);
      setupMap(normalMap, false);
      setupMap(roughnessMap, false);
    }
  }, [usedMatKeys, texAll]);

  const materialPropsByKey = useMemo(() => {
    const out = {};
    for (const key of usedMatKeys) {
      const cfg = MATERIALES[key] || MATERIALES.pino;

      out[key] = {
        color: cfg.color,
        roughness: cfg.roughness,
        metalness: cfg.metalness,
        map: texAll[`${key}__map`],

        clearcoat: cfg.clearcoat ?? 0,
        clearcoatRoughness: cfg.clearcoatRoughness ?? 0.2,

        specularIntensity: cfg.specularIntensity ?? 0.5,
        specularColor: new THREE.Color(1, 1, 1),

        envMapIntensity: cfg.envMapIntensity ?? 1.0,

        normalMap: cfg.normalUrl ? texAll[`${key}__normal`] : null,
        roughnessMap: cfg.roughUrl ? texAll[`${key}__rough`] : null,
      };
    }
    return out;
  }, [usedMatKeys, texAll]);

  // --- fondo fijo (scene.background) ---
  const { scene } = useThree();
  const roomBg = useTexture("/fondos/habitacion.jpg");

  useEffect(() => {
    if (fondoModo === "gris") {
      scene.background = new THREE.Color("#e9eaec");
      return () => {
        scene.background = null;
      };
    }

    if (fondoModo === "habitacion") {
      roomBg.colorSpace = THREE.SRGBColorSpace;
      scene.background = roomBg; // <-- CLAVE: fondo fijo 2D
      return () => {
        scene.background = null;
      };
    }

    // hdri (Environment background)
    scene.background = null;
    return () => {
      scene.background = null;
    };
  }, [fondoModo, roomBg, scene]);

  // Orbit target (centrar cámara en el mueble)
  const altoMm = Math.max(0, Number(m.alto || 1800));
  const altoM = altoMm * 0.001;
  const targetY = Math.max(0.6, Math.min(1.2, altoM * 0.5));

  // Si en Mueble3D lo pegás a pared con z = D/2, conviene targetear también a ese centro.
  const profundidadMm = Math.max(0, Number(m.profundidad || 350));
  const zTarget = (profundidadMm * 0.001) / 2;

  return (
    <>
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

      {/* PISO INVISIBLE SOLO PARA SOMBRA (sensación de apoyo) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial opacity={0.18} />
      </mesh>

      {/* Sombra suave de contacto (muy buen “apoyo” visual) */}
      <ContactShadows
        position={[0, 0.001, zTarget]}
        scale={18}
        blur={2.6}
        opacity={0.55}
        far={10}
      />

      <Bounds fit clip observe margin={1.25}>
        <Mueble3D m={m} materialPropsByKey={materialPropsByKey} />
      </Bounds>

      <OrbitControls
        makeDefault
        target={[0, targetY, zTarget]}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={2.5}
        maxDistance={40}
        enablePan={false}     // <-- solo orbitar/zoom, no “mover todo”
        minPolarAngle={0.15}  // <-- evita meterse bajo el piso
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  );
}
