import { useState } from "react";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { guardarPdfNotaPedido } from "../../../services/notasPedido";

/* ================= HELPERS ================= */

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(yyyyMMdd) {
  if (!yyyyMMdd) return "-";
  return String(yyyyMMdd).split("-").reverse().join("/");
}

function normalizeImages(it) {
  if (Array.isArray(it?.data?.imagenes)) return it.data.imagenes;
  if (it?.data?.imagen) return [it.data.imagen];
  return [];
}

/* ================= COMPONENT ================= */

export default function NotaDetalleModal({ open, onClose, detalle, loading, error }) {
  const [previewPdf, setPreviewPdf] = useState(null);

  if (!open) return null;

  // IMPORTANTE: acá vos ya tenías tu buildPdfDocFromNota real.
  // Si lo tenés en este mismo archivo, dejalo como estaba.
  // Este buildPdf() es placeholder. Reemplazalo por tu función real si aplica.
  async function buildPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.text(`NOTA ${detalle.numero}`, 20, 20);
    return doc;
  }

  async function onVistaPreviaPdf() {
    if (!detalle) return;
    if (detalle.pdfBase64) {
      setPreviewPdf(detalle.pdfBase64);
      return;
    }
    const doc = await buildPdf();
    setPreviewPdf(doc.output("datauristring"));
  }

  async function onDescargarPdf() {
    if (!detalle) return;
    const doc = await buildPdf();
    doc.save(`${detalle.numero}.pdf`);
  }

  async function onGuardarPdfEnBD() {
    if (!detalle) return;

    const result = await Swal.fire({
      icon: "question",
      title: "Guardar PDF",
      text: "¿Querés guardar el PDF de esta nota en la base de datos?",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const doc = await buildPdf();
    const pdfBase64 = doc.output("datauristring");

    await guardarPdfNotaPedido(detalle._id, pdfBase64);

    await Swal.fire({
      icon: "success",
      title: "PDF guardado",
      timer: 1500,
      showConfirmButton: false,
    });
  }

  return (
    <>
      {/* MODAL */}
      <div className="npl-modalBack" onMouseDown={onClose}>
        <div className="npl-modal npl-modal--nice" onMouseDown={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <div className="npl-modalHeader npl-modalHeader--nice">
            <div>
              <div className="npl-modalTitle">Detalle de Nota de Pedido</div>
              {!!detalle?.numero && <div className="npl-modalSub">#{detalle.numero}</div>}
            </div>

            <button className="npl-x" type="button" onClick={onClose}>
              ×
            </button>
          </div>

          {loading ? (
            <div className="npl-muted npl-pad">Cargando detalle...</div>
          ) : error ? (
            <div className="npl-error npl-pad">{error}</div>
          ) : !detalle ? (
            <div className="npl-muted npl-pad">Sin información</div>
          ) : (
            <div className="npl-body">
              {/* ====== TOP (SIN SCROLL) ====== */}
              <div className="npl-topCard">
                <div className="npl-grid">
                  <div className="npl-kv">
                    <div className="npl-k">Estado</div>
                    <div className={`npl-v npl-badge npl-badge--${detalle.estado || "pendiente"}`}>
                      {detalle.estado || "pendiente"}
                    </div>
                  </div>

                  <div className="npl-kv">
                    <div className="npl-k">Fecha</div>
                    <div className="npl-v">{fmtDate(detalle.fecha)}</div>
                  </div>

                  <div className="npl-kv">
                    <div className="npl-k">Entrega</div>
                    <div className="npl-v">
                      {fmtDate(detalle.entrega)}
                      {typeof detalle.diasHabiles === "number" ? ` (${detalle.diasHabiles} días hábiles)` : ""}
                    </div>
                  </div>

                  <div className="npl-kv">
                    <div className="npl-k">Cliente</div>
                    <div className="npl-v">{detalle.cliente?.nombre || "-"}</div>
                  </div>

                  <div className="npl-kv">
                    <div className="npl-k">Tel</div>
                    <div className="npl-v">{detalle.cliente?.telefono || "-"}</div>
                  </div>

                  <div className="npl-kv">
                    <div className="npl-k">Vendedor</div>
                    <div className="npl-v">{detalle.vendedor || "-"}</div>
                  </div>
                </div>
              </div>

              {/* ====== CENTRO (SOLO ITEMS CON SCROLL) ====== */}
              <div className="npl-scrollOnly">
                {(detalle.items || []).map((it, i) => {
                  const imgs = normalizeImages(it);
                  const sub = (Number(it.cantidad || 0) * Number(it.precioUnit || 0)) || 0;

                  return (
                    <div className="npl-itemRow npl-itemRow--nice" key={i}>
                      <div className="npl-itemDesc">{it.descripcion}</div>

                      <div className="npl-itemMeta">
                        <span>Cant: <strong>{it.cantidad}</strong></span>
                        <span>Unit: <strong>${toARS(it.precioUnit)}</strong></span>
                        <span>Sub: <strong>${toARS(sub)}</strong></span>
                      </div>

                      {imgs.length > 0 && (
                        <div className="npl-thumbs">
                          {imgs.map((img, idx) => (
                            <img key={idx} src={img.dataUrl} alt="Adjunto" className="npl-thumb" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ====== BOTTOM (SIN SCROLL): MEDIO PAGO + TOTALES ====== */}
              <div className="npl-bottomCard">
                <div className="npl-bottomRow">
                  <div className="npl-kv">
                    <div className="npl-k">Medio de pago</div>
                    <div className="npl-v">{detalle.medioPago || "-"}</div>
                  </div>
                </div>

                <div className="npl-totalsGrid">
                  <div className="npl-totalBox">
                    <div className="npl-k">Subtotal</div>
                    <div className="npl-v">${toARS(detalle.totales?.subtotal)}</div>
                  </div>

                  <div className="npl-totalBox">
                    <div className="npl-k">Descuento</div>
                    <div className="npl-v">${toARS(detalle.totales?.descuento)}</div>
                  </div>

                  <div className="npl-totalBox npl-totalBox--strong">
                    <div className="npl-k">Total</div>
                    <div className="npl-v">${toARS(detalle.totales?.total)}</div>
                  </div>

                  <div className="npl-totalBox">
                    <div className="npl-k">Adelanto</div>
                    <div className="npl-v">${toARS(detalle.totales?.adelanto)}</div>
                  </div>

                  <div className="npl-totalBox">
                    <div className="npl-k">Resta</div>
                    <div className="npl-v">${toARS(detalle.totales?.resta)}</div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="npl-modalActions npl-modalActions--nice">
                <button className="npl-btn" onClick={onVistaPreviaPdf}>
                  Vista previa PDF
                </button>
                <button className="npl-btn" onClick={onDescargarPdf}>
                  Descargar PDF
                </button>
                <button className="npl-btn" disabled={Boolean(detalle.pdfBase64)} onClick={onGuardarPdfEnBD}>
                  Guardar PDF en la BD
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW PDF */}
      {previewPdf && (
        <div className="npl-modalBack" onMouseDown={() => setPreviewPdf(null)}>
          <div className="npl-modal npl-modal-preview" onMouseDown={(e) => e.stopPropagation()}>
            <div className="npl-modalHeader">
              <div className="npl-modalTitle">Vista previa PDF</div>
              <button className="npl-x" type="button" onClick={() => setPreviewPdf(null)}>
                ×
              </button>
            </div>
            <iframe src={previewPdf} title="Vista previa PDF" style={{ width: "100%", height: "80vh", border: "none" }} />
          </div>
        </div>
      )}
    </>
  );
}
