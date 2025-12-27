import React from "react";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function MarcoFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="np-fields-grid-2">
        <input className="np-input" value={d.material || ""} onChange={(e) => setData({ material: e.target.value })} placeholder="Material" />
        <input className="np-input" value={d.perfil || ""} onChange={(e) => setData({ perfil: e.target.value })} placeholder="Perfil / Moldura" />
      </div>

      <div className="np-fields-grid-2">
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

      <input className="np-input" value={d.obs || ""} onChange={(e) => setData({ obs: e.target.value })} placeholder="Observaciones" />
    </div>
  );
}
