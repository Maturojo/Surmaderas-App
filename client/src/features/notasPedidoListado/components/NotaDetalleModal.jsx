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

function getImgFormatFromDataUrl(dataUrl) {
  if (!dataUrl) return "JPEG";
  if (dataUrl.includes("png")) return "PNG";
  return "JPEG";
}

function loadImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fitRect(srcW, srcH, maxW, maxH) {
  const r = Math.min(maxW / srcW, maxH / srcH);
  return { w: srcW * r, h: srcH * r };
}

function drawLabelValue(x, y, label, value) {
  // label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);        // antes 8
  doc.setTextColor(130);
  doc.text(String(label || ""), x, y);

  // value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);        // antes 10
  doc.setTextColor(25);
  doc.text(String(value || "-"), x, y + 3.2);

  // step ultra compacto
  return y + 8.8;              // antes ~9.8
}


/* ================= LOGO LOADER =================
   Poné el logo acá:
   client/public/logo-sur-maderas.png
*/
const LOGO_PUBLIC_URL = "/logo-sur-maderas.png";
let _logoCacheDataUrl = null;

async function fetchAsDataUrlSafe(url) {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return "";

    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function getLogoDataUrlSafe() {
  if (_logoCacheDataUrl) return _logoCacheDataUrl;
  const dataUrl = await fetchAsDataUrlSafe(LOGO_PUBLIC_URL);
  _logoCacheDataUrl = dataUrl || "";
  return _logoCacheDataUrl;
}

/* ================= PDF BUILDER (DISEÑO NUEVO) ================= */
async function buildPdfDocFromNota(nota) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();   // ~210
  const pageH = doc.internal.pageSize.getHeight();  // ~297
  const margin = 12;

  // ===== MEDIA HOJA A4 =====
  const usableTop = 6;
  const usableH = pageH / 2 - 6; // media hoja (mitad superior)
  const usableBottom = usableTop + usableH;

  // Datos del local
  const LOCAL_NOMBRE = "Sur Maderas";
  const LOCAL_DIRECCION = "Luro 5020, Mar del Plata";
  const LOCAL_TELEFONO = "Tel: __________";

  const LOGO_DATA_URL = (await (typeof getLogoDataUrlSafe === "function" ? getLogoDataUrlSafe() : "")) || "";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function safeSplitText(text, maxW) {
    return doc.splitTextToSize(String(text ?? ""), maxW);
  }
  function clipTextLine(line, maxChars = 90) {
    const s = String(line ?? "");
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars - 1) + "…";
  }

