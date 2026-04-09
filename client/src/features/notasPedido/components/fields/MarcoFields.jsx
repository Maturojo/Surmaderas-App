import React from "react";
import CameraImageUploadField from "../../../presupuestos/components/CameraImageUploadField";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function MarcoFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div className="np-detail-fields">
      <div className="np-detail-top">
        <input
          className="np-input"
          value={d.perfil || ""}
          onChange={(e) => setData({ perfil: e.target.value })}
          placeholder="Moldura"
        />
      </div>

      <div className="np-fields-grid-2 np-detail-mid">
        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.anchoMm)}
          onChange={(e) => setData({ anchoMm: e.target.value })}
          placeholder="Ancho (mm)"
        />
        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.altoMm)}
          onChange={(e) => setData({ altoMm: e.target.value })}
          placeholder="Alto (mm)"
        />
      </div>

      <input
        className="np-input np-detail-wide"
        value={d.obs || ""}
        onChange={(e) => setData({ obs: e.target.value })}
        placeholder="Observaciones"
      />

      <CameraImageUploadField
        label="Imagen del marco"
        value={d.imagen || null}
        onChange={(img) => setData({ imagen: img })}
        maxMB={1.5}
      />
    </div>
  );
}
