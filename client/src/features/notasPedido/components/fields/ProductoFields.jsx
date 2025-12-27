// src/pages/notasPedido/components/fields/ProductoFields.jsx
import React, { useMemo } from "react";

export default function ProductoFields({
  it,
  idx,
  productos,
  updateItem,
  buscarOpciones,
  seleccionarProducto,
}) {
  const q = it.busqueda || "";

  // Opciones: si ya las guardás en el item (it.opciones), usa eso.
  // Si no, intenta buscar con buscarOpciones (si existe).
  const opciones = useMemo(() => {
    if (Array.isArray(it.opciones)) return it.opciones;
    if (typeof buscarOpciones === "function") return buscarOpciones(q) || [];
    // Fallback: filtra local por nombre/código si te pasaron productos
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return (productos || [])
      .filter((p) => {
        const nombre = (p?.nombre || "").toLowerCase();
        const codigo = (p?.codigo || "").toLowerCase();
        return nombre.includes(term) || codigo.includes(term);
      })
      .slice(0, 30);
  }, [it.opciones, buscarOpciones, q, productos]);

  const open = Boolean(it.open) && opciones.length > 0;

  const onChangeBusqueda = (value) => {
    updateItem(idx, {
      ...it,
      busqueda: value,
      open: true,
      activeIndex: 0,
      // si tu lógica guarda opciones en el item, podés hacerlo en el padre
    });
  };

  const onKeyDown = (e) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateItem(idx, {
        ...it,
        activeIndex: Math.min((it.activeIndex || 0) + 1, opciones.length - 1),
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateItem(idx, {
        ...it,
        activeIndex: Math.max((it.activeIndex || 0) - 1, 0),
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = opciones[it.activeIndex || 0];
      if (p) seleccionarProducto(idx, p);
    } else if (e.key === "Escape") {
      updateItem(idx, { ...it, open: false });
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 6, position: "relative" }}>
        <label style={{ fontSize: 12, color: "#666" }}>Producto</label>

        <input
          value={q}
          onChange={(e) => onChangeBusqueda(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => updateItem(idx, { ...it, open: true })}
          placeholder="Buscar producto por código o nombre..."
          style={{
            height: 40,
            borderRadius: 8,
            border: "1px solid #ddd",
            padding: "0 10px",
          }}
        />

        {open && (
          <div
            style={{
              position: "absolute",
              top: 66,
              left: 0,
              right: 0,
              zIndex: 50,
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fff",
              overflow: "hidden",
              maxHeight: 280,
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            {opciones.map((p, i) => {
              const active = i === (it.activeIndex || 0);
              return (
                <div
                  key={p._id || `${p.codigo}-${i}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // para no perder foco antes del click
                    seleccionarProducto(idx, p);
                  }}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: active ? "#f4f6f8" : "#fff",
                    display: "grid",
                    gap: 2,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {p.codigo ? `${p.codigo} - ` : ""}
                    {p.nombre || "Producto"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {p.medidas || ""} {p.precio ? `· $${p.precio}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campo opcional para forzar descripción manual si querés */}
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#666" }}>Descripción (opcional)</label>
        <input
          value={it.descripcion || ""}
          onChange={(e) => updateItem(idx, { ...it, descripcion: e.target.value })}
          placeholder="Dejar vacío para usar el nombre del producto"
          style={{
            height: 40,
            borderRadius: 8,
            border: "1px solid #ddd",
            padding: "0 10px",
          }}
        />
      </div>
    </div>
  );
}
