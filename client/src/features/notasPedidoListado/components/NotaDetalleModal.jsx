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

/* ================= PDF BUILDER (DISEÑO NUEVO) ================= */
async function buildPdfDocFromNota(nota) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const usableTop = 6;
  const usableH = pageH / 2 - 6;
  const usableBottom = usableTop + usableH;

  const LOCAL_NOMBRE = "Sur Maderas";
  const LOCAL_DIRECCION = "Luro 5020, Mar del Plata";
  const LOCAL_TELEFONO = "Tel: __________";

  const LOGO_DATA_URL = (await getLogoDataUrlSafe()) || "";

  function safeSplitText(text, maxW) {
    return doc.splitTextToSize(String(text ?? ""), maxW);
  }
  function clipTextLine(line, maxChars = 90) {
    const s = String(line ?? "");
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars - 1) + "…";
  }

  function drawLabelValue(x, y, label, value) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(String(label || ""), x, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(25);
    doc.text(String(value || "-"), x, y + 3.9);

    return y + 7.6;
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

  const bottomReserved = 22;
  const itemsTop = headerSepY + 8;
  const itemsMaxBottom = usableBottom - bottomReserved;

  const rightColW = 64;
  const rightColX = pageW - margin - rightColW;
  const dividerX = rightColX - 6;
  const leftColX = margin;
  const textW = dividerX - leftColX - 10;

  const PROFILES = [
    { titleSize: 11, metaSize: 10, maxTitleLines: 3, rowPadTop: 14, lineH: 5.0, minRowH: 52, imgBoxH: 42 },
    { titleSize: 10, metaSize: 9.5, maxTitleLines: 3, rowPadTop: 13, lineH: 4.6, minRowH: 48, imgBoxH: 40 },
    { titleSize: 10, metaSize: 9,   maxTitleLines: 2, rowPadTop: 13, lineH: 4.6, minRowH: 44, imgBoxH: 36 },
    { titleSize: 9.5, metaSize: 9,  maxTitleLines: 2, rowPadTop: 12, lineH: 4.2, minRowH: 40, imgBoxH: 34 },
    { titleSize: 9,   metaSize: 8.5,maxTitleLines: 1, rowPadTop: 12, lineH: 4.0, minRowH: 36, imgBoxH: 30 },
  ];

  function estimateRowHeightForItem(it, p) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(p.titleSize);

    const rawLines = safeSplitText(String(it?.descripcion || ""), textW);
    const titleLines = rawLines.slice(0, p.maxTitleLines);

    const titleH = p.rowPadTop + titleLines.length * p.lineH;
    const metaH = 22;
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

  const items = nota.items || [];
  let bestProfile = PROFILES[0];
  let bestCount = -1;

  for (const p of PROFILES) {
    const c = countHowManyFit(items, p);
    if (c > bestCount) {
      bestCount = c;
      bestProfile = p;
    }
    if (c === items.length) break;
  }

  async function drawItem(it, startY, p) {
    const desc = String(it?.descripcion || "");
    const qty = Number(it?.cantidad || 0);
    const pu = Number(it?.precioUnit || 0);
    const sub = qty * pu;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(p.titleSize);
    doc.setTextColor(20);

    const raw = safeSplitText(desc, textW);
    const titleLines = raw
      .slice(0, p.maxTitleLines)
      .map((ln) => clipTextLine(ln, 95));

    const rowH = estimateRowHeightForItem(it, p);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(235);
    doc.rect(margin, startY, pageW - margin * 2, rowH, "F");
    doc.rect(margin, startY, pageW - margin * 2, rowH, "S");

    doc.setDrawColor(235);
    doc.line(dividerX, startY + 6, dividerX, startY + rowH - 6);

    doc.text(titleLines, leftColX + 8, startY + p.rowPadTop);

    const yAfterTitle = startY + p.rowPadTop + titleLines.length * p.lineH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(p.metaSize);
    doc.setTextColor(50);
    doc.text(`Cant: ${qty}`, leftColX + 8, yAfterTitle + 7);
    doc.text(`Unit: $${toARS(pu)}`, leftColX + 8, yAfterTitle + 13);
    doc.text(`Sub: $${toARS(sub)}`, leftColX + 8, yAfterTitle + 19);

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

  const totalToShow = nota?.caja?.totales?.totalFinal ?? nota?.totales?.total ?? 0;
  const adelantoToShow = nota?.caja?.pago?.adelanto ?? nota?.totales?.adelanto ?? 0;
  const restaToShow = nota?.caja?.totales?.resta ?? nota?.totales?.resta ?? 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`Total: $${toARS(totalToShow)}`, pageW - margin, totalsY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Adelanto: $${toARS(adelantoToShow)}`, pageW - margin, totalsY + 6, { align: "right" });
  doc.text(`Resta: $${toARS(restaToShow)}`, pageW - margin, totalsY + 12, { align: "right" });

  return doc;
}

/* ================= COMPONENT ================= */

export default function NotaDetalleModal({ open, onClose, detalle, loading, error, onRefresh }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  // Workflow flags
  const [notaPreviewOk, setNotaPreviewOk] = useState(false); // vista previa de nota (PDF) obligatoria
  const [cajaPreviewOk, setCajaPreviewOk] = useState(false); // vista previa de caja obligatoria

  // Inline edit lock
  const [editCajaMode, setEditCajaMode] = useState(false);   // permite editar inline aunque esté “cerrada”
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
  const cajaCerradaUI = cajaCerradaBackend && !editCajaMode; // si desbloqueo, se edita inline

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

    // Reglas workflow: siempre exigir previews antes de guardar
    setNotaPreviewOk(false);
    setCajaPreviewOk(false);

    // si ya estaba cerrada, arrancar en modo no edición
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

      // Marca que el usuario ya vio la nota (requisito para guardar caja)
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

  /* ===== CAJA WORKFLOW ===== */

  async function onVistaPreviaCaja() {
    if (!detalle) return;

    const p = calcCajaPreview();

    await Swal.fire({
      icon: "info",
      title: "Vista previa de Caja",
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
      confirmButtonText: "OK",
    });

    setCajaPreviewOk(true);
  }

  async function onGuardarCaja() {
    if (!detalle?._id) return;

    // 0) vista previa de la NOTA obligatoria
    if (!notaPreviewOk) {
      await Swal.fire({
        icon: "warning",
        title: "Falta vista previa de la nota",
        text: "Primero hacé “Vista previa PDF” para revisar la nota antes de guardar caja.",
      });
      return;
    }

    // 1) vista previa de caja obligatoria
    if (!cajaPreviewOk) {
      await Swal.fire({
        icon: "warning",
        title: "Falta vista previa de Caja",
        text: "Primero hacé “Vista previa Caja” antes de guardar.",
      });
      return;
    }

    // 2) clave obligatoria (si está cerrada o si estamos en modo edición)
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

      // al guardar: volver a bloqueado + reset previews para futuras ediciones
      setEditCajaMode(false);
      setCajaUnlocked(false);
      setCajaPreviewOk(false);

      // recargar detalle
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
    // pedir clave y habilitar inline edit
    const ok = await pedirClaveCaja();
    if (!ok) return;

    setEditCajaMode(true);
    setCajaPreviewOk(false); // obliga a hacer vista previa caja de nuevo
    await Swal.fire({
      icon: "info",
      title: "Edición habilitada",
      text: "Podés editar caja inline. Luego hacé Vista previa Caja y Guardar Caja.",
    });
  }

  async function onCancelarEdicionCajaInline() {
    // vuelve a bloqueado, sin perder datos del backend (se verán tras refresh)
    setEditCajaMode(false);
    setCajaUnlocked(false);
    setCajaPreviewOk(false);

    // re-cargar para que vuelva exactamente a lo guardado
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

                {/* Nota preview status */}
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
                {/* CAJA (inline edit) */}
                {!cajaCerradaUI ? (
                  <>
                    <div className="npl-bottomRow">
                      <div className="npl-kv">
                        <div className="npl-k">Caja (editable)</div>
                        <div className="npl-v">
                          Requiere: Vista previa Nota (PDF) + Vista previa Caja
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

                      <button className="npl-btn" onClick={onVistaPreviaCaja}>
                        Vista previa Caja
                      </button>

                      <button className="npl-btn" onClick={onGuardarCaja} disabled={savingCaja}>
                        {savingCaja ? "Guardando..." : "Guardar Caja"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* CAJA cerrada: solo acciones PDF + botón editar inline */}
                    <div className="npl-bottomRow">
                      <div className="npl-kv">
                        <div className="npl-k">Caja</div>
                        <div className="npl-v">Guardada. Para editar: clave.</div>
                      </div>
                      <button className="npl-btnGhost" type="button" onClick={onEditarCajaInline}>
                        Editar Caja (clave)
                      </button>
                    </div>

                    {/* ===== Resumen previo a guardar ===== */}
                    <div className="npl-cajaResumen">
                      <div>
                        <span>Ajuste</span>
                        <strong>
                          {modo === "sin" && "Sin ajuste"}
                          {modo === "descuento_pct" && `Descuento ${descuentoPct}%`}
                          {modo === "descuento_monto" && `Descuento $${toARS(descuentoMonto)}`}
                          {modo === "precio_especial" && `Precio especial $${toARS(precioEspecial)}`}
                        </strong>
                      </div>

                      <div>
                        <span>Pago</span>
                        <strong>{tipoPago || "-"}</strong>
                      </div>

                      <div>
                        <span>Seña</span>
                        <strong>${toARS(adelanto)}</strong>
                      </div>
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

                {/* Totales visibles siempre (caja si existe, fallback a totales viejos) */}
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
