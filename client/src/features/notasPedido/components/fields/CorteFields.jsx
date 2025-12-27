import React from "react";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function CorteFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="np-fields-grid-2">
        <input
          className="np-input"
          value={d.material || ""}
          onChange={(e) => setData({ material: e.target.value })}
          placeholder="Material (Ej: Melamina blanca)"
        />

        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.cortes)}
          onChange={(e) => setData({ cortes: e.target.value })}
          placeholder="Cantidad de cortes"
        />
      </div>

      <div className="np-fields-grid-3">
        <input
          className="np-input"
          type="number"
          min={0}
          value={numOrEmpty(d.largoMm)}
          onChange={(e) => setData({ largoMm: e.target.value })}
          placeholder="Largo (mm)"
        />

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
          value={numOrEmpty(d.espesorMm)}
          onChange={(e) => setData({ espesorMm: e.target.value })}
          placeholder="Espesor (mm)"
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
