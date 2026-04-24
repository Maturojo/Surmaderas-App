import React, { useMemo } from "react";
import CameraImageUploadField from "../../../presupuestos/components/CameraImageUploadField";

const FALLBACK_MATERIALES_CALADO = [
  "FIBRO FACIL 3 MM",
  "FIBRO FACIL 5.5 MM",
  "FIBRO FACIL 9 MM",
  "FIBRO FACIL 12 MM",
  "FIBRO FACIL 15 MM",
  "TABLERO PINO 15 MM",
  "TABLERO PINO 18 MM",
  "FENOLICO 12 MM",
  "FENOLICO 18 MM",
  "CHAPADUR BLANCO 3 MM",
  "CHAPADUR NEGRO 3 MM",
  "TERCIADO 3 MM",
];

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

function normalizar(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function esMaterialCalado(producto) {
  const nombre = normalizar(producto?.nombre);
  const codigo = normalizar(producto?.codigo);
  const categoria = normalizar(producto?.categoria);
  const esMaterial = categoria === "MATERIALES" || categoria === "MATERIAL";

  if (!esMaterial) return false;

  return (
    nombre.includes("FIBRO FACIL") ||
    nombre.includes("TABLERO PINO") ||
    nombre.includes("FENOLICO") ||
    nombre.includes("TERCIADO") ||
    nombre.includes("CHAPADUR") ||
    nombre.includes("FIBRO PLUS BLANCO/NEGRO") ||
    codigo === "CHB"
  );
}

export default function CaladoFields({ it, setData, productos = [] }) {
  const d = it.data || {};
  const largoCm = Number(String(d.largoCm || "").replace(",", ".") || 0);
  const anchoCm = Number(String(d.anchoCm || "").replace(",", ".") || 0);
  const areaM2 = largoCm > 0 && anchoCm > 0 ? (largoCm / 100) * (anchoCm / 100) : 0;
  const materiales = useMemo(() => {
    const desdeProductos = (Array.isArray(productos) ? productos : [])
      .filter(esMaterialCalado)
      .map((producto) => ({
        value: producto.nombre,
        label: producto.codigo ? `${producto.nombre} (${producto.codigo})` : producto.nombre,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return desdeProductos.length
      ? desdeProductos
      : FALLBACK_MATERIALES_CALADO.map((material) => ({ value: material, label: material }));
  }, [productos]);

  return (
    <div className="np-detail-fields">
      <div className="np-detail-top">
        <select className="np-input" value={d.material || ""} onChange={(e) => setData({ material: e.target.value })}>
          <option value="">Seleccionar material</option>
          {materiales.map((material) => (
            <option key={material.value} value={material.value}>
              {material.label}
            </option>
          ))}
        </select>
      </div>

      <input
        className="np-input np-detail-wide"
        value={d.diseno || ""}
        onChange={(e) => setData({ diseno: e.target.value })}
        placeholder="Diseño / Archivo"
      />

      <div className="np-fields-grid-3 np-detail-wide">
        <input
          className="np-input"
          type="number"
          min={0}
          step="0.1"
          value={numOrEmpty(d.largoCm)}
          onChange={(e) => setData({ largoCm: e.target.value })}
          placeholder="Largo (cm)"
        />
        <input
          className="np-input"
          type="number"
          min={0}
          step="0.1"
          value={numOrEmpty(d.anchoCm)}
          onChange={(e) => setData({ anchoCm: e.target.value })}
          placeholder="Ancho (cm)"
        />
        <input
          className="np-input np-readonly"
          readOnly
          value={areaM2 ? `M2: ${areaM2.toFixed(3)}` : "M2: -"}
        />
      </div>

      <input
        className="np-input np-detail-wide"
        value={d.obs || ""}
        onChange={(e) => setData({ obs: e.target.value })}
        placeholder="Observaciones"
      />

      <CameraImageUploadField
        label="Foto o imagen para calado"
        value={d.imagen || null}
        onChange={(img) => setData({ imagen: img })}
        maxMB={1.5}
      />
    </div>
  );
}
