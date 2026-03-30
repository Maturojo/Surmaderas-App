import { useEffect, useState } from "react";

import {
  getNotaClienteDireccion,
  getNotaClienteNombre,
  getNotaClienteTelefono,
  getNotaTotal,
} from "../../../utils/notaPedido";

function toARS(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MEDIOS_PAGO = ["Efectivo", "Transferencia", "Debito", "Credito", "Cuenta Corriente"];

export default function NotaDetalleModal({
  open,
  onClose,
  detalle,
  loading,
  error,
  onRefresh,
  onGuardarCaja,
  soloVistaPrevia = false,
}) {
  const [tipo, setTipo] = useState("pago");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  const [notaCaja, setNotaCaja] = useState("");

  useEffect(() => {
    if (!detalle) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTipo(detalle?.caja?.tipo || "pago");
    setMonto(String(detalle?.caja?.monto ?? getNotaTotal(detalle)));
    setMetodo(detalle?.caja?.metodo || "Efectivo");
    setNotaCaja(detalle?.caja?.nota || "");
  }, [detalle]);

  if (!open) return null;

  const id = detalle?._id;
  const total = getNotaTotal(detalle);
  const clienteNombre = getNotaClienteNombre(detalle);
  const clienteTelefono = getNotaClienteTelefono(detalle);
  const clienteDireccion = getNotaClienteDireccion(detalle);
  const subtotal = Number(detalle?.totales?.subtotal ?? total);
  const descuento = Number(detalle?.totales?.descuento ?? 0);
  const adelanto = Number(detalle?.totales?.adelanto ?? 0);
  const resta = Number(detalle?.totales?.resta ?? Math.max(0, total - adelanto));
  const estadoClass =
    detalle?.estado === "pagada"
      ? "npl-badge"
      : detalle?.estado === "seña" || detalle?.estado === "señada"
        ? "npl-badge"
        : "npl-badge npl-badge--pendiente";

  return (
    <div className="npl-modalBack" onClick={onClose}>
      <div className="npl-modal npl-modal--nice" onClick={(e) => e.stopPropagation()}>
        <div className="npl-modalHeader npl-modalHeader--nice">
          <div>
            <div className="npl-modalTitle">Vista previa de nota</div>
            <div className="npl-modalSub">
              {detalle?.numero ? `Nota ${detalle.numero}` : ""} {id ? `| ID: ${id}` : ""}
            </div>
          </div>

          <button className="npl-btnGhost" onClick={onClose}>Cerrar</button>
        </div>

        {loading ? <div className="npl-muted">Cargando...</div> : null}
        {error ? <div className="npl-error">{error}</div> : null}

        {!loading && detalle ? (
          <div className="npl-body">
            <div className="npl-topCard">
              <div className="npl-grid">
                <div className="npl-kv">
                  <div className="npl-k">Numero</div>
                  <div className="npl-v">{detalle.numero || "-"}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Fecha</div>
                  <div className="npl-v">{detalle.fecha || "-"}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Entrega</div>
                  <div className="npl-v">{detalle.entrega || "-"}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Cliente</div>
                  <div className="npl-v">{clienteNombre}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Telefono</div>
                  <div className="npl-v">{clienteTelefono || "-"}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Direccion</div>
                  <div className="npl-v">{clienteDireccion || "-"}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Vendedor</div>
                  <div className="npl-v">{detalle.vendedor || "-"}</div>
                </div>
                <div className="npl-kv">
                  <div className="npl-k">Estado</div>
                  <div className={estadoClass}>{detalle.estado || "pendiente"}</div>
                </div>
              </div>
            </div>

            <div className="npl-scrollOnly">
              {(detalle.items || []).length === 0 ? (
                <div className="npl-muted">Sin items.</div>
              ) : (
                (detalle.items || []).map((item, idx) => {
                  const itemPrecio = Number(item.precioUnit ?? item.precio ?? 0);
                  const itemCantidad = Number(item.cantidad || 0);
                  const itemTotal = itemCantidad * itemPrecio;

                  return (
                    <div className="npl-itemRow npl-itemRow--nice" key={`${item.descripcion || item.nombre || "item"}-${idx}`}>
                      <div className="npl-itemDesc">{item.descripcion || item.nombre || "Item"}</div>
                      <div className="npl-itemMeta">
                        <span>Tipo: {item.tipo || "-"}</span>
                        <span>Cant: {itemCantidad}</span>
                        <span>Precio unit: ${toARS(itemPrecio)}</span>
                        <span>Total item: ${toARS(itemTotal)}</span>
                        {item.especial ? <span>Especial</span> : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="npl-bottomCard">
              <div className="npl-totalsGrid">
                <div className="npl-totalBox">
                  <div className="npl-k">Subtotal</div>
                  <div className="npl-v">${toARS(subtotal)}</div>
                </div>
                <div className="npl-totalBox">
                  <div className="npl-k">Descuento</div>
                  <div className="npl-v">${toARS(descuento)}</div>
                </div>
                <div className="npl-totalBox npl-totalBox--strong">
                  <div className="npl-k">Total</div>
                  <div className="npl-v">${toARS(total)}</div>
                </div>
                <div className="npl-totalBox">
                  <div className="npl-k">Adelanto</div>
                  <div className="npl-v">${toARS(adelanto)}</div>
                </div>
                <div className="npl-totalBox">
                  <div className="npl-k">Resta</div>
                  <div className="npl-v">${toARS(resta)}</div>
                </div>
              </div>

              {soloVistaPrevia ? (
                <div className="npl-cajaResumen npl-totalsGrid">
                  <div className="npl-totalBox">
                    <div className="npl-k">Tipo en caja</div>
                    <div className="npl-v">{detalle?.caja?.tipo || "-"}</div>
                  </div>
                  <div className="npl-totalBox">
                    <div className="npl-k">Monto</div>
                    <div className="npl-v">${toARS(detalle?.caja?.monto ?? total)}</div>
                  </div>
                  <div className="npl-totalBox">
                    <div className="npl-k">Medio de pago</div>
                    <div className="npl-v">{detalle?.caja?.metodo || "-"}</div>
                  </div>
                  <div className="npl-totalBox">
                    <div className="npl-k">Caja</div>
                    <div className="npl-v">{detalle?.caja?.guardada ? "Guardada" : "Pendiente"}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="npl-cajaResumen npl-totalsGrid">
                    <div className="npl-totalBox">
                      <div className="npl-k">Tipo en caja</div>
                      <div className="npl-v">
                        <label>
                          <input type="radio" name="tipoCaja" checked={tipo === "pago"} onChange={() => setTipo("pago")} /> Pago
                        </label>{" "}
                        <label>
                          <input type="radio" name="tipoCaja" checked={tipo === "seña"} onChange={() => setTipo("seña")} /> Seña
                        </label>
                      </div>
                    </div>
                    <div className="npl-totalBox">
                      <div className="npl-k">Monto</div>
                      <div className="npl-v">
                        <input value={monto} onChange={(e) => setMonto(e.target.value)} />
                      </div>
                    </div>
                    <div className="npl-totalBox">
                      <div className="npl-k">Medio de pago</div>
                      <div className="npl-v">
                        <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                          {MEDIOS_PAGO.map((medio) => (
                            <option key={medio} value={medio}>
                              {medio}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="npl-totalBox">
                      <div className="npl-k">Caja</div>
                      <div className="npl-v">{detalle?.caja?.guardada ? "Guardada" : "Pendiente"}</div>
                    </div>
                  </div>

                  <div className="npl-totalBox" style={{ marginTop: 10 }}>
                    <div className="npl-k">Nota caja</div>
                    <div>
                      <textarea value={notaCaja} onChange={(e) => setNotaCaja(e.target.value)} rows={3} style={{ width: "100%" }} />
                    </div>
                  </div>
                </>
              )}

              <div className="npl-modalActions npl-modalActions--nice">
                {soloVistaPrevia ? (
                  <button className="npl-btnGhost" onClick={() => window.print()}>Imprimir</button>
                ) : (
                  <button className="npl-btnGhost" onClick={onRefresh}>Refrescar</button>
                )}

                {!soloVistaPrevia ? (
                  <button
                    className="npl-btn"
                    disabled={detalle?.caja?.guardada === true}
                    onClick={async () => {
                      try {
                        await onGuardarCaja?.(detalle, {
                          tipo,
                          monto: Number(monto || 0),
                          metodo,
                          nota: notaCaja,
                        });
                      } catch (e) {
                        alert(e?.message || "Error guardando caja");
                      }
                    }}
                  >
                    Guardar caja
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
