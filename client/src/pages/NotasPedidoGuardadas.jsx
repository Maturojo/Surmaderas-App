import { useEffect, useMemo, useState } from "react";
import { listarNotasPedido } from "../services/notasPedido";

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(isoOrYmd) {
  if (!isoOrYmd) return "-";
  if (String(isoOrYmd).includes("-") && String(isoOrYmd).length <= 10) {
    return String(isoOrYmd).split("-").reverse().join("/");
  }
  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-AR");
}

export default function NotasPedidoGuardadas() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await listarNotasPedido({ q: "", page: 1, limit: 300 });
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
    } catch (e) {
      setErr(e?.message || "Error cargando notas guardadas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const guardadas = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((n) => n?.caja?.guardada === true)
      .filter((n) => {
        if (!qq) return true;
        return (
          String(n?.numero || "").toLowerCase().includes(qq) ||
          String(n?.cliente || "").toLowerCase().includes(qq) ||
          String(n?.vendedor || "").toLowerCase().includes(qq) ||
          String(n?.entrega || "").toLowerCase().includes(qq) ||
          String(n?.estado || "").toLowerCase().includes(qq)
        );
      })
      .sort((a, b) => {
        const da = new Date(a?.caja?.fecha || a?.updatedAt || 0).getTime();
        const db = new Date(b?.caja?.fecha || b?.updatedAt || 0).getTime();
        return db - da;
      });
  }, [items, q]);

  return (
    <div className="p-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Notas guardadas</h1>
          <p className="opacity-70">Pagadas o señadas (caja guardada)</p>
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="border rounded px-3 py-2 w-[320px]"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="border rounded px-3 py-2" onClick={load} disabled={loading}>
            {loading ? "Cargando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-3 border border-red-300 bg-red-50 text-red-700 rounded p-3">
          {err}
        </div>
      ) : null}

      <div className="mt-4 border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left p-3">Número</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Entrega</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Vendedor</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Caja</th>
              <th className="text-left p-3">Total</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td className="p-4 opacity-70" colSpan={8}>Cargando…</td></tr>
            ) : guardadas.length === 0 ? (
              <tr><td className="p-4 opacity-70" colSpan={8}>No hay notas guardadas.</td></tr>
            ) : (
              guardadas.map((n) => (
                <tr key={n?._id || n?.id || n?.numero} className="border-b">
                  <td className="p-3">{n?.numero ?? "-"}</td>
                  <td className="p-3">{fmtDate(n?.fecha)}</td>
                  <td className="p-3">{n?.entrega ?? "-"}</td>
                  <td className="p-3">{n?.cliente ?? "-"}</td>
                  <td className="p-3">{n?.vendedor ?? "-"}</td>
                  <td className="p-3 font-semibold">{n?.estado ?? "-"}</td>
                  <td className="p-3">
                    {n?.caja?.tipo ? `${n.caja.tipo} $${toARS(n?.caja?.monto)}` : "—"}
                  </td>
                  <td className="p-3">${toARS(n?.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
