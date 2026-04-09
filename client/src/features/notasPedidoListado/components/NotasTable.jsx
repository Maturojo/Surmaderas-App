import { getNotaClienteNombre, getNotaTotal } from "../../../utils/notaPedido";

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(yyyyMMdd) {
  if (!yyyyMMdd) return "-";
  if (String(yyyyMMdd).includes("-")) return String(yyyyMMdd).split("-").reverse().join("/");
  return String(yyyyMMdd);
}

function getEntregaLabel(value) {
  if (!value) return "Sin definir";
  return String(value);
}

export default function NotasTable({ items, loading, onVerDetalle, onEliminar }) {
  return (
    <div className="npl-tableWrap">
      <table className="npl-table">
        <thead>
          <tr>
            <th>Numero</th>
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
              <td colSpan={8} className="npl-empty">Cargando...</td>
            </tr>
          ) : !items?.length ? (
            <tr>
              <td colSpan={8} className="npl-empty">Sin resultados</td>
            </tr>
          ) : (
            items.map((n) => (
              <tr key={n._id} className="npl-row">
                <td>
                  <div className="npl-cellTitle">#{n.numero || "-"}</div>
                  <div className="npl-cellSub">Nota activa</div>
                </td>
                <td>
                  <div className="npl-cellTitle">{fmtDate(n.fecha)}</div>
                  <div className="npl-cellSub">Fecha de carga</div>
                </td>
                <td>
                  <span className="npl-chip">{getEntregaLabel(n.entrega)}</span>
                </td>
                <td>
                  <div className="npl-cellTitle">{getNotaClienteNombre(n)}</div>
                  <div className="npl-cellSub">{n?.cliente?.telefono || n?.telefono || "Sin telefono"}</div>
                </td>
                <td>
                  <div className="npl-cellTitle">{n.vendedor || "-"}</div>
                  <div className="npl-cellSub">Responsable</div>
                </td>
                <td>
                  <div className="npl-cellMoney">${toARS(getNotaTotal(n))}</div>
                </td>
                <td>
                  <span className={`npl-statusBadge${n?.caja?.guardada ? " ok" : ""}`}>
                    {n?.caja?.guardada ? "Guardada" : "Pendiente"}
                  </span>
                </td>

                <td className="npl-actions">
                  <button className="npl-btnGhost" onClick={() => onVerDetalle?.(n._id)}>
                    Ver
                  </button>
                  <button className="npl-btnGhost" onClick={() => onEliminar?.(n)}>
                    Borrar
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
