function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(yyyyMMdd) {
  if (!yyyyMMdd) return "-";
  return String(yyyyMMdd).split("-").reverse().join("/");
}

export default function NotasTable({ items, loading, onVerDetalle }) {
  return (
    <div className="npl-tableWrap">
      <table className="npl-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Entrega</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="npl-muted">
                Cargando...
              </td>
            </tr>
          ) : items?.length ? (
            items.map((n) => (
              <tr key={n._id}>
                <td>{n.numero}</td>
                <td>{fmtDate(n.fecha)}</td>
                <td>{fmtDate(n.entrega)}</td>
                <td>{n.cliente?.nombre || "-"}</td>
                <td>{n.vendedor || "-"}</td>
                <td>${toARS(n.totales?.total)}</td>
                <td className="npl-actions">
                  <button className="npl-link" type="button" onClick={() => onVerDetalle(n._id)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="npl-muted">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
