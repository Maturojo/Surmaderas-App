import { useEffect, useMemo, useState } from "react";

import Swal from "sweetalert2";

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

function fmtDate(value) {
  if (!value) return "-";
  if (String(value).includes("-") && String(value).length <= 10) {
    return String(value).split("-").reverse().join("/");
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-AR");
}

function formatPhonePreview(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "-";
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return String(value);
}

function getPreviewNumber(value) {
  const numero = String(value || "").trim();
  return numero || "002-000123";
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
    setTipo(detalle?.caja?.tipo || "");
    setMonto(String(detalle?.caja?.monto ?? getNotaTotal(detalle)));
    setMetodo(detalle?.caja?.metodo || "Efectivo");
    setNotaCaja(detalle?.caja?.nota || "");
  }, [detalle]);

  const total = getNotaTotal(detalle);
  const clienteNombre = getNotaClienteNombre(detalle);
  const clienteTelefono = getNotaClienteTelefono(detalle);
  const clienteDireccion = getNotaClienteDireccion(detalle);
  const subtotal = Number(detalle?.totales?.subtotal ?? total);
  const descuentoMonto = Number(detalle?.totales?.descuento ?? 0);
  const adelanto = Number(detalle?.totales?.adelanto ?? 0);
  const resta = Number(detalle?.totales?.resta ?? Math.max(0, total - adelanto));
  const descuentoPct = subtotal > 0 ? (descuentoMonto / subtotal) * 100 : 0;

  const previewItems = useMemo(
    () =>
      Array.isArray(detalle?.items)
        ? detalle.items.map((item, idx) => {
            const precio = Number(item?.precioUnit ?? item?.precio ?? 0);
            const cantidad = Number(item?.cantidad || 0);
            return {
              id: `${item?.descripcion || item?.nombre || "item"}-${idx}`,
              orden: idx + 1,
              descripcion: item?.descripcion || item?.nombre || "Producto y/o servicio",
              precio,
              cantidad,
              total: cantidad * precio,
            };
          })
        : [],
    [detalle?.items]
  );

  if (!open) return null;

  return (
    <div className="npl-modalBack" onClick={onClose}>
      <div className="npl-modal npl-modal--nice" onClick={(e) => e.stopPropagation()}>
        <div className="npl-modalHeader npl-modalHeader--nice">
          <div>
            <div className="npl-modalTitle">Vista previa de nota</div>
            <div className="npl-modalSub">{detalle?.numero ? `Nota ${detalle.numero}` : "Nota de pedido"}</div>
          </div>

          <button className="npl-btnGhost" onClick={onClose}>Cerrar</button>
        </div>

        {loading ? <div className="npl-muted">Cargando...</div> : null}
        {error ? <div className="npl-error">{error}</div> : null}

        {!loading && detalle ? (
          <div className="npl-body">
            <div className="npl-printSheet npl-printSheet--landscape">
              <div className="npl-previewDoc">
                <div className="npl-previewWatermark" aria-hidden="true">
                  <span>{new Date(detalle?.fecha || Date.now()).getFullYear() || ""}</span>
                  <span>Sur</span>
                </div>

                <div className="npl-previewHeader">
                  <div className="npl-previewBlock npl-previewBlock--left">
                    <div className="npl-previewSerial">N° {getPreviewNumber(detalle?.numero)}</div>
                    <h2 className="npl-previewTitle">Nota de Pedido</h2>
                    <div className="npl-previewDateLine">
                      <span className="npl-previewAlert">!</span>
                      <span className="npl-previewDate">{fmtDate(detalle?.entrega)}</span>
                    </div>
                    <div className="npl-previewPedidoDia">DIA DEL PEDIDO: {fmtDate(detalle?.fecha)}</div>
                  </div>

                  <div className="npl-previewBlock npl-previewBlock--center">
                    <div className="npl-previewLogoFrame">
                      <img className="npl-previewLogo" src="/logo-linea-gris.png" alt="Sur Maderas" />
                    </div>
                  </div>

                  <div className="npl-previewBlock npl-previewBlock--right">
                    <div className="npl-previewClientLabel">CLIENTE</div>
                    <div className="npl-previewClientName">{clienteNombre || "Consumidor final"}</div>
                    <div className="npl-previewClientMeta">
                      <strong>Teléfono:</strong> {formatPhonePreview(clienteTelefono)}
                    </div>
                    <div className="npl-previewClientMeta">
                      <strong>Dirección:</strong>
                    </div>
                    <div className="npl-previewClientAddress">{clienteDireccion || "Todos los datos que sean necesarios"}</div>
                  </div>
                </div>

                <div className="npl-previewTableWrap">
                  <table className="npl-previewTable">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>DESCRIPCIÓN</th>
                        <th>PRECIO</th>
                        <th>CANTIDAD</th>
                        <th>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="npl-previewEmpty">
                            Sin items cargados.
                          </td>
                        </tr>
                      ) : (
                        previewItems.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 1 ? "is-alt" : ""}>
                            <td>{item.orden}</td>
                            <td>{item.descripcion}</td>
                            <td>${toARS(item.precio)}</td>
                            <td>{item.cantidad}</td>
                            <td>${toARS(item.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="npl-previewSummary">
                  <div className="npl-previewSummaryRow">
                    <span>Subtotal</span>
                    <strong>${toARS(subtotal)}</strong>
                  </div>
                  <div className="npl-previewSummaryDivider" />
                  <div className="npl-previewSummaryRow npl-previewSummaryRow--discount">
                    <span>Descuento (si hay)</span>
                    <strong>{descuentoMonto > 0 ? `${toARS(descuentoPct)}%` : "-"}</strong>
                    <strong>${toARS(descuentoMonto)}</strong>
                  </div>
                  <div className="npl-previewSummaryTotal">
                    <span>TOTAL</span>
                    <strong>${toARS(total)}</strong>
                  </div>
                </div>

                <div className="npl-previewFooter">
                  surmaderas.com.ar - surmaderasmdp@gmail.com - 223 438 3262
                </div>
              </div>
            </div>

            {!soloVistaPrevia ? (
              <div className="npl-cajaPanel">
                <div className="npl-docBlockTitle">Totales y caja</div>

                <div className="npl-totalsGrid">
                  <div className="npl-totalBox">
                    <div className="npl-k">Subtotal</div>
                    <div className="npl-v">${toARS(subtotal)}</div>
                  </div>
                  <div className="npl-totalBox">
                    <div className="npl-k">Descuento</div>
                    <div className="npl-v">${toARS(descuentoMonto)}</div>
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

                <div className="npl-cajaResumen npl-totalsGrid">
                  <div className="npl-totalBox">
                    <div className="npl-k">Tipo en caja</div>
                    <div className="npl-v">
                      <div className="npl-radioRow">
                        <label className="npl-radioOption">
                          <input
                            type="radio"
                            name="tipoCaja"
                            checked={tipo === "pago"}
                            onChange={() => {
                              setTipo("pago");
                              setMonto(String(total));
                            }}
                          />
                          <span>Pago</span>
                        </label>
                        <label className="npl-radioOption">
                          <input
                            type="radio"
                            name="tipoCaja"
                            checked={tipo === "seña"}
                            onChange={() => {
                              setTipo("seña");
                              setMonto("");
                            }}
                          />
                          <span>Seña</span>
                        </label>
                      </div>
                    </div>
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
                    <textarea
                      className="npl-noteTextarea"
                      value={notaCaja}
                      onChange={(e) => setNotaCaja(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>

                <div className="npl-modalActions npl-modalActions--nice">
                  <button className="npl-btnGhost" onClick={onRefresh}>Refrescar</button>
                  <button className="npl-btnGhost" onClick={() => window.print()}>Imprimir</button>

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
                </div>
              </div>
            ) : (
              <div className="npl-modalActions npl-modalActions--preview">
                <button className="npl-btnGhost" onClick={() => window.print()}>Imprimir</button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
