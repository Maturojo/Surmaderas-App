import React from "react";
import ImageUploadField from "./ImageUploadField";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function CaladoFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div className="np-detail-fields">
      <div className="np-fields-grid-2 np-detail-top">
        <input
          className="np-input"
          value={d.material || ""}
          onChange={(e) => setData({ material: e.target.value })}
          placeholder="Material"
        />
        <input
          className="np-input"
          type="number"
          min={0}
          step="0.25"
          value={numOrEmpty(d.horas)}
          onChange={(e) => setData({ horas: e.target.value })}
          placeholder="Horas máquina"
        />
      </div>

      <input
        className="np-input np-detail-wide"
        value={d.diseno || ""}
        onChange={(e) => setData({ diseno: e.target.value })}
        placeholder="Diseño / Archivo"
      />

      <input
        className="np-input np-detail-wide"
        value={d.obs || ""}
        onChange={(e) => setData({ obs: e.target.value })}
        placeholder="Observaciones"
      />

      <ImageUploadField
        label="Imagen para calado (referencia)"
        value={d.imagen || null}
        onChange={(img) => setData({ imagen: img })}
        maxMB={1.5}
      />
    </div>
  );
}
