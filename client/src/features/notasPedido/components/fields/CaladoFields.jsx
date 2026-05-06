import React, { useMemo } from "react";
import CameraImageUploadField from "../../../presupuestos/components/CameraImageUploadField";
import { CORTE_MATERIALES } from "../../config/corteMateriales";

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

function esMaterial(producto) {
  const categoria = normalizar(producto?.categoria);
  return categoria === "MATERIALES" || categoria === "MATERIAL";
}

export default function CaladoFields({ it, setData, productos = [] }) {
  const d = it.data || {};
  const largoCm = Number(String(d.largoCm || "").replace(",", ".") || 0);
  const anchoCm = Number(String(d.anchoCm || "").replace(",", ".") || 0);
  const areaM2 = largoCm > 0 && anchoCm > 0 ? (largoCm / 100) * (anchoCm / 100) : 0;
  const materiales = useMemo(() => {
    const desdeProductos = (Array.isArray(productos) ? productos : [])
      .filter(esMaterial)
      .map((producto) => ({
        value: producto.nombre,
        label: producto.codigo ? `${producto.nombre} (${producto.codigo})` : producto.nombre,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return desdeProductos.length
      ? desdeProductos
      : CORTE_MATERIALES.map((material) => ({
          value: material.descripcion,
          label: material.code ? `${material.descripcion} (${material.code})` : material.descripcion,
        }));
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
