import { useEffect, useState } from "react";

import {
  getNotaClienteDireccion,
  getNotaClienteNombre,
  getNotaClienteTelefono,
  getNotaTotal,
} from "../../../utils/notaPedido";
import Swal from "sweetalert2";

function toARS(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(value) {
  if (!value) return "-";
  if (String(value).includes("-") && String(value).length <= 10) {
    return String(value).split("-").reverse().join("/");
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-AR");
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
  const [tipo, setTipo] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  const [notaCaja, setNotaCaja] = useState("");

  useEffect(() => {
    if (!detalle) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTipo(detalle?.caja?.tipo || "");
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
  const valorProductos = total;
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
            <div className="npl-printSheet npl-printSheet--halfA4">
              <div className="npl-brandSheet">
                <div className="npl-brandHeader">
                  <div className="npl-brandLogoWrap">
                    <img className="npl-brandLogo" src="/logo-linea-gris.png" alt="Sur Maderas" />
                  </div>

                  <div className="npl-brandInfo">
                    <div className="npl-brandEyebrow">Muebles a medida y carpinteria</div>
                    <div className="npl-brandTitle">Nota de Pedido</div>
                    <div className="npl-brandMeta">
                      <span>Sur Maderas</span>
                      <span>Mar del Plata</span>
                    </div>
                  </div>

                  <div className="npl-brandNumber">
                    <div className="npl-k">Comprobante</div>
                    <div className="npl-v">{detalle.numero || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="npl-topCard">
                <div className="npl-docHead">
                  <div className="npl-docBlock">
                    <div className="npl-docBlockTitle">Datos del cliente</div>
                    <div className="npl-grid">
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
                    </div>
                  </div>

                  <div className="npl-docBlock">
                    <div className="npl-docBlockTitle">Datos de la nota</div>
                    <div className="npl-grid">
                      <div className="npl-kv">
                        <div className="npl-k">Fecha</div>
                        <div className="npl-v">{fmtDate(detalle.fecha)}</div>
                      </div>
                      <div className="npl-kv">
                        <div className="npl-k">Fecha de entrega</div>
                        <div className="npl-v">{detalle.entrega || "-"}</div>
                      </div>
                      <div className="npl-kv">
                        <div className="npl-k">Valor del pedido</div>
                        <div className="npl-v">${toARS(valorProductos)}</div>
                      </div>
                      {!soloVistaPrevia ? (
                        <>
                          <div className="npl-kv">
                            <div className="npl-k">Vendedor</div>
                            <div className="npl-v">{detalle.vendedor || "-"}</div>
                          </div>
                          <div className="npl-kv">
                            <div className="npl-k">Estado</div>
                            <div className={estadoClass}>{detalle.estado || "pendiente"}</div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="npl-scrollOnly npl-itemsSection">
                <div className="npl-docBlockTitle">Detalle del pedido</div>
                {(detalle.items || []).length === 0 ? (
                  <div className="npl-muted">Sin items.</div>
                ) : (
                  (detalle.items || []).map((item, idx) => {
                    const itemPrecio = Number(item.precioUnit ?? item.precio ?? 0);
                    const itemCantidad = Number(item.cantidad || 0);
                    const itemTotal = itemCantidad * itemPrecio;

                    return (
                      <div className="npl-itemRow npl-itemRow--nice" key={`${item.descripcion || item.nombre || "item"}-${idx}`}>
                        <div className="npl-itemMain">
                          <div className="npl-itemDesc">{item.descripcion || item.nombre || "Item"}</div>
                          <div className="npl-itemMeta">
                            <span>{item.tipo || "Producto"}</span>
                            {item.especial ? <span>Especial</span> : null}
                          </div>
                        </div>
                        <div className="npl-itemNumbers">
                          <div>
                            <div className="npl-k">Cant.</div>
                            <div className="npl-v">{itemCantidad}</div>
                          </div>
                          <div>
                            <div className="npl-k">Unit.</div>
                            <div className="npl-v">${toARS(itemPrecio)}</div>
                          </div>
                          <div>
                            <div className="npl-k">Importe</div>
                            <div className="npl-v">${toARS(itemTotal)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="npl-bottomCard">
                <div className="npl-docBlockTitle">{soloVistaPrevia ? "Resumen del pedido" : "Totales y caja"}</div>
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
                  <div className="npl-noteBox">
                    <div className="npl-k">Detalle para el cliente</div>
                    <div className="npl-v">
                      Pedido correspondiente a los productos detallados arriba, con entrega prevista para {detalle.entrega || "-"} y un valor total de ${toARS(valorProductos)}.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="npl-cajaResumen npl-totalsGrid">
                      <div className="npl-totalBox">
                        <div className="npl-k">Tipo en caja</div>
                        <div className="npl-v">{(
                          <>
                            <label>
                              <input
                                type="radio"
                                name="tipoCaja"
                                checked={tipo === "pago"}
                                onChange={() => {
                                  setTipo("pago");
                                  setMonto(String(total));
                                }}
                              />{" "}
                              Pago
                            </label>{" "}
                            <label>
                              <input
                                type="radio"
                                name="tipoCaja"
                                checked={tipo === "seña"}
                                onChange={() => {
                                  setTipo("seña");
                                  setMonto("");
                                }}
                              />{" "}
                              Seña
                            </label>
                          </>
                        )}</div>
                      </div>
                      <div className="npl-totalBox">
                        <div className="npl-k">Monto</div>
                        <div className="npl-v">
                          <input value={monto} disabled={tipo === "pago"} onChange={(e) => setMonto(e.target.value)} />
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
                        <div className="npl-k">Fecha caja</div>
                        <div className="npl-v">Se guarda al confirmar</div>
                      </div>
                    </div>

                    <div className="npl-noteBox">
                      <div className="npl-k">Observaciones</div>
                      <div>
                        <textarea value={notaCaja} onChange={(e) => setNotaCaja(e.target.value)} rows={3} style={{ width: "100%" }} />
                      </div>
                    </div>
                  </>
                )}

                <div className="npl-signRow">
                  <div className="npl-signBox">
                    <div className="npl-signLine" />
                    <div className="npl-signLabel">Firma del cliente</div>
                  </div>
                  <div className="npl-signBox">
                    <div className="npl-signLine" />
                    <div className="npl-signLabel">Aclaracion</div>
                  </div>
                </div>

                <div className="npl-printFooter">
                  <div>Gracias por elegir Sur Maderas.</div>
                  <div>Comprobante de pedido con datos del cliente, entrega e importe.</div>
                </div>

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
                          let payloadTipo = tipo;

                          if (!payloadTipo) {
                            const result = await Swal.fire({
                              title: "Guardar sin pago",
                              text: "La nota no esta marcada como pagada ni señada. ¿Querés guardarla sin pagar?",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonText: "Si, guardar pendiente",
                              cancelButtonText: "Volver",
                              reverseButtons: true,
                            });

                            if (!result.isConfirmed) return;
                            payloadTipo = "";
                          }

                          if (payloadTipo === "pago") {
                            await onGuardarCaja?.(detalle, {
                              tipo: "pago",
                              monto: Number(total || 0),
                              metodo,
                              nota: notaCaja,
                            });
                            return;
                          }

                          if (payloadTipo === "seña") {
                            const montoSenia = Number(monto || 0);

                            if (!(montoSenia > 0)) {
                              await Swal.fire({
                                title: "Monto obligatorio",
                                text: "Si la nota queda señada tenés que ingresar un monto mayor a 0.",
                                icon: "warning",
                              });
                              return;
                            }

                            if (montoSenia < total * 0.5) {
                              await Swal.fire({
                                title: "Seña baja",
                                text: "Lo mejor es pedir al menos el 50% de seña. ¿Querés guardar igual?",
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonText: "Si, guardar igual",
                                cancelButtonText: "Volver",
                                reverseButtons: true,
                              }).then(async (result) => {
                                if (!result.isConfirmed) return;

                                await onGuardarCaja?.(detalle, {
                                  tipo: "seña",
                                  monto: montoSenia,
                                  metodo,
                                  nota: notaCaja,
                                });
                              });
                              return;
                            }
                          }

                          await onGuardarCaja?.(detalle, {
                            tipo: payloadTipo,
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
