import React from "react";
import { CORTE_MATERIALES, getCorteMaterialByCode } from "../../config/corteMateriales";
import { toARS } from "../../utils/money";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function CorteFields({ it, setData }) {
  const d = it.data || {};
  const materialSeleccionado = getCorteMaterialByCode(d.materialCode);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="np-fields-grid-2">
        <select
          className="np-input"
          value={d.materialCode || ""}
          onChange={(e) => {
            const material = getCorteMaterialByCode(e.target.value);
            setData({
              materialCode: e.target.value,
              material: material?.descripcion || "",
              precioM2: material?.precioM2 || 0,
            });
          }}
        >
          <option value="">Seleccionar material</option>
          {CORTE_MATERIALES.map((material) => (
            <option key={material.code} value={material.code}>
              {material.code} - {material.descripcion}
            </option>
          ))}
        </select>

        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.cortes)}
          onChange={(e) => setData({ cortes: e.target.value })}
          placeholder="Cantidad de cortes"
        />
      </div>

      <input
        className="np-input np-readonly"
        readOnly
        value={materialSeleccionado ? `Precio m2: $${toARS(materialSeleccionado.precioM2)}` : "Precio m2: -"}
      />

      <div className="np-fields-grid-3">
        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.largoMm)}
          onChange={(e) => setData({ largoMm: e.target.value })}
          placeholder="Largo (cm)"
        />

        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.anchoMm)}
          onChange={(e) => setData({ anchoMm: e.target.value })}
          placeholder="Ancho (cm)"
        />
      </div>

      <input
        className="np-input"
        value={d.obs || ""}
        onChange={(e) => setData({ obs: e.target.value })}
        placeholder="Observaciones (canteado, veta, etc.)"
      />
    </div>
  );
}
