// src/pages/notasPedido/components/DetalleItemRow.jsx
import React, { useMemo } from "react";
import { DETALLE_TIPOS, DEFAULT_TIPO } from "../config/detalleTypes";

import CorteFields from "./fields/CorteFields";
import MarcoFields from "./fields/MarcoFields";
import CaladoFields from "./fields/CaladoFields";
import MuebleFields from "./fields/MuebleFields";
import ProductoFields from "./fields/ProductoFields";
import PrestamoFields from "./fields/PrestamoFields";

function clampNum(n, def = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : def;
}

export default function DetalleItemRow({
  it,
  idx,
  productos = [],

  // callbacks del padre
  updateItem,
  removeItem,

  // props para tu autocomplete actual
  acItemsRef,
  buscarOpciones,
  seleccionarProducto,
}) {
  const tipo = it?.tipo || DEFAULT_TIPO;

  const onChangeTipo = (value) => {
    // Resetear data específica y cosas que no aplican
    const next = {
      ...it,
      tipo: value,
      data: {},
    };

    // Si cambia fuera de producto, limpiamos lo propio de producto
    if (value !== "producto") {
      next.busqueda = "";
      next.productoId = "";
      next.open = false;
      next.activeIndex = 0;
    }

    updateItem(idx, next);
  };

  const setData = (patch) => {
    updateItem(idx, {
      ...it,
      data: {
        ...(it.data || {}),
        ...patch,
      },
    });
  };

  const Fields = useMemo(() => {
    switch (tipo) {
      case "corte":
        return CorteFields;
      case "marco":
        return MarcoFields;
      case "calado":
        return CaladoFields;
      case "mueble":
        return MuebleFields;
      case "prestamo":
        return PrestamoFields;
      case "producto":
      default:
        return ProductoFields;
    }
  }, [tipo]);

  const showCantidad = tipo !== "prestamo"; // ejemplo: préstamo puede ser 1 fijo, pero lo dejamos editable si querés
  const showPrecio = true; // todos tienen precio (en préstamo puede ser 0)
  const showEspecial = tipo !== "prestamo"; // ejemplo

  return (
    <div
      className="np-item-row"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 10,
        padding: 10,
        border: "1px solid #e6e6e6",
        borderRadius: 10,
        background: "#fff",
      }}
      ref={(el) => {
        if (!acItemsRef) return;
        acItemsRef.current[idx] = el;
      }}
    >
      {/* Header row: Tipo + borrar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 120px",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#666" }}>Tipo</label>
          <select
            value={tipo}
            onChange={(e) => onChangeTipo(e.target.value)}
            style={{
              height: 40,
              borderRadius: 8,
              border: "1px solid #ddd",
              padding: "0 10px",
            }}
          >
            {DETALLE_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div />

        <button
          type="button"
          onClick={() => removeItem(idx)}
          style={{
            height: 40,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
          title="Eliminar ítem"
        >
          Eliminar
        </button>
      </div>

      {/* Campos dinámicos según tipo */}
      <Fields
        it={it}
        idx={idx}
        productos={productos}
        setData={setData}
        updateItem={updateItem}
        buscarOpciones={buscarOpciones}
        seleccionarProducto={seleccionarProducto}
      />

      {/* Bloque común: cantidad/precio/especial */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 200px 160px 1fr",
          gap: 10,
          alignItems: "end",
        }}
      >
        {showCantidad ? (
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "#666" }}>Cantidad</label>
            <input
              type="number"
              min={0}
              value={it.cantidad ?? 1}
              onChange={(e) =>
                updateItem(idx, { ...it, cantidad: clampNum(e.target.value, 1) })
              }
              style={{
                height: 40,
                borderRadius: 8,
                border: "1px solid #ddd",
                padding: "0 10px",
              }}
            />
          </div>
        ) : (
          <div />
        )}

        {showPrecio ? (
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "#666" }}>Precio</label>
            <input
              type="number"
              min={0}
              value={it.precio ?? ""}
              onChange={(e) => updateItem(idx, { ...it, precio: e.target.value })}
              placeholder="Precio"
              style={{
                height: 40,
                borderRadius: 8,
                border: "1px solid #ddd",
                padding: "0 10px",
              }}
            />
          </div>
        ) : (
          <div />
        )}

        {showEspecial ? (
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, color: "#666" }}>Especial</label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={Boolean(it.especial)}
                onChange={(e) => updateItem(idx, { ...it, especial: e.target.checked })}
              />
              <span>Aplicar</span>
            </label>
          </div>
        ) : (
          <div />
        )}

        <div />
      </div>
    </div>
  );
}
