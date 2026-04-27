import React from "react";
import CameraImageUploadField from "../../../presupuestos/components/CameraImageUploadField";

function numOrEmpty(v) {
  return v === 0 ? 0 : v || "";
}

export default function MarcoFields({ it, setData }) {
  const d = it.data || {};
  const resumenLineas = Array.isArray(d.resumenLineas) ? d.resumenLineas : [];

  if (d.cotizado) {
    return (
      <div className="np-detail-fields" style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #eadfce",
            background: "#fbf6ef",
          }}
        >
          {resumenLineas.map((linea) => (
            <div
              key={`${linea.label}-${linea.value}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(150px, 0.9fr) minmax(0, 1.1fr)",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "#7a6855", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {linea.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2f261e" }}>{linea.value}</span>
            </div>
          ))}
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
