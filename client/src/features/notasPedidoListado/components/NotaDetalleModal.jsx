import { useEffect, useMemo, useState } from "react";

import Swal from "sweetalert2";

import {
  getNotaTotal,
} from "../../../utils/notaPedido";
import {
  buildNotaPedidoPrintHtml,
  buildNotaPedidoPrintData,
  getNotaPedidoPageCount,
  openNotaPedidoPrintWindow,
  toARS,
} from "../../../utils/notaPedidoPrint";

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
  const subtotal = Number(detalle?.totales?.subtotal ?? total);
  const descuentoMonto = Number(detalle?.totales?.descuento ?? 0);
  const adelanto = Number(detalle?.totales?.adelanto ?? 0);
  const resta = Number(detalle?.totales?.resta ?? Math.max(0, total - adelanto));
  const previewData = useMemo(() => (detalle ? buildNotaPedidoPrintData(detalle) : null), [detalle]);
  const previewDoc = useMemo(() => {
    if (!previewData) return "";
    return buildNotaPedidoPrintHtml(previewData);
  }, [previewData]);
  const previewFrameHeight = useMemo(() => {
    if (!previewData) return 720;
    return Math.min(1600, Math.max(720, getNotaPedidoPageCount(previewData) * 590));
  }, [previewData]);

  function handlePrint() {
    if (!previewData) return;
    openNotaPedidoPrintWindow(previewData);
  }

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
              <iframe
                title={detalle?.numero ? `Vista previa ${detalle.numero}` : "Vista previa de nota"}
                srcDoc={previewDoc}
                className="npl-sharedPreviewFrame"
                style={{
                  width: "100%",
                  height: `${previewFrameHeight}px`,
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  borderRadius: "18px",
                  background: "#fff",
                  boxShadow: "0 18px 40px rgba(42, 42, 42, 0.08)",
                }}
              />
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
                  <button className="npl-btnGhost" onClick={handlePrint}>Imprimir</button>

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
                <button className="npl-btnGhost" onClick={handlePrint}>Imprimir</button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
