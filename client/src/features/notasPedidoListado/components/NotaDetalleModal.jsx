import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { guardarPdfNotaPedido, actualizarCajaNota } from "../../../services/notasPedido";

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

/* ================= PDF BUILDER (MEDIA HOJA + PAGINADO) ================= */
async function buildPdfDocFromNota(nota) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const LOGO_DATA_URL = (await getLogoDataUrlSafe()) || "";

  const items = nota?.items || [];
  const totalItems = items.length;

  // === Config: usamos SIEMPRE la MITAD SUPERIOR ===
  const topPad = 8;
  const halfTop = topPad;
  const halfBottom = pageH / 2 - topPad; // límite inferior de la mitad superior
  const footerReserve = 18; // espacio para el footer dentro de la mitad superior

  function safeText(s) {
    return String(s ?? "");
  }

  function drawLabelValue(x, y, label, value) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(safeText(label), x, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(25);
    doc.text(safeText(value || "-"), x, y + 4);

    return y + 7.5;
  }

  async function drawLogoInBox(x, y, w, h) {
    if (!LOGO_DATA_URL) return;
    try {
      const { w: iw, h: ih } = await loadImageDimensions(LOGO_DATA_URL);
      const fitted = fitRect(iw, ih, w, h);
      doc.addImage(
        LOGO_DATA_URL,
        getImgFormatFromDataUrl(LOGO_DATA_URL),
        x + (w - fitted.w) / 2,
        y + (h - fitted.h) / 2,
        fitted.w,
        fitted.h
      );
    } catch {
      // no rompemos si falla el logo
    }
  }

  // ================= HEADER (solo se dibuja dentro de mitad superior) =================
  async function drawHeader({ compact = false }) {
    const headerTop = halfTop + 4;
    const headerH = compact ? 28 : 46;

    const rightBoxW = 62;
    const rightBoxX = pageW - margin - rightBoxW;

    doc.setDrawColor(220);
    doc.setLineWidth(0.35);

    // FULL: caja izquierda
    let leftBoxW = 0;
    if (!compact) {
      leftBoxW = 71;
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, headerTop, leftBoxW, headerH, "F");
      doc.rect(margin, headerTop, leftBoxW, headerH, "S");

      let y = headerTop + 5;
      y = drawLabelValue(margin + 5, y, "Estado", nota?.estado || "pendiente");
      y = drawLabelValue(margin + 5, y, "Fecha", fmtDate(nota?.fecha));
      y = drawLabelValue(margin + 5, y, "Cliente", nota?.cliente?.nombre || "-");
      y = drawLabelValue(margin + 5, y, "Tel", nota?.cliente?.telefono || "-");
      drawLabelValue(margin + 5, y, "Vendedor", nota?.vendedor || "-");
    }

    // Caja entrega (siempre)
    doc.setFillColor(250, 250, 250);
    doc.rect(rightBoxX, headerTop, rightBoxW, headerH, "F");
    doc.rect(rightBoxX, headerTop, rightBoxW, headerH, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(compact ? "Entrega" : "Fecha de entrega", rightBoxX + 6, headerTop + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 14 : 16);
    doc.setTextColor(20);
    doc.text(fmtDate(nota?.entrega), rightBoxX + 6, headerTop + 22);

    if (!compact && typeof nota?.diasHabiles === "number") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`${nota.diasHabiles} días hábiles`, rightBoxX + 6, headerTop + 32);
    }

    // Logo: en el espacio del medio
    const gap = 6;
    const logoAreaX = margin + (compact ? 0 : leftBoxW + gap);
    const logoAreaW = rightBoxX - gap - logoAreaX;
    await drawLogoInBox(logoAreaX, headerTop + 6, logoAreaW, compact ? 12 : 16);

    const sepY = headerTop + headerH + 6;
    doc.setDrawColor(230);
    doc.line(margin, sepY, pageW - margin, sepY);

    return sepY + 6;
  }

  // ================= ITEM CARD (igual estética, más compacto para que entren más) =================
  const rightColW = 64;
  const rightColX = pageW - margin - rightColW;
  const dividerX = rightColX - 6;

  const gapBetweenItems = 2.5;
  const rowH = 22; // ↓ para que entren más en media hoja (22–26 recomendado)

  async function drawItemCard(it, y) {
    const desc = safeText(it?.descripcion);
    const qty = Number(it?.cantidad || 0);
    const pu = Number(it?.precioUnit || 0);
    const sub = qty * pu;

    doc.setDrawColor(235);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, pageW - margin * 2, rowH, "F");
    doc.rect(margin, y, pageW - margin * 2, rowH, "S");

    doc.line(dividerX, y + 2, dividerX, y + rowH - 2);

    const textW = dividerX - margin - 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20);
    const title = doc.splitTextToSize(desc, textW)[0] || "";
    doc.text(title.length > 88 ? title.slice(0, 87) + "…" : title, margin + 8, y + 8.6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60);
    doc.text(`Cant: ${qty}  Unit: $${toARS(pu)}  Sub: $${toARS(sub)}`, margin + 8, y + 15.4);

    // Imagen derecha
    const imgBoxH = Math.max(12, rowH - 6);
    const boxW = rightColW - 12;
    const boxX = rightColX + 6;
    const boxY = y + (rowH - imgBoxH) / 2;

    doc.setDrawColor(225);
    doc.setFillColor(250, 250, 250);
    doc.rect(boxX, boxY, boxW, imgBoxH, "F");
    doc.rect(boxX, boxY, boxW, imgBoxH, "S");

    const allowImage = ["mueble", "marco", "calado"].includes(it?.tipo);
    const imgs = allowImage ? normalizeImages(it) : [];
    const img = imgs[0];

    if (img?.dataUrl) {
      try {
        const { w, h } = await loadImageDimensions(img.dataUrl);
        const fitted = fitRect(w, h, boxW - 2, imgBoxH - 2);
        doc.addImage(
          img.dataUrl,
          getImgFormatFromDataUrl(img.dataUrl),
          boxX + (boxW - fitted.w) / 2,
          boxY + (imgBoxH - fitted.h) / 2,
          fitted.w,
          fitted.h
        );
      } catch {
        doc.setFontSize(7);
        doc.setTextColor(140);
        doc.text("Imagen inválida", boxX + 2.5, boxY + 6);
      }
    } else {
      doc.setFontSize(7);
      doc.setTextColor(140);
      doc.text("Sin imagen", boxX + 2.5, boxY + 6);
    }

    return y + rowH + gapBetweenItems;
  }

  // ================= FOOTER (EN TODAS LAS HOJAS, DENTRO DE MITAD SUPERIOR) =================
  function drawFooter(pageNum, totalPages) {
    const y = halfBottom - 10; // dentro de mitad superior

    doc.setDrawColor(230);
    doc.line(margin, y - 6, pageW - margin, y - 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Ítems: ${totalItems}`, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Hoja ${pageNum} de ${totalPages}`, pageW / 2, y, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(`Total: $${toARS(nota?.totales?.total || 0)}`, pageW - margin, y, { align: "right" });
  }

  // ================= RENDER: SIEMPRE mitad superior; overflow => nueva hoja =================
  let pageNo = 1;

  // Dibujo página 1 (header full)
  let y = await drawHeader({ compact: false });

  // límite de items dentro de la mitad superior (dejando footerReserve)
  const itemsMaxY = () => (halfBottom - footerReserve);

  for (let i = 0; i < items.length; i++) {
    if (y + rowH > itemsMaxY()) {
      // cerrar footer de la página actual (todavía no sabemos totalPages, lo ponemos después en segundo pase)
      doc.addPage(); // siempre nueva hoja
      pageNo++;
      y = await drawHeader({ compact: true }); // desde la 2da hoja, compacto
    }
    y = await drawItemCard(items[i], y);
  }

  const totalPages = pageNo;

  // Segundo pase: footers en todas las páginas
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // Nota: mitad inferior queda en blanco por diseño.
  return doc;
}