function drawLabelValue(x, y, label, value) {
  // Label (más chico)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);          // más chico
  doc.setTextColor(130);
  doc.text(String(label || ""), x, y);

  // Value (más cerca del label)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);          // más chico
  doc.setTextColor(25);
  doc.text(String(value || "-"), x, y + 3.9); // antes ~3.2/3.6

  // Paso total por bloque (MUY importante)
  return y + 7.6;              // antes 8.8 / 9.8 / 12
}



  async function drawCenterLogoOrText(x, y, w) {
    let curY = y;

    if (LOGO_DATA_URL) {
      try {
        const { w: iw, h: ih } = await loadImageDimensions(LOGO_DATA_URL);
        const maxLogoW = Math.min(42, w);
        const maxLogoH = 14;
        const fitted = fitRect(iw, ih, maxLogoW, maxLogoH);
        const logoX = x + (w - fitted.w) / 2;
        doc.addImage(
          LOGO_DATA_URL,
          getImgFormatFromDataUrl(LOGO_DATA_URL),
          logoX,
          curY,
          fitted.w,
          fitted.h
        );
        curY += fitted.h + 4;
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(20);
        doc.text(LOCAL_NOMBRE, x + w / 2, curY + 6, { align: "center" });
        curY += 12;
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20);
      doc.text(LOCAL_NOMBRE, x + w / 2, curY + 6, { align: "center" });
      curY += 12;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(LOCAL_DIRECCION, x + w / 2, curY + 4, { align: "center" });
    doc.text(LOCAL_TELEFONO, x + w / 2, curY + 9, { align: "center" });

    return curY + 12;
  }

  /* ================= HEADER ================= */

  const headerTop = usableTop + 4;
  const headerH = 46;

  const leftBoxX = margin;
  const leftBoxW = 71;

  const rightBoxW = 62;
  const rightBoxX = pageW - margin - rightBoxW;

  const centerX = leftBoxX + leftBoxW + 6;
  const centerW = rightBoxX - 6 - centerX;

  doc.setDrawColor(220);
  doc.setLineWidth(0.35);

  doc.setFillColor(250, 250, 250);
  doc.rect(leftBoxX, headerTop, leftBoxW, headerH, "F");
  doc.rect(leftBoxX, headerTop, leftBoxW, headerH, "S");

  doc.setFillColor(250, 250, 250);
  doc.rect(rightBoxX, headerTop, rightBoxW, headerH, "F");
  doc.rect(rightBoxX, headerTop, rightBoxW, headerH, "S");

  // izquierda
  let yL = headerTop + 5;
  yL = drawLabelValue(leftBoxX + 5, yL, "Estado", nota.estado || "pendiente");
  yL = drawLabelValue(leftBoxX + 5, yL, "Fecha", fmtDate(nota.fecha));
  

  yL = drawLabelValue(leftBoxX + 5, yL, "Cliente", clipTextLine(nota?.cliente?.nombre || "-", 26));
  yL = drawLabelValue(leftBoxX + 5, yL, "Tel", clipTextLine(nota?.cliente?.telefono || "-", 20));
  yL = drawLabelValue(leftBoxX + 5, yL, "Vendedor", clipTextLine(nota?.vendedor || "-", 16));

  // derecha entrega
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Fecha de entrega", rightBoxX + 6, headerTop + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(fmtDate(nota.entrega), rightBoxX + 6, headerTop + 24);

  if (typeof nota.diasHabiles === "number") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`${nota.diasHabiles} días hábiles`, rightBoxX + 6, headerTop + 32);
  }

  await drawCenterLogoOrText(centerX, headerTop + 8, centerW);

  const headerSepY = headerTop + headerH + 6;
  doc.setDrawColor(230);
  doc.line(margin, headerSepY, pageW - margin, headerSepY);

  /* ================= BODY (AUTO-FIT) ================= */

  // zona de items dentro de media hoja
  const bottomReserved = 22;                 // totales + separación
  const itemsTop = headerSepY + 8;
  const itemsMaxBottom = usableBottom - bottomReserved;

  // columnas
  const rightColW = 64; // foto
  const rightColX = pageW - margin - rightColW;
  const dividerX = rightColX - 6;
  const leftColX = margin;
  const textW = dividerX - leftColX - 10;

  // perfiles de compactación (de “normal” a “ultra compacto”)
  // Se prueban en orden hasta que entren más items.
  const PROFILES = [
    { titleSize: 11, metaSize: 10, maxTitleLines: 3, rowPadTop: 14, lineH: 5.0, minRowH: 52, imgBoxH: 42 },
    { titleSize: 10, metaSize: 9.5, maxTitleLines: 3, rowPadTop: 13, lineH: 4.6, minRowH: 48, imgBoxH: 40 },
    { titleSize: 10, metaSize: 9,   maxTitleLines: 2, rowPadTop: 13, lineH: 4.6, minRowH: 44, imgBoxH: 36 },
    { titleSize: 9.5, metaSize: 9,  maxTitleLines: 2, rowPadTop: 12, lineH: 4.2, minRowH: 40, imgBoxH: 34 },
    { titleSize: 9,   metaSize: 8.5,maxTitleLines: 1, rowPadTop: 12, lineH: 4.0, minRowH: 36, imgBoxH: 30 },
  ];

  function estimateRowHeightForItem(it, p) {
    // Estima alto según cantidad de líneas del título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(p.titleSize);

    const rawLines = safeSplitText(String(it?.descripcion || ""), textW);
    const titleLines = rawLines.slice(0, p.maxTitleLines);

    const titleH = p.rowPadTop + titleLines.length * p.lineH; // y de texto
    const metaH = 22; // Cant/Unit/Sub
    const textH = titleH + metaH;

    const imgH = p.imgBoxH + 12;

    return Math.max(p.minRowH, textH, imgH);
  }

  function countHowManyFit(items, p) {
    let y = itemsTop;
    let count = 0;

    for (const it of items) {
      const h = estimateRowHeightForItem(it, p);
      if (y + h > itemsMaxBottom) break;
      y += h + 8;
      count++;
    }
    return count;
  }

  // Elegimos el perfil que haga entrar la mayor cantidad
  const items = nota.items || [];
  let bestProfile = PROFILES[0];
  let bestCount = -1;

  for (const p of PROFILES) {
    const c = countHowManyFit(items, p);
    if (c > bestCount) {
      bestCount = c;
      bestProfile = p;
    }
    if (c === items.length) break; // si ya entran todos, listo
  }

  async function drawItem(it, startY, p) {
    const desc = String(it?.descripcion || "");
    const qty = Number(it?.cantidad || 0);
    const pu = Number(it?.precioUnit || 0);
    const sub = qty * pu;

    // preparar líneas de título ya recortadas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(p.titleSize);
    doc.setTextColor(20);

    const raw = safeSplitText(desc, textW);
    const titleLines = raw
      .slice(0, p.maxTitleLines)
      .map((ln) => clipTextLine(ln, 95));

    const rowH = estimateRowHeightForItem(it, p);

    // tarjeta
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(235);
    doc.rect(margin, startY, pageW - margin * 2, rowH, "F");
    doc.rect(margin, startY, pageW - margin * 2, rowH, "S");

    // divisor vertical
    doc.setDrawColor(235);
    doc.line(dividerX, startY + 6, dividerX, startY + rowH - 6);

    // texto
    doc.text(titleLines, leftColX + 8, startY + p.rowPadTop);

    const yAfterTitle = startY + p.rowPadTop + titleLines.length * p.lineH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(p.metaSize);
    doc.setTextColor(50);
    doc.text(`Cant: ${qty}`, leftColX + 8, yAfterTitle + 7);
    doc.text(`Unit: $${toARS(pu)}`, leftColX + 8, yAfterTitle + 13);
    doc.text(`Sub: $${toARS(sub)}`, leftColX + 8, yAfterTitle + 19);

    // imagen
    const allowImage = ["mueble", "marco", "calado"].includes(it?.tipo);
    const imgs = allowImage ? normalizeImages(it) : [];
    const img = imgs[0];

    const boxW = rightColW - 12;
    const boxH = p.imgBoxH;
    const boxX = rightColX + 6;
    const boxY = startY + (rowH - boxH) / 2;

    doc.setDrawColor(225);
    doc.setFillColor(250, 250, 250);
    doc.rect(boxX, boxY, boxW, boxH, "F");
    doc.rect(boxX, boxY, boxW, boxH, "S");

    if (img?.dataUrl) {
      try {
        const { w, h } = await loadImageDimensions(img.dataUrl);
        const fitted = fitRect(w, h, boxW - 4, boxH - 4);
        const imgX = boxX + (boxW - fitted.w) / 2;
        const imgY = boxY + (boxH - fitted.h) / 2;
        doc.addImage(img.dataUrl, getImgFormatFromDataUrl(img.dataUrl), imgX, imgY, fitted.w, fitted.h);
      } catch {
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text("Imagen inválida", boxX + 4, boxY + 8);
      }
    } else {
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text("Sin imagen", boxX + 4, boxY + 8);
    }

    return startY + rowH + 8;
  }

  // dibujar tantos como entren con el perfil elegido
  let y = itemsTop;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const rowH = estimateRowHeightForItem(it, bestProfile);
    if (y + rowH > itemsMaxBottom) break;
    y = await drawItem(it, y, bestProfile);
  }

  /* ================= TOTALES ================= */

  const totalsY = usableBottom - 18;

  doc.setDrawColor(230);
  doc.line(margin, totalsY - 10, pageW - margin, totalsY - 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`Total: $${toARS(nota.totales?.total)}`, pageW - margin, totalsY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Adelanto: $${toARS(nota.totales?.adelanto)}`, pageW - margin, totalsY + 6, { align: "right" });
  doc.text(`Resta: $${toARS(nota.totales?.resta)}`, pageW - margin, totalsY + 12, { align: "right" });

  return doc;
}




/* ================= COMPONENT ================= */

export default function NotaDetalleModal({ open, onClose, detalle, loading, error }) {
  const [previewUrl, setPreviewUrl] = useState(null);

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
    try {
      // si ya está guardado, lo mostramos
      if (detalle.pdfBase64) {
        setPreviewUrl(detalle.pdfBase64);
        return;
      }

      const doc = await buildPdfDocFromNota(detalle);
      const url = doc.output("bloburl");
      setPreviewUrl(url);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error generando PDF",
        text: e?.message || "No se pudo generar el PDF",
      });
    }
  }

  async function onDescargarPdf() {
    if (!detalle) return;
    try {
      const doc = await buildPdfDocFromNota(detalle);
      doc.save(`${detalle.numero}.pdf`);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error descargando PDF",
        text: e?.message || "No se pudo descargar el PDF",
      });
    }
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

    try {
      const doc = await buildPdfDocFromNota(detalle);
      const pdfBase64 = doc.output("datauristring");
      await guardarPdfNotaPedido(detalle._id, pdfBase64);

      await Swal.fire({
        icon: "success",
        title: "PDF guardado",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error guardando PDF",
        text: e?.message || "No se pudo guardar el PDF",
      });
    }
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
            <button className="npl-x" type="button" onClick={onClose}>×</button>
          </div>

          {loading ? (
            <div className="npl-muted npl-pad">Cargando detalle...</div>
          ) : error ? (
            <div className="npl-error npl-pad">{error}</div>
          ) : !detalle ? (
            <div className="npl-muted npl-pad">Sin información</div>
          ) : (
            <div className="npl-body">
              {/* TOP sin scroll */}
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

              {/* Scroll solo items */}
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

              {/* Bottom sin scroll */}
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

              {/* Actions */}
              <div className="npl-modalActions npl-modalActions--nice">
                <button className="npl-btn" onClick={onVistaPreviaPdf}>Vista previa PDF</button>
                <button className="npl-btn" onClick={onDescargarPdf}>Descargar PDF</button>
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
              <button className="npl-x" type="button" onClick={() => setPreviewUrl(null)}>×</button>
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
