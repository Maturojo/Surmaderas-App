import { getNotaClienteNombre, getNotaResumenPedido, getNotaTotal } from "../../../utils/notaPedido";

import { useState } from "react";

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

export default function NotasTable({
  items,
  loading,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onVerDetalle,
  onEditar,
  onEliminar,
  onEnviarCliente,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const selectableIds = (items || []).map((item) => item?._id).filter(Boolean);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectableIds.some((id) => selectedIds.has(id));

  function toggleMenu(id) {
    setOpenMenuId((current) => (current === id ? null : id));
  }

  return (
    <div className="npl-tableWrap">
      <table className="npl-table">
        <thead>
          <tr>
            <th className="npl-selectCol">
              <input
                type="checkbox"
                aria-label="Seleccionar todas las notas visibles"
                checked={allSelected}
                ref={(node) => {
                  if (node) node.indeterminate = someSelected && !allSelected;
                }}
                onChange={(event) => onToggleSelectAll?.(event.target.checked, selectableIds)}
                disabled={loading || selectableIds.length === 0}
              />
            </th>
            <th>Detalle</th>
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
              <td colSpan={9} className="npl-empty">Cargando...</td>
            </tr>
          ) : !items?.length ? (
            <tr>
              <td colSpan={9} className="npl-empty">Sin resultados</td>
            </tr>
          ) : (
            items.map((n) => (
              <tr key={n._id} className="npl-row">
                <td className="npl-selectCol">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar nota ${n.numero || ""}`.trim()}
                    checked={selectedIds.has(n._id)}
                    onChange={(event) => onToggleSelect?.(n._id, event.target.checked)}
                  />
                </td>
                <td>
                  <div className="npl-cellTitle npl-noteSummaryTitle" title={getNotaResumenPedido(n, 160)}>
                    {getNotaResumenPedido(n)}
                  </div>
                  <div className="npl-cellSub">#{n.numero || "-"}</div>
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
                  <button className="npl-btnGhost npl-btnGhost--whatsapp" onClick={() => onEnviarCliente?.(n)}>
                    Enviar al cliente
                  </button>
                  <div className="npl-actionsMenu">
                    <button className="npl-btnGhost npl-btnGhost--icon" type="button" onClick={() => toggleMenu(n._id)}>
                      ...
                    </button>
                    {openMenuId === n._id ? (
                      <div className="npl-actionsDropdown">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            onEditar?.(n);
                          }}
                        >
                          Editar pedido
                        </button>
                      </div>
                    ) : null}
                  </div>
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
