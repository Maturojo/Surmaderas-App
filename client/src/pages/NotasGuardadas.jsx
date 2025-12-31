import { useEffect, useMemo, useState } from "react";
import { listarNotasPedido } from "../services/notasPedido"; // si ya lo tenés
import "../css/NotasGuardadas.css";

function fmtDate(yyyyMMdd) {
  if (!yyyyMMdd) return "-";
  return String(yyyyMMdd).split("-").reverse().join("/");
}

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NotasGuardadas() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // La idea: traer solo “pagadas o señadas”.
      // Si tu backend ya soporta filtro, pasalo por query. Si no, filtramos en frontend.
      const data = await listarNotasPedido({ q, page: 1, limit: 200 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardadas = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((n) => {
        const estado = String(n?.estado || n?.status || "").toLowerCase();
        // Ajustá estos valores a los que uses en tu DB:
        return estado === "pagada" || estado === "señada" || estado === "senada";
      })
      .filter((n) => {
        if (!qq) return true;
        const hay =
          String(n?.numero || "").toLowerCase().includes(qq) ||
          String(n?.cliente || "").toLowerCase().includes(qq) ||
          String(n?.entrega || "").toLowerCase().includes(qq) ||
          String(n?.vendedor || "").toLowerCase().includes(qq);
        return hay;
      });
  }, [items, q]);

  return (
    <div className="ng-page">
      <div className="ng-head">
        <div>
          <h2>Notas guardadas</h2>
          <p className="ng-sub">Pagadas o señadas</p>
        </div>

        <div className="ng-actions">
          <input
            className="ng-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, cliente, vendedor…"
          />
          <button className="ng-btn" onClick={load} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {err ? <div className="ng-error">{err}</div> : null}

      <div className="ng-tableWrap">
        <table className="ng-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Entrega</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="ng-empty">Cargando…</td></tr>
            ) : guardadas.length === 0 ? (
              <tr><td colSpan={7} className="ng-empty">No hay notas guardadas.</td></tr>
            ) : (
              guardadas.map((n) => (
                <tr key={n?._id || n?.id || n?.numero}>
                  <td>{n?.numero ?? "-"}</td>
                  <td>{fmtDate(n?.fecha)}</td>
                  <td>{n?.entrega ?? "-"}</td>
                  <td>{n?.cliente ?? "-"}</td>
                  <td>{n?.vendedor ?? "-"}</td>
                  <td className="ng-pill">{n?.estado ?? n?.status ?? "-"}</td>
                  <td>${toARS(n?.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
