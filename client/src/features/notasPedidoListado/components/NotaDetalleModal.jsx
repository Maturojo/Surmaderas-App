import { useEffect, useState } from "react";
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

/* ================= PDF BUILDER (REAL) ================= */

async function buildPdfDocFromNota(nota) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  function getImgFormat(dataUrl) {
    if (!dataUrl) return "JPEG";
    if (dataUrl.includes("png")) return "PNG";
    return "JPEG";
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function fit(w, h, maxW, maxH) {
    const r = Math.min(maxW / w, maxH / h);
    return { w: w * r, h: h * r };
  }

  /* ===== HEADER ===== */
  doc.setFontSize(14);
  doc.text(`NOTA ${nota.numero}`, margin, 16);

  doc.setFontSize(10);
  doc.text(`Fecha: ${fmtDate(nota.fecha)}`, margin, 24);
  doc.text(`Entrega: ${fmtDate(nota.entrega)}`, margin, 30);

  doc.text(`Cliente: ${nota.cliente?.nombre || ""}`, margin, 38);
  doc.text(`Tel: ${nota.cliente?.telefono || ""}`, margin, 44);
  doc.text(`Vendedor: ${nota.vendedor || ""}`, margin, 50);
  doc.text(`Medio de pago: ${nota.medioPago || ""}`, margin, 56);

  /* ===== ITEMS ===== */
  let y = 70;
  doc.setFontSize(9);

  for (const it of nota.items || []) {
    const allowImage = ["mueble", "marco", "calado"].includes(it.tipo);
    const images = allowImage ? normalizeImages(it) : [];

    const rightColW = 45;
    const imgMaxH = 24;
    const gap = 6;

    const rightX = pageW - margin - rightColW;
    const textMaxW = rightX - margin - gap;

    const sub = (Number(it.cantidad || 0) * Number(it.precioUnit || 0)) || 0;

    const lines = doc.splitTextToSize(it.descripcion || "", textMaxW);
    doc.text(lines, margin, y);

    doc.text(
      `Cant: ${it.cantidad} | Unit: $${toARS(it.precioUnit)} | Sub: $${toARS(sub)}`,
      margin,
      y + lines.length * 5
    );

    let blockH = lines.length * 5 + 6;

    // imágenes a la derecha (columna)
    let imgY = y;
    for (const img of images) {
      if (!img?.dataUrl) continue;

      try {
        const { w, h } = await loadImage(img.dataUrl);
        const fitted = fit(w, h, rightColW, imgMaxH);
        const imgX = rightX + (rightColW - fitted.w) / 2;

        doc.addImage(img.dataUrl, getImgFormat(img.dataUrl), imgX, imgY, fitted.w, fitted.h);
        doc.setDrawColor(220);
        doc.rect(rightX, imgY, rightColW, imgMaxH);

        imgY += imgMaxH + 3;
        blockH = Math.max(blockH, imgY - y);
      } catch {
        // si falla una imagen, no rompe el pdf
      }
    }

    y += blockH + 4;

    if (y > pageH - 30) {
      doc.addPage();
      y = 20;
    }
  }

  /* ===== TOTALES ===== */
  y += 6;
  doc.setFontSize(11);
  doc.text(`Subtotal: $${toARS(nota.totales?.subtotal)}`, margin, y);
  y += 7;
  doc.text(`Descuento: $${toARS(nota.totales?.descuento)}`, margin, y);
  y += 7;
  doc.text(`TOTAL: $${toARS(nota.totales?.total)}`, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.text(
    `Adelanto: $${toARS(nota.totales?.adelanto)} | Resta: $${toARS(nota.totales?.resta)}`,
    margin,
    y
  );

  return doc;
}

/* ================= COMPONENT ================= */

export default function NotaDetalleModal({ open, onClose, detalle, loading, error }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  // Limpieza del blob url para no acumular memoria
  useEffect(() => {
    return () => {
      if (previewUrl && typeof previewUrl === "string" && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  async function onVistaPreviaPdf() {
    if (!detalle) return;

    // Si ya está guardado en BD como datauristring, lo mostramos directo
    if (detalle.pdfBase64) {
      // suele venir como data:application/pdf;base64,...
      setPreviewUrl(detalle.pdfBase64);
      return;
    }

    const doc = await buildPdfDocFromNota(detalle);

    // bloburl es más estable para iframe/pdf viewer
    const url = doc.output("bloburl");
    setPreviewUrl(url);
  }

  async function onDescargarPdf() {
    if (!detalle) return;
    const doc = await buildPdfDocFromNota(detalle);
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

    const doc = await buildPdfDocFromNota(detalle);

    // datauristring para guardar en DB
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
      {/* MODAL DETALLE */}
      <div className="npl-modalBack" onMouseDown={onClose}>
        <div className="npl-modal npl-modal--nice" onMouseDown={(e) => e.stopPropagation()}>
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
              {/* TOP (SIN SCROLL) */}
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

              {/* SCROLL SOLO ITEMS */}
              <div className="npl-scrollOnly">
                {(detalle.items || []).map((it, i) => {
                  const imgs = normalizeImages(it);
                  const sub = (Number(it.cantidad || 0) * Number(it.precioUnit || 0)) || 0;

                  return (
                    <div className="npl-itemRow npl-itemRow--nice" key={i}>
                      <div className="npl-itemDesc">{it.descripcion}</div>
                      <div className="npl-itemMeta">
                        <span>
                          Cant: <strong>{it.cantidad}</strong>
                        </span>
                        <span>
                          Unit: <strong>${toARS(it.precioUnit)}</strong>
                        </span>
                        <span>
                          Sub: <strong>${toARS(sub)}</strong>
                        </span>
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

              {/* BOTTOM SIN SCROLL */}
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

      {/* MODAL PREVIEW PDF */}
      {previewUrl && (
        <div className="npl-modalBack" onMouseDown={() => setPreviewUrl(null)}>
          <div className="npl-modal npl-modal-preview" onMouseDown={(e) => e.stopPropagation()}>
            <div className="npl-modalHeader">
              <div className="npl-modalTitle">Vista previa PDF</div>
              <button className="npl-x" type="button" onClick={() => setPreviewUrl(null)}>
                ×
              </button>
            </div>

            <iframe
              src={previewUrl}
              title="Vista previa PDF"
              style={{ width: "100%", height: "80vh", border: "none" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
