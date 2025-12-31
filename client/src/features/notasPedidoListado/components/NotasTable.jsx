function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(yyyyMMdd) {
  if (!yyyyMMdd) return "-";
  if (String(yyyyMMdd).includes("-")) return String(yyyyMMdd).split("-").reverse().join("/");
  return String(yyyyMMdd);
}

export default function NotasTable({ items, loading, onVerDetalle, onDeleted, onGuardarCaja }) {
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
            <th>Caja</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="npl-empty">Cargando…</td>
            </tr>
          ) : !items?.length ? (
            <tr>
              <td colSpan={8} className="npl-empty">Sin resultados</td>
            </tr>
          ) : (
            items.map((n) => (
              <tr key={n._id}>
                <td>{n.numero || "-"}</td>
                <td>{fmtDate(n.fecha)}</td>
                <td>{n.entrega || "-"}</td>
                <td>{n.cliente || "-"}</td>
                <td>{n.vendedor || "-"}</td>
                <td>${toARS(n.total)}</td>
                <td>{n?.caja?.guardada ? "Guardada" : "Pendiente"}</td>

                <td className="npl-actions">
                  <button className="npl-btnGhost" onClick={() => onVerDetalle?.(n._id)}>
                    Ver
                  </button>

                  <button
                    className="npl-btn"
                    disabled={n?.caja?.guardada === true}
                    onClick={async () => {
                      try {
                        await onGuardarCaja?.(n, { tipo: "pago", monto: n.total, metodo: "efectivo" });
                        onDeleted?.(n._id); // opcional: ocultar
                      } catch (e) {
                        alert(e?.message || "Error guardando caja");
                      }
                    }}
                  >
                    Guardar caja
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
