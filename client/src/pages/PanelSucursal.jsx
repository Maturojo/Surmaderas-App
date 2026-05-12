import { useEffect, useState } from "react";
import { API_URL } from "../services/http";

const BRANCH_LABELS = {
  independencia: "Independencia",
  luro: "Luro",
};

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(value));
}

function CouponStatus({ item }) {
  if (item.couponUsed) return <span className="panel-badge panel-badge--used">Usado</span>;
  if (item.expired) return <span className="panel-badge panel-badge--expired">Vencido</span>;
  return <span className="panel-badge panel-badge--active">Activo</span>;
}

export default function PanelSucursal({ branch }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [redeeming, setRedeeming] = useState(null);
  const [redeemMsg, setRedeemMsg] = useState(null);

  // Canje por código
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  useEffect(() => {
    loadData();
  }, [branch]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/encuestas/sucursal/${branch}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "No se pudieron cargar los cupones");
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLookup(e) {
    e.preventDefault();
    const code = lookupCode.trim().toUpperCase();
    if (!code) return;
    const found = items.find((item) => item.couponCode === code);
    setLookupResult(found ? { ...found, notFound: false } : { notFound: true, code });
  }

  async function handleRedeem(couponCode) {
    setRedeeming(couponCode);
    setRedeemMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/encuestas/sucursal/${branch}/validar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "No se pudo canjear");
      setRedeemMsg({ ok: true, text: `✓ Cupón ${couponCode} canjeado correctamente` });
      setItems((prev) =>
        prev.map((item) =>
          item.couponCode === couponCode
            ? { ...item, couponUsed: true, couponUsedAt: new Date().toISOString() }
            : item
        )
      );
      setLookupResult((prev) =>
        prev && prev.couponCode === couponCode
          ? { ...prev, couponUsed: true, couponUsedAt: new Date().toISOString() }
          : prev
      );
      setSummary((prev) =>
        prev ? { ...prev, active: prev.active - 1, used: prev.used + 1 } : prev
      );
      setLookupCode("");
    } catch (err) {
      setRedeemMsg({ ok: false, text: err.message });
    } finally {
      setRedeeming(null);
    }
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.fullName?.toLowerCase().includes(q) ||
      item.couponCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="panel-sucursal">
      <header className="panel-header">
        <img src="/cupones-independencia/logo-sur-maderas.png" alt="Sur Maderas" className="panel-logo" />
        <div>
          <h1 className="panel-title">Sur Maderas</h1>
          <p className="panel-subtitle">Cupones · Sucursal {BRANCH_LABELS[branch] || branch}</p>
        </div>
      </header>

      {/* Box de canje por código */}
      <div className="panel-redeemBox">
        <div className="panel-redeemBox__title">Canjear cupón</div>
        <form className="panel-redeemBox__form" onSubmit={handleLookup}>
          <input
            className="panel-redeemBox__input"
            value={lookupCode}
            onChange={(e) => { setLookupCode(e.target.value.toUpperCase()); setLookupResult(null); }}
            placeholder="Código de cupón — ej: SM15-ABC123"
            autoComplete="off"
          />
          <button className="panel-redeemBox__btn" type="submit">
            Verificar
          </button>
        </form>

        {lookupResult && (
          lookupResult.notFound ? (
            <div className="panel-redeemBox__result panel-redeemBox__result--error">
              No se encontró ningún cupón con el código <strong>{lookupResult.code}</strong>.
            </div>
          ) : (
            <div className="panel-redeemBox__result">
              <div className="panel-redeemBox__info">
                <span><strong>{lookupResult.fullName}</strong></span>
                <span><code className="panel-code">{lookupResult.couponCode}</code></span>
                <CouponStatus item={lookupResult} />
                {lookupResult.couponExpiresAt && (
                  <span className="panel-redeemBox__meta">Vence: {formatDate(lookupResult.couponExpiresAt)}</span>
                )}
              </div>
              {!lookupResult.couponUsed && !lookupResult.expired && (
                <button
                  className="panel-redeemBox__confirm"
                  disabled={redeeming === lookupResult.couponCode}
                  onClick={() => handleRedeem(lookupResult.couponCode)}
                >
                  {redeeming === lookupResult.couponCode ? "Canjeando..." : "Confirmar canje"}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {redeemMsg && (
        <div className={`panel-alert ${redeemMsg.ok ? "panel-alert--ok" : "panel-alert--error"}`}>
          {redeemMsg.text}
          <button onClick={() => setRedeemMsg(null)}>✕</button>
        </div>
      )}

      {summary && (
        <div className="panel-stats">
          <div className="panel-stat">
            <span className="panel-stat__num panel-stat__num--active">{summary.active}</span>
            <span className="panel-stat__label">Activos</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat__num panel-stat__num--used">{summary.used}</span>
            <span className="panel-stat__label">Usados</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat__num panel-stat__num--expired">{summary.expired}</span>
            <span className="panel-stat__label">Vencidos</span>
          </div>
          <div className="panel-stat">
            <span className="panel-stat__num">{summary.total}</span>
            <span className="panel-stat__label">Total</span>
          </div>
        </div>
      )}

      <div className="panel-toolbar">
        <input
          className="panel-search"
          type="search"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="panel-refresh" onClick={loadData} title="Actualizar">
          ↻ Actualizar
        </button>
      </div>

      {isLoading ? (
        <p className="panel-empty">Cargando cupones...</p>
      ) : error ? (
        <p className="panel-empty panel-empty--error">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="panel-empty">No hay cupones{search ? " para esa búsqueda" : ""}.</p>
      ) : (
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Código</th>
                <th>Estado</th>
                <th>Vence</th>
                <th>Fecha registro</th>
                <th>Canjeado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.couponCode} className={item.couponUsed ? "panel-row--used" : item.expired ? "panel-row--expired" : ""}>
                  <td>{item.fullName}</td>
                  <td><code className="panel-code">{item.couponCode}</code></td>
                  <td><CouponStatus item={item} /></td>
                  <td>{formatDate(item.couponExpiresAt)}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    {item.couponUsed
                      ? <span className="panel-used-date">{formatDate(item.couponUsedAt)}</span>
                      : <span className="panel-used-date">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