/* ================= COMPONENT ================= */

export default function NotaDetalleModal({ open, onClose, detalle, loading, error, onRefresh }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  // Workflow: vista previa de nota obligatoria antes de guardar caja
  const [notaPreviewOk, setNotaPreviewOk] = useState(false);

  // Inline edit lock
  const [editCajaMode, setEditCajaMode] = useState(false);
  const [cajaUnlocked, setCajaUnlocked] = useState(false);
  const [cajaKey, setCajaKey] = useState(() => sessionStorage.getItem("CAJA_KEY") || "");

  const [savingCaja, setSavingCaja] = useState(false);

  // Caja UI state
  const [modo, setModo] = useState("sin");
  const [descuentoMonto, setDescuentoMonto] = useState(0);
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [precioEspecial, setPrecioEspecial] = useState(0);
  const [tipoPago, setTipoPago] = useState("");
  const [adelanto, setAdelanto] = useState(0);

  const cajaCerradaBackend = Boolean(detalle?.caja?.pago?.updatedAt);
  const cajaCerradaUI = cajaCerradaBackend && !editCajaMode;

  const totalLista = useMemo(() => Number(detalle?.totales?.subtotal || 0), [detalle]);

  useEffect(() => {
    return () => {
      if (previewUrl && typeof previewUrl === "string" && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Inicializo inputs desde caja/totales existentes al abrir/cambiar nota
  useEffect(() => {
    if (!detalle) return;

    const ajuste = detalle?.caja?.ajuste || {};
    const pago = detalle?.caja?.pago || {};

    setModo(ajuste.modo || "sin");
    setDescuentoMonto(Number(ajuste.descuentoMonto || detalle?.totales?.descuento || 0));
    setDescuentoPct(Number(ajuste.descuentoPct || 0));
    setPrecioEspecial(Number(ajuste.precioEspecial || 0));
    setTipoPago(pago.tipo || detalle?.medioPago || "");
    setAdelanto(Number(pago.adelanto || detalle?.totales?.adelanto || 0));

    setNotaPreviewOk(false);

    setEditCajaMode(false);
    setCajaUnlocked(false);
    setSavingCaja(false);
  }, [detalle]);

  if (!open) return null;

  async function pedirClaveCaja() {
    const r = await Swal.fire({
      icon: "question",
      title: "Clave de caja",
      input: "password",
      inputPlaceholder: "Ingresá la clave",
      showCancelButton: true,
      confirmButtonText: "Desbloquear",
      cancelButtonText: "Cancelar",
    });

    if (!r.isConfirmed) return false;

    const key = String(r.value || "").trim();
    if (!key) return false;

    sessionStorage.setItem("CAJA_KEY", key);
    setCajaKey(key);
    setCajaUnlocked(true);
    return true;
  }

  function calcCajaPreview() {
    const subtotal = totalLista;

    let totalFinal = subtotal;
    let desc = 0;

    if (modo === "precio_especial") {
      totalFinal = Number(precioEspecial || 0);
      desc = Math.max(0, subtotal - totalFinal);
    } else if (modo === "descuento_monto") {
      desc = Math.max(0, Number(descuentoMonto || 0));
      totalFinal = subtotal - desc;
    } else if (modo === "descuento_pct") {
      const pct = Math.max(0, Math.min(100, Number(descuentoPct || 0)));
      desc = (subtotal * pct) / 100;
      totalFinal = subtotal - desc;
    }

    totalFinal = Math.max(0, totalFinal);
    const ad = Math.max(0, Number(adelanto || 0));
    const resta = totalFinal - ad;

    return { subtotal, desc, totalFinal, adelanto: ad, resta };
  }

  /* ===== PDF ACTIONS ===== */

  async function onVistaPreviaPdf() {
    if (!detalle) return;
    try {
      if (detalle.pdfBase64) {
        setPreviewUrl(detalle.pdfBase64);
      } else {
        const doc = await buildPdfDocFromNota(detalle);
        const url = doc.output("bloburl");
        setPreviewUrl(url);
      }
      setNotaPreviewOk(true);
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

      onRefresh?.();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error guardando PDF",
        text: e?.message || "No se pudo guardar el PDF",
      });
    }
  }

  /* ===== CAJA WORKFLOW (confirmación automática) ===== */

  async function onGuardarCaja() {
    if (!detalle?._id) return;

    // vista previa de la NOTA obligatoria
    if (!notaPreviewOk) {
      await Swal.fire({
        icon: "warning",
        title: "Falta vista previa de la nota",
        text: "Primero hacé “Vista previa PDF” para revisar la nota antes de guardar caja.",
      });
      return;
    }

    // Confirmación automática con vista previa integrada
    const p = calcCajaPreview();

    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirmar Caja",
      html: `
        <div style="text-align:left">
          <div><b>Tipo pago:</b> ${tipoPago || "-"}</div>
          <div><b>Subtotal:</b> $${toARS(p.subtotal)}</div>
          <div><b>Descuento:</b> $${toARS(p.desc)}</div>
          <div><b>Total final:</b> $${toARS(p.totalFinal)}</div>
          <div><b>Adelanto:</b> $${toARS(p.adelanto)}</div>
          <div><b>Resta:</b> $${toARS(p.resta)}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Aceptar y guardar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    // clave obligatoria
    if (!cajaUnlocked) {
      const ok = await pedirClaveCaja();
      if (!ok) return;
    }

    try {
      setSavingCaja(true);

      await actualizarCajaNota(
        detalle._id,
        {
          ajuste: {
            modo,
            descuentoMonto: Number(descuentoMonto || 0),
            descuentoPct: Number(descuentoPct || 0),
            precioEspecial: Number(precioEspecial || 0),
          },
          pago: {
            tipo: tipoPago,
            adelanto: Number(adelanto || 0),
          },
        },
        cajaKey
      );

      await Swal.fire({
        icon: "success",
        title: "Caja guardada",
        timer: 1100,
        showConfirmButton: false,
      });

      setEditCajaMode(false);
      setCajaUnlocked(false);

      onRefresh?.();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error guardando Caja",
        text: e?.message || "No se pudo guardar Caja",
      });
    } finally {
      setSavingCaja(false);
    }
  }

  async function onEditarCajaInline() {
    const ok = await pedirClaveCaja();
    if (!ok) return;

    setEditCajaMode(true);
    await Swal.fire({
      icon: "info",
      title: "Edición habilitada",
      text: "Podés editar caja inline. Luego guardá Caja.",
    });
  }

  async function onCancelarEdicionCajaInline() {
    setEditCajaMode(false);
    setCajaUnlocked(false);
    onRefresh?.();
  }

  /* ===== UI ===== */

  return (
    <>
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
              {/* TOP */}
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

                <div className="npl-muted" style={{ marginTop: 8 }}>
                  Requisito: Vista previa de la nota (PDF) antes de guardar Caja —{" "}
                  <strong>{notaPreviewOk ? "OK" : "pendiente"}</strong>
                </div>
              </div>

              {/* Scroll items */}
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

              {/* Bottom */}
              <div className="npl-bottomCard">
                {!cajaCerradaUI ? (
                  <>
                    <div className="npl-bottomRow">
                      <div className="npl-kv">
                        <div className="npl-k">Caja (editable)</div>
                        <div className="npl-v">
                          Requiere: Vista previa Nota (PDF) + Confirmación Caja
                        </div>
                      </div>
                      {cajaCerradaBackend && (
                        <button className="npl-btnGhost" type="button" onClick={onCancelarEdicionCajaInline}>
                          Cancelar edición
                        </button>
                      )}
                    </div>

                    <div className="npl-totalsGrid" style={{ marginBottom: 10 }}>
                      <div className="npl-totalBox">
                        <div className="npl-k">Ajuste</div>
                        <div className="npl-v">
                          <select value={modo} onChange={(e) => setModo(e.target.value)} style={{ width: "100%" }}>
                            <option value="sin">Sin ajuste</option>
                            <option value="descuento_monto">Descuento $</option>
                            <option value="descuento_pct">Descuento %</option>
                            <option value="precio_especial">Precio especial</option>
                          </select>
                        </div>
                      </div>

                      {modo === "descuento_monto" && (
                        <div className="npl-totalBox">
                          <div className="npl-k">Descuento $</div>
                          <div className="npl-v">
                            <input
                              type="number"
                              min="0"
                              value={descuentoMonto}
                              onChange={(e) => setDescuentoMonto(e.target.value)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </div>
                      )}

                      {modo === "descuento_pct" && (
                        <div className="npl-totalBox">
                          <div className="npl-k">Descuento %</div>
                          <div className="npl-v">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={descuentoPct}
                              onChange={(e) => setDescuentoPct(e.target.value)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </div>
                      )}

                      {modo === "precio_especial" && (
                        <div className="npl-totalBox">
                          <div className="npl-k">Total especial</div>
                          <div className="npl-v">
                            <input
                              type="number"
                              min="0"
                              value={precioEspecial}
                              onChange={(e) => setPrecioEspecial(e.target.value)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="npl-totalBox">
                        <div className="npl-k">Tipo de pago</div>
                        <div className="npl-v">
                          <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} style={{ width: "100%" }}>
                            <option value="">-</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="debito">Débito</option>
                            <option value="credito">Crédito</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="qr">QR</option>
                            <option value="mixto">Mixto</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                      </div>

                      <div className="npl-totalBox">
                        <div className="npl-k">Seña / Adelanto</div>
                        <div className="npl-v">
                          <input
                            type="number"
                            min="0"
                            value={adelanto}
                            onChange={(e) => setAdelanto(e.target.value)}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="npl-modalActions npl-modalActions--nice">
                      <button className="npl-btn" onClick={onVistaPreviaPdf}>
                        Vista previa PDF
                      </button>

                      <button className="npl-btn" onClick={onGuardarCaja} disabled={savingCaja}>
                        {savingCaja ? "Guardando..." : "Guardar Caja"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="npl-bottomRow">
                      <div className="npl-kv">
                        <div className="npl-k">Caja</div>
                        <div className="npl-v">Guardada. Para editar: clave.</div>
                      </div>
                      <button className="npl-btnGhost" type="button" onClick={onEditarCajaInline}>
                        Editar Caja (clave)
                      </button>
                    </div>

                    <div className="npl-modalActions npl-modalActions--nice">
                      <button className="npl-btn" onClick={onVistaPreviaPdf}>Vista previa PDF</button>
                      <button className="npl-btn" onClick={onDescargarPdf}>Descargar PDF</button>
                      <button className="npl-btn" disabled={Boolean(detalle.pdfBase64)} onClick={onGuardarPdfEnBD}>
                        Guardar PDF en la BD
                      </button>
                    </div>
                  </>
                )}

                {/* Totales visibles siempre en UI */}
                <div className="npl-totalsGrid">
                  <div className="npl-totalBox">
                    <div className="npl-k">Subtotal</div>
                    <div className="npl-v">${toARS(detalle.totales?.subtotal)}</div>
                  </div>

                  <div className="npl-totalBox">
                    <div className="npl-k">Descuento</div>
                    <div className="npl-v">
                      ${toARS(detalle.caja?.totales?.descuentoAplicado ?? detalle.totales?.descuento)}
                    </div>
                  </div>

                  <div className="npl-totalBox npl-totalBox--strong">
                    <div className="npl-k">Total</div>
                    <div className="npl-v">
                      ${toARS(detalle.caja?.totales?.totalFinal ?? detalle.totales?.total)}
                    </div>
                  </div>

                  <div className="npl-totalBox">
                    <div className="npl-k">Adelanto</div>
                    <div className="npl-v">
                      ${toARS(detalle.caja?.pago?.adelanto ?? detalle.totales?.adelanto)}
                    </div>
                  </div>

                  <div className="npl-totalBox">
                    <div className="npl-k">Resta</div>
                    <div className="npl-v">
                      ${toARS(detalle.caja?.totales?.resta ?? detalle.totales?.resta)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview PDF modal */}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
