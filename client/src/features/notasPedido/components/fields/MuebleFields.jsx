import React from "react";
import CameraImageUploadField from "../../../presupuestos/components/CameraImageUploadField";

export default function MuebleFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div className="np-detail-fields">
      <div className="np-fields-grid-2 np-detail-top">
        <input
          className="np-input"
          value={d.nombre || ""}
          onChange={(e) => setData({ nombre: e.target.value })}
          placeholder="Nombre del mueble"
        />

        <input
          className="np-input"
          value={d.material || ""}
          onChange={(e) => setData({ material: e.target.value })}
          placeholder="Material"
        />
      </div>

      <input
        className="np-input np-detail-wide"
        value={d.medidas || ""}
        onChange={(e) => setData({ medidas: e.target.value })}
        placeholder="Medidas / Detalle"
      />

      <input
        className="np-input np-detail-wide"
        value={d.obs || ""}
        onChange={(e) => setData({ obs: e.target.value })}
        placeholder="Observaciones"
      />

      <CameraImageUploadField
        label="Imagen del mueble"
        value={d.imagen || null}
        onChange={(img) => setData({ imagen: img })}
        maxMB={1.5}
      />
    </div>
  );
}
