import React from "react";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function CaladoFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="np-fields-grid-2">
        <input className="np-input" value={d.material || ""} onChange={(e) => setData({ material: e.target.value })} placeholder="Material" />
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

      <input className="np-input" value={d.diseno || ""} onChange={(e) => setData({ diseno: e.target.value })} placeholder="Diseño / Archivo" />
      <input className="np-input" value={d.obs || ""} onChange={(e) => setData({ obs: e.target.value })} placeholder="Observaciones" />
    </div>
  );
}
