import { useMemo, useState } from "react";

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GeneradorPresupuestos() {
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState([{ desc: "", cant: 1, precio: 0 }]);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.cant || 0) * Number(it.precio || 0), 0),
    [items]
  );

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
    <div className="p-2 max-w-5xl">
      <h1 className="text-xl font-bold">Generador de presupuestos</h1>
      <p className="opacity-70">Armá un presupuesto rápido (luego lo conectamos a PDF/DB)</p>

      <div className="mt-4">
        <label className="block text-sm font-semibold mb-1">Cliente</label>
        <input
          className="border rounded px-3 py-2 w-full"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Nombre / empresa"
        />
      </div>

      <div className="mt-4 border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left p-3 w-[55%]">Descripción</th>
              <th className="text-left p-3 w-[15%]">Cant.</th>
              <th className="text-left p-3 w-[20%]">Precio</th>
              <th className="text-left p-3 w-[10%]"></th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={it.desc}
                    onChange={(e) => setItem(i, { desc: e.target.value })}
                    placeholder="Ej: Melamina 18mm blanca + corte"
                  />
                </td>
                <td className="p-3">
                  <input
                    className="border rounded px-3 py-2 w-full"
                    type="number"
                    min="0"
                    value={it.cant}
                    onChange={(e) => setItem(i, { cant: e.target.value })}
                  />
                </td>
                <td className="p-3">
                  <input
                    className="border rounded px-3 py-2 w-full"
                    type="number"
                    min="0"
                    value={it.precio}
                    onChange={(e) => setItem(i, { precio: e.target.value })}
                  />
                </td>
                <td className="p-3">
                  <button
                    className="border rounded px-3 py-2"
                    onClick={() => delRow(i)}
                    disabled={items.length === 1}
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button className="border rounded px-3 py-2" onClick={addRow}>
          Agregar ítem
        </button>

        <div className="text-base">
          Total: <span className="font-bold">${toARS(total)}</span>
        </div>
      </div>
    </div>
  );
}
