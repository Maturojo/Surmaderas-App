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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPrintHtml({
  numero,
  fecha,
  entrega,
  clienteNombre,
  clienteTelefono,
  clienteDireccion,
  subtotal,
  descuentoMonto,
  descuentoPct,
  total,
  previewItems,
}) {
  const rows =
    previewItems.length > 0
      ? previewItems
          .map(
            (item, idx) => `
              <tr class="${idx % 2 === 1 ? "is-alt" : ""}">
                <td>${item.orden}</td>
                <td>${escapeHtml(item.descripcion)}</td>
                <td>$${escapeHtml(toARS(item.precio))}</td>
                <td>${item.cantidad}</td>
                <td>$${escapeHtml(toARS(item.total))}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="5" class="empty">Sin items cargados.</td>
          </tr>
        `;

  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Nota de pedido ${escapeHtml(numero)}</title>
      <style>
        @page { size: A5 portrait; margin: 6mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #111; }
        body { width: 136mm; margin: 0 auto; }
        .doc {
          position: relative;
          overflow: hidden;
          width: 136mm;
          min-height: 198mm;
          padding: 4mm 4mm 3mm;
          background: #fff;
        }
        .watermark {
          position: absolute;
          inset: 22mm auto auto 10mm;
          color: rgba(90, 90, 90, 0.08);
          line-height: 0.8;
          font-weight: 800;
          user-select: none;
          pointer-events: none;
        }
        .watermark .year { font-size: 125mm; letter-spacing: -0.07em; }
        .watermark .brand { margin-left: 28mm; margin-top: -10mm; font-size: 40mm; font-family: "Brush Script MT", "Segoe Script", cursive; }
        .header {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 24mm minmax(0, 1fr);
          gap: 4mm;
          align-items: start;
        }
        .serial { font-size: 9pt; color: #3f3f3f; margin-bottom: 1mm; }
        .title { margin: 0; font-size: 19pt; line-height: 0.95; font-weight: 900; letter-spacing: -0.04em; }
        .date-line { display: flex; align-items: center; gap: 2.5mm; margin-top: 2mm; }
        .alert {
          width: 10.5mm; height: 10.5mm; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: #111; color: #fff; font-size: 20pt; font-weight: 900;
        }
        .delivery { font-size: 23pt; line-height: 1; font-weight: 900; letter-spacing: -0.05em; }
        .pedido-dia { margin-top: 1.5mm; font-size: 9.5pt; line-height: 1.2; }
        .logo-wrap { display: flex; justify-content: center; }
        .logo-frame {
          width: 24mm; height: 24mm; border: 1mm solid #111; border-radius: 3mm;
          display: flex; align-items: center; justify-content: center; background: #fff;
        }
        .logo-frame img { width: 15mm; object-fit: contain; filter: grayscale(1); }
        .client-label { font-size: 10pt; letter-spacing: 0.08em; color: #2f2f2f; }
        .client-name { margin-top: 1mm; font-size: 17pt; line-height: 1; font-weight: 900; }
        .client-meta, .client-address { margin-top: 2mm; font-size: 9pt; line-height: 1.2; }
        .client-address { font-weight: 700; }
        table { position: relative; z-index: 1; width: 100%; border-collapse: collapse; margin-top: 5mm; }
        thead th {
          background: #4b4948; color: #fff; padding: 2.5mm 2mm; font-size: 7.4pt;
          font-weight: 800; letter-spacing: 0.06em; text-align: center;
        }
        thead th:nth-child(2), tbody td:nth-child(2) { text-align: left; }
        tbody td {
          padding: 2.6mm 2mm; font-size: 8.4pt; font-weight: 700; color: #464646;
          text-align: center; border-bottom: 2mm solid transparent;
        }
        tbody tr.is-alt td { background: #f1f1f1; }
        .empty { text-align: center !important; background: #f7f7f7; padding: 4mm !important; }
        .summary { position: relative; z-index: 1; width: 72mm; margin-left: auto; margin-top: 2mm; }
        .summary-row, .summary-total { display: grid; align-items: center; }
        .summary-row { grid-template-columns: 1fr auto; gap: 2mm; padding: 1mm 0; font-size: 8.4pt; color: #414141; }
        .summary-row strong { font-size: 8.4pt; }
        .summary-row.discount { grid-template-columns: 1fr auto auto; font-size: 6.4pt; }
        .divider { border-top: 0.5mm solid #626262; margin: 1mm 0 1.5mm; }
        .summary-total {
          grid-template-columns: 1fr auto; gap: 2mm; margin-top: 1.5mm;
          padding: 2.5mm 3mm; background: #4b4948; color: #fff; font-size: 11pt; font-weight: 900;
        }
        .footer {
          position: relative; z-index: 1; margin-top: 3mm; text-align: center;
          font-size: 7pt; letter-spacing: 0.05em; color: #595959;
        }
      </style>
    </head>
    <body>
      <div class="doc">
        <div class="watermark" aria-hidden="true">
          <div class="year">${escapeHtml(new Date(fecha || Date.now()).getFullYear())}</div>
          <div class="brand">Sur</div>
        </div>

        <div class="header">
          <div>
            <div class="serial">N° ${escapeHtml(getPreviewNumber(numero))}</div>
            <h1 class="title">Nota de Pedido</h1>
            <div class="date-line">
              <span class="alert">!</span>
              <span class="delivery">${escapeHtml(fmtDate(entrega))}</span>
            </div>
            <div class="pedido-dia">DIA DEL PEDIDO:<br />${escapeHtml(fmtDate(fecha))}</div>
          </div>

          <div class="logo-wrap">
            <div class="logo-frame">
              <img src="${window.location.origin}/logo-linea-gris.png" alt="Sur Maderas" />
            </div>
          </div>

          <div>
            <div class="client-label">CLIENTE</div>
            <div class="client-name">${escapeHtml(clienteNombre || "Consumidor final")}</div>
            <div class="client-meta"><strong>Teléfono:</strong> ${escapeHtml(formatPhonePreview(clienteTelefono))}</div>
            <div class="client-meta"><strong>Dirección:</strong></div>
            <div class="client-address">${escapeHtml(clienteDireccion || "Todos los datos que sean necesarios")}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>DESCRIPCIÓN</th>
              <th>PRECIO</th>
              <th>CANTIDAD</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <strong>$${escapeHtml(toARS(subtotal))}</strong>
          </div>
          <div class="divider"></div>
          <div class="summary-row discount">
            <span>Descuento (si hay)</span>
            <strong>${descuentoMonto > 0 ? `${escapeHtml(toARS(descuentoPct))}%` : "-"}</strong>
            <strong>$${escapeHtml(toARS(descuentoMonto))}</strong>
          </div>
          <div class="summary-total">
            <span>TOTAL</span>
            <strong>$${escapeHtml(toARS(total))}</strong>
          </div>
        </div>

        <div class="footer">surmaderas.com.ar - surmaderasmdp@gmail.com - 223 438 3262</div>
      </div>
    </body>
  </html>`;
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

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      window.alert("El navegador bloqueo la ventana de impresión. Habilitá ventanas emergentes e intentá de nuevo.");
      return;
    }

    const html = buildPrintHtml({
      numero: detalle?.numero,
      fecha: detalle?.fecha,
      entrega: detalle?.entrega,
      clienteNombre,
      clienteTelefono,
      clienteDireccion,
      subtotal,
      descuentoMonto,
      descuentoPct,
      total,
      previewItems,
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      window.setTimeout(() => {
        printWindow.print();
        window.setTimeout(() => {
          printWindow.close();
        }, 300);
      }, 250);
    };
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
