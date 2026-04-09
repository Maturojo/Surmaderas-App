import React from "react";

export default function PrestamoFields({ it, setData }) {
  const d = it.data || {};

  return (
    <div className="np-detail-fields">
      <input
        className="np-input np-detail-wide"
        value={d.descripcion || ""}
        onChange={(e) => setData({ descripcion: e.target.value })}
        placeholder="Descripción del préstamo"
      />

      <div className="np-fields-grid-2 np-detail-mid">
        <input
          className="np-input"
          type="date"
          value={d.fechaDevolucion || ""}
          onChange={(e) => setData({ fechaDevolucion: e.target.value })}
        />
        <input className="np-input" value={d.obs || ""} onChange={(e) => setData({ obs: e.target.value })} placeholder="Observaciones" />
      </div>
    </div>
  );
}
