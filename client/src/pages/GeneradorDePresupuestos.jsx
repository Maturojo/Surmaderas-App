import { useMemo, useState } from "react";
import "../css/GeneradorPresupuestos.css";

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GeneradorPresupuestos() {
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState([
    { desc: "", cant: 1, precio: 0 },
  ]);

  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.cant || 0) * Number(it.precio || 0), 0);
  }, [items]);

  function setItem(i, patch) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addRow() {
    setItems((prev) => [...prev, { desc: "", cant: 1, precio: 0 }]);
  }

  function delRow(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="gp-page">
      <div className="gp-head">
        <div>
          <h2>Generador de presupuestos</h2>
          <p className="gp-sub">Armar presupuesto rápido y calcular total</p>
        </div>
      </div>

      <div className="gp-form">
        <label className="gp-label">Cliente</label>
        <input
          className="gp-input"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Nombre / empresa"
        />

        <div className="gp-tableWrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th style={{ width: "55%" }}>Descripción</th>
                <th style={{ width: "15%" }}>Cant.</th>
                <th style={{ width: "20%" }}>Precio</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>

            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="gp-input"
                      value={it.desc}
                      onChange={(e) => setItem(i, { desc: e.target.value })}
                      placeholder="Ej: Melamina 18mm blanca + corte"
                    />
                  </td>
                  <td>
                    <input
                      className="gp-input"
                      type="number"
                      min="0"
                      value={it.cant}
                      onChange={(e) => setItem(i, { cant: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="gp-input"
                      type="number"
                      min="0"
                      value={it.precio}
                      onChange={(e) => setItem(i, { precio: e.target.value })}
                    />
                  </td>
                  <td>
                    <button className="gp-btnDanger" onClick={() => delRow(i)} disabled={items.length === 1}>
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gp-footer">
          <button className="gp-btn" onClick={addRow}>Agregar ítem</button>
          <div className="gp-total">
            Total: <strong>${toARS(total)}</strong>
          </div>
        </div>

        {/* Más adelante acá conectamos: guardar en DB / exportar PDF / enviar WhatsApp */}
      </div>
    </div>
  );
}
