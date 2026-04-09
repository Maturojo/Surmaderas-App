import { useMemo } from "react";
import {
  Bounds,
  ContactShadows,
  Environment,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

import { MATERIALES_POR_PIEZA_DEFAULT } from "../constants/defaults";
import { MM_TO_UNITS } from "../constants/medidas";
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

  const materialPropsByKey = useMemo(() => {
    const out = {};

    const buildTexture = (texture, repeat, isColorMap = false) => {
      if (!texture) return null;

      const clone = texture.clone();
      const [rx, ry] = repeat || [1, 1];

      if (isColorMap) clone.colorSpace = THREE.SRGBColorSpace;
      clone.wrapS = THREE.RepeatWrapping;
      clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(rx, ry);
      clone.anisotropy = 8;
      clone.minFilter = THREE.LinearMipmapLinearFilter;
      clone.magFilter = THREE.LinearFilter;
      clone.needsUpdate = true;

      return clone;
    };

    for (const key of usedMatKeys) {
      const cfg = MATERIALES[key] || MATERIALES.pino;
      const repeat = cfg.repeat || [1, 1];

      out[key] = {
        color: cfg.color,
        roughness: cfg.roughness,
        metalness: cfg.metalness,
        map: buildTexture(texAll[`${key}__map`], repeat, true),

        clearcoat: cfg.clearcoat ?? 0,
        clearcoatRoughness: cfg.clearcoatRoughness ?? 0.2,

        specularIntensity: cfg.specularIntensity ?? 0.5,
        specularColor: new THREE.Color(1, 1, 1),

        envMapIntensity: cfg.envMapIntensity ?? 1.0,

        normalMap: cfg.normalUrl ? buildTexture(texAll[`${key}__normal`], repeat) : null,
        roughnessMap: cfg.roughUrl ? buildTexture(texAll[`${key}__rough`], repeat) : null,
      };
    }
    return out;
  }, [usedMatKeys, texAll]);

  const roomBg = useTexture("/fondos/habitacion.jpg");
  const roomBackground = useMemo(() => {
    const clone = roomBg.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.needsUpdate = true;
    return clone;
  }, [roomBg]);

  // El mueble se desplaza hacia adelante dentro de Mueble3D para respirar del fondo.
  const Z_FONDO_OFFSET_MM = 250;

  const profundidadUnits = Math.max(0, Number(m.profundidad || 350)) * MM_TO_UNITS;
  const zCenter = profundidadUnits / 2 + Z_FONDO_OFFSET_MM * MM_TO_UNITS;

  // Orbit target (centrar cámara en el mueble real)
  const altoMm = Math.max(0, Number(m.alto || 1800));
  const altoUnits = altoMm * MM_TO_UNITS;
  const targetY = Math.max(2.4, Math.min(12, altoUnits * 0.5));

  return (
    <>
      {fondoModo === "gris" ? <color attach="background" args={["#e9eaec"]} /> : null}
      {fondoModo === "habitacion" ? <primitive attach="background" object={roomBackground} /> : null}

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
        position={[0, 0.02, zCenter]}
        scale={18}
        blur={2.6}
        opacity={0.62}
        far={10}
      />

      <Bounds fit clip observe margin={1.25}>
        <Mueble3D m={m} materialPropsByKey={materialPropsByKey} />
      </Bounds>

      <OrbitControls
        makeDefault
        target={[0, targetY, zCenter]}
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
