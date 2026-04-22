import { useEffect, useMemo, useState } from "react";

import Swal from "sweetalert2";
import { createWorker } from "tesseract.js";

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
const DESCUENTO_OPCIONES = [
  { value: "0", label: "Sin descuento" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "custom", label: "Personalizado" },
];
const MAX_COMPROBANTE_MB = 6;

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No se selecciono ningun archivo"));
      return;
    }

    if (!String(file.type || "").startsWith("image/")) {
      reject(new Error("El comprobante tiene que ser una imagen"));
      return;
    }

    if (file.size > MAX_COMPROBANTE_MB * 1024 * 1024) {
      reject(new Error(`El comprobante no puede superar ${MAX_COMPROBANTE_MB}MB`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        nombre: file.name || "comprobante",
        tipo: file.type || "image/*",
        dataUrl: String(reader.result || ""),
      });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el comprobante"));
    reader.readAsDataURL(file);
  });
}

function parseMoney(value) {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const number = Number(normalized || 0);
  return Number.isFinite(number) ? number : 0;
}

function sameMoney(a, b) {
  return Math.round(Number(a || 0) * 100) === Math.round(Number(b || 0) * 100);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function moneyTokenToNumber(raw) {
  const compact = String(raw || "").replace(/[^\d.,]/g, "");
  if (!compact) return 0;

  const hasDecimalComma = /,\d{2}$/.test(compact);
  const hasDecimalDot = /\.\d{2}$/.test(compact);
  const normalized = hasDecimalComma
    ? compact.replace(/\./g, "").replace(",", ".")
    : hasDecimalDot
      ? compact.replace(/,/g, "")
      : compact.replace(/[.,]/g, "");
  const value = Number(normalized || 0);
  return Number.isFinite(value) ? value : 0;
}

function extractMoneyCandidates(text) {
  const lines = String(text || "").split(/\r?\n/);
  const candidates = [];

  lines.forEach((line, lineIndex) => {
    const cleanLine = line.replace(/\s+/g, " ").trim();
    const matches = cleanLine.matchAll(/(?:[$S]\s*)?\d{1,3}(?:[.\s]\d{3})+(?:,\d{2})?|(?:[$S]\s*)?\d+(?:,\d{2})/gi);

    for (const match of matches) {
      const raw = match[0];
      const value = moneyTokenToNumber(raw);
      if (!Number.isFinite(value) || value <= 0) continue;

      const digitCount = raw.replace(/\D/g, "").length;
      const hasCurrencyMarker = /[$S]/i.test(raw);
      const hasMoneyFormat = /(?:[.\s]\d{3})|(?:,\d{2})/.test(raw);
      const isVeryLongIdentifier = digitCount > 8 && !hasCurrencyMarker && !hasMoneyFormat;

      let score = 0;
      if (hasCurrencyMarker) score += 120;
      if (hasMoneyFormat) score += 45;
      if (lineIndex <= 4) score += 20;
      if (/importe|monto|total|transferencia|comprobante/i.test(cleanLine)) score += 18;
      if (isVeryLongIdentifier) score -= 180;
      if (!hasCurrencyMarker && digitCount > 9) score -= 140;
      if (!hasCurrencyMarker && value > 10000000) score -= 120;
      if (value < 100) score -= 20;

      candidates.push({ value, score });
    }
  });

  return candidates
    .sort((a, b) => b.score - a.score || b.value - a.value)
    .map((candidate) => candidate.value)
    .filter((value, index, values) => values.findIndex((item) => sameMoney(item, value)) === index);
}

function extractCurrencyLineAmount(text) {
  const lines = String(text || "").split(/\r?\n/);

  for (const line of lines) {
    const cleanLine = line.replace(/\s+/g, " ").trim();
    const match = cleanLine.match(/(^|[^A-Za-z0-9])[$S]\s*(\d{1,3}(?:[.\s]\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)/i);
    const value = moneyTokenToNumber(match?.[2]);
    if (value > 0) return value;
  }

  return 0;
}

function findExpectedAmountInText(text, expectedAmount) {
  const expected = Number(expectedAmount || 0);
  if (expected <= 0) return 0;

  const expectedForms = [
    String(Math.round(expected)),
    Math.round(expected).toLocaleString("es-AR"),
    expected.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ];

  return expectedForms.some((form) => {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "[.\\s]");
    return new RegExp(`(^|[^\\d])${escaped}([^\\d]|$)`).test(text);
  })
    ? expected
    : 0;
}

function pickAmountFromOcrResult(result, expectedAmount) {
  const text = result?.data?.text || "";
  const expectedFromText = findExpectedAmountInText(text, expectedAmount);
  if (expectedFromText > 0) return expectedFromText;

  const currencyLineAmount = extractCurrencyLineAmount(text);
  if (currencyLineAmount > 0) return currencyLineAmount;

  const wordRows = (result?.data?.words || [])
    .filter((word) => word?.text && word?.bbox)
    .sort((a, b) => (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0))
    .reduce((rows, word) => {
      const previous = rows[rows.length - 1];
      if (previous && Math.abs(previous.y - word.bbox.y0) <= 14) {
        previous.words.push(word);
        previous.y = Math.round((previous.y + word.bbox.y0) / 2);
        return rows;
      }
      rows.push({ y: word.bbox.y0, words: [word] });
      return rows;
    }, []);

  for (const row of wordRows) {
    const rowText = row.words.map((word) => word.text).join(" ");
    const value = extractCurrencyLineAmount(rowText);
    if (value > 0) return value;
  }

  const candidates = extractMoneyCandidates(text);
  const expected = Number(expectedAmount || 0);
  if (!candidates.length) return 0;

  if (expected > 0) {
    const exact = candidates.find((candidate) => sameMoney(candidate, expected));
    if (exact) return exact;
  }

  return candidates[0];
}

function getShortOcrText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function getOcrDebugText(result) {
  const text = result?.data?.text || "";
  const wordsText = (result?.data?.words || []).map((word) => word?.text).filter(Boolean).join(" ");
  return getShortOcrText(text || wordsText);
}

function pickLikelyReceiptAmount(text, expectedAmount) {
  const expectedFromText = findExpectedAmountInText(text, expectedAmount);
  if (expectedFromText > 0) return expectedFromText;

  const currencyLineAmount = extractCurrencyLineAmount(text);
  if (currencyLineAmount > 0) return currencyLineAmount;

  const candidates = extractMoneyCandidates(text);
  const expected = Number(expectedAmount || 0);
  if (!candidates.length) return 0;

  if (expected > 0) {
    const exact = candidates.find((candidate) => sameMoney(candidate, expected));
    if (exact) return exact;
  }

  return candidates[0];
}

function buildOcrVariant(dataUrl, options = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;
      const cropX = 0;
      const cropY = Math.max(0, Math.round(sourceHeight * (options.y || 0)));
      const cropWidth = sourceWidth;
      const cropHeight = Math.min(sourceHeight - cropY, Math.round(sourceHeight * (options.height || 1)));
      const scale = options.scale || 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(cropWidth * scale));
      canvas.height = Math.max(1, Math.round(cropHeight * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

      if (options.contrast) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const gray = (pixels[i] * 0.3) + (pixels[i + 1] * 0.59) + (pixels[i + 2] * 0.11);
          const value = gray < 215 ? Math.max(0, gray - 45) : 255;
          pixels[i] = value;
          pixels[i + 1] = value;
          pixels[i + 2] = value;
          pixels[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function buildOcrVariants(dataUrl) {
  const variants = await Promise.all([
    Promise.resolve(dataUrl),
    buildOcrVariant(dataUrl, { scale: 2, contrast: true }),
    buildOcrVariant(dataUrl, { y: 0.16, height: 0.28, scale: 3, contrast: true }),
    buildOcrVariant(dataUrl, { y: 0.22, height: 0.18, scale: 4, contrast: true }),
  ]);

  return variants.filter((variant, index, list) => variant && list.indexOf(variant) === index);
}

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
  const [comprobante, setComprobante] = useState(null);
  const [montoComprobante, setMontoComprobante] = useState("");
  const [leyendoComprobante, setLeyendoComprobante] = useState(false);
  const [ocrTexto, setOcrTexto] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [descuentoTipo, setDescuentoTipo] = useState("0");
  const [descuentoPersonalizado, setDescuentoPersonalizado] = useState("");

  useEffect(() => {
    if (!detalle) return;
    setTipo(detalle?.caja?.tipo || "");
    setMonto(String(detalle?.caja?.monto ?? getNotaTotal(detalle)));
    setMetodo(detalle?.caja?.metodo || "Efectivo");
    setNotaCaja(detalle?.caja?.nota || "");
    setComprobante(detalle?.caja?.comprobante?.dataUrl ? detalle.caja.comprobante : null);
    setMontoComprobante(detalle?.caja?.comprobante?.monto ? String(detalle.caja.comprobante.monto) : "");
    setOcrTexto("");
    const descuentoInicial = Number(detalle?.caja?.descuento ?? detalle?.totales?.descuento ?? 0);
    const subtotalInicial = Number(detalle?.caja?.subtotal ?? detalle?.totales?.subtotal ?? getNotaTotal(detalle));
    if (descuentoInicial > 0 && sameMoney(descuentoInicial, subtotalInicial * 0.05)) {
      setDescuentoTipo("5");
      setDescuentoPersonalizado("");
    } else if (descuentoInicial > 0 && sameMoney(descuentoInicial, subtotalInicial * 0.1)) {
      setDescuentoTipo("10");
      setDescuentoPersonalizado("");
    } else if (descuentoInicial > 0) {
      setDescuentoTipo("custom");
      setDescuentoPersonalizado(String(roundMoney(descuentoInicial)));
    } else {
      setDescuentoTipo("0");
      setDescuentoPersonalizado("");
    }
  }, [detalle]);

  const totalGuardado = getNotaTotal(detalle);
  const subtotal = Number(detalle?.caja?.subtotal || detalle?.totales?.subtotal || totalGuardado);
  const descuentoMonto = Math.min(
    subtotal,
    Math.max(
      0,
      descuentoTipo === "custom"
        ? parseMoney(descuentoPersonalizado)
        : roundMoney(subtotal * (Number(descuentoTipo || 0) / 100))
    )
  );
  const total = Math.max(0, roundMoney(subtotal - descuentoMonto));
  const adelanto = Number(detalle?.totales?.adelanto ?? 0);
  const resta = Math.max(0, roundMoney(total - adelanto));
  const puedeComprobante = tipo === "pago" || tipo === "seña" || !!detalle?.caja?.comprobante?.dataUrl;
  const requiereComprobante = puedeComprobante && metodo !== "Efectivo";
  const comprobanteArchivoId = `comprobante-archivo-${detalle?._id || "nota"}`;
  const comprobanteCamaraId = `comprobante-camara-${detalle?._id || "nota"}`;

  useEffect(() => {
    if (tipo === "pago") {
      setMonto(String(total));
    }
  }, [tipo, total]);
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

  function getMontoCajaActual() {
    if (tipo === "pago") return total;
    if (tipo === "seña") return parseMoney(monto);
    return 0;
  }

  async function leerMontoDesdeComprobante(nextComprobante) {
    if (!nextComprobante?.dataUrl) return;

    setLeyendoComprobante(true);
    setOcrTexto("");

    try {
      const worker = await createWorker("eng");
      await worker.setParameters({
        preserve_interword_spaces: "1",
      });
      const variants = await buildOcrVariants(nextComprobante.dataUrl);
      let result = null;
      let montoDetectado = 0;

      for (const variant of variants) {
        result = await worker.recognize(variant);
        montoDetectado = pickAmountFromOcrResult(result, getMontoCajaActual());
        if (montoDetectado > 0) break;
      }

      await worker.terminate();

      setOcrTexto(getOcrDebugText(result));

      if (montoDetectado > 0) {
        setMontoComprobante(String(Math.round(montoDetectado * 100) / 100));
        return;
      }

      await Swal.fire({
        title: "No pude leer el monto",
        text: "No encontré un importe claro en el comprobante. Podés cargarlo manualmente.",
        icon: "info",
      });
    } catch (e) {
      await Swal.fire({
        title: "No se pudo leer el comprobante",
        text: e?.message || "El OCR no pudo procesar la imagen. Podés cargar el monto manualmente.",
        icon: "warning",
      });
    } finally {
      setLeyendoComprobante(false);
    }
  }

  async function cargarComprobanteDesdeArchivo(file) {
    try {
      const next = await readImageFile(file);
      setComprobante(next);
      await leerMontoDesdeComprobante(next);
    } catch (e) {
      await Swal.fire({
        title: "Comprobante no valido",
        text: e?.message || "No se pudo cargar el comprobante",
        icon: "warning",
      });
    }
  }

  async function pegarComprobanteDesdePortapapeles() {
    try {
      if (!navigator.clipboard?.read) {
        throw new Error("Tu navegador no permite leer imagenes del portapapeles con este boton. Probá pegando con Ctrl+V.");
      }

      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((candidate) => candidate.startsWith("image/"));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        await cargarComprobanteDesdeArchivo(new File([blob], "comprobante-pegado.png", { type: imageType }));
        return;
      }

      throw new Error("No encontramos una imagen en el portapapeles.");
    } catch (e) {
      await Swal.fire({
        title: "No se pudo pegar",
        text: e?.message || "Copiá una imagen y volvé a intentar.",
        icon: "warning",
      });
    }
  }

  async function handleComprobantePaste(e) {
    const file = Array.from(e.clipboardData?.files || []).find((item) => String(item.type || "").startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    await cargarComprobanteDesdeArchivo(file);
  }

  function buildCajaPayload(payloadTipo, montoCaja) {
    const esOperacionConPago = payloadTipo === "seña" || payloadTipo === "pago";
    return {
      tipo: payloadTipo,
      monto: Number(montoCaja || 0),
      subtotal: esOperacionConPago ? subtotal : 0,
      descuento: esOperacionConPago ? descuentoMonto : 0,
      total: esOperacionConPago ? total : 0,
      resta: esOperacionConPago ? resta : 0,
      metodo,
      nota: notaCaja,
      comprobante: puedeComprobante
        ? { ...(comprobante || {}), monto: parseMoney(montoComprobante) }
        : null,
    };
  }

  async function validarComprobanteAntesDeGuardar(payloadTipo, montoCaja) {
    const necesitaValidacion = (payloadTipo === "seña" || payloadTipo === "pago") && metodo !== "Efectivo";
    if (!necesitaValidacion) return true;

    if (leyendoComprobante) {
      await Swal.fire({
        title: "Comprobante en lectura",
        text: "Esperá a que termine de leer el monto del comprobante antes de guardar.",
        icon: "info",
      });
      return false;
    }

    if (!comprobante?.dataUrl) {
      await Swal.fire({
        title: "Falta comprobante",
        text: "Para este medio de pago tenés que adjuntar, pegar o sacar foto del comprobante.",
        icon: "warning",
      });
      return false;
    }

    const montoComprobanteNumero = parseMoney(montoComprobante);
    if (!(montoComprobanteNumero > 0)) {
      await Swal.fire({
        title: "Falta monto del comprobante",
        text: "Cargá el monto que figura en el comprobante para compararlo con la seña o el pago.",
        icon: "warning",
      });
      return false;
    }

    if (!sameMoney(montoComprobanteNumero, montoCaja)) {
      await Swal.fire({
        title: "El monto no coincide",
        text: `El comprobante dice $${toARS(montoComprobanteNumero)} y en caja figura $${toARS(montoCaja)}.`,
        icon: "warning",
      });
      return false;
    }

    return true;
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
                    <div className="npl-v npl-discountControl">
                      <select value={descuentoTipo} onChange={(e) => setDescuentoTipo(e.target.value)}>
                        {DESCUENTO_OPCIONES.map((opcion) => (
                          <option key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </option>
                        ))}
                      </select>
                      {descuentoTipo === "custom" ? (
                        <input
                          value={descuentoPersonalizado}
                          onChange={(e) => setDescuentoPersonalizado(e.target.value)}
                          placeholder="Monto"
                        />
                      ) : null}
                      <span>${toARS(descuentoMonto)}</span>
                    </div>
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

                <div
                  className={`npl-proofBox${!puedeComprobante ? " npl-proofBox--disabled" : ""}`}
                  onPaste={puedeComprobante ? handleComprobantePaste : undefined}
                  tabIndex={puedeComprobante ? 0 : -1}
                >
                  <div className="npl-proofHeader">
                    <div>
                      <div className="npl-k">Comprobante</div>
                      <div className="npl-proofHint">
                        {!puedeComprobante
                          ? "Se habilita cuando el tipo es Seña o Pago."
                          : requiereComprobante
                            ? "Adjuntá una imagen, pegala con Ctrl+V o sacá una foto."
                            : "Opcional. Podés adjuntar una imagen, pegarla con Ctrl+V o sacar una foto."}
                      </div>
                    </div>
                    {puedeComprobante && comprobante?.dataUrl ? (
                      <button className="npl-btnGhost" type="button" onClick={() => setComprobante(null)}>
                        Quitar
                      </button>
                    ) : null}
                  </div>

                  {puedeComprobante ? (
                    <>
                      <div className="npl-proofActions">
                        <label className="npl-proofBtn" htmlFor={comprobanteArchivoId}>Adjuntar</label>
                        <button className="npl-proofBtn" type="button" onClick={pegarComprobanteDesdePortapapeles}>
                          Pegar
                        </button>
                        <label className="npl-proofBtn" htmlFor={comprobanteCamaraId}>Sacar foto</label>
                      </div>

                      <input
                        id={comprobanteArchivoId}
                        type="file"
                        accept="image/*"
                        className="npl-proofInput"
                        onChange={(e) => cargarComprobanteDesdeArchivo(e.target.files?.[0])}
                      />
                      <input
                        id={comprobanteCamaraId}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="npl-proofInput"
                        onChange={(e) => cargarComprobanteDesdeArchivo(e.target.files?.[0])}
                      />

                      {comprobante?.dataUrl ? (
                        <div className="npl-proofPreview">
                          <img
                            src={comprobante.dataUrl}
                            alt="Comprobante de pago"
                            className="npl-proofThumb"
                            onClick={() => setLightboxSrc(comprobante.dataUrl)}
                          />
                        <div>
                          <strong>{comprobante.nombre || "Comprobante"}</strong>
                          <span>
                            {leyendoComprobante
                              ? "Leyendo monto automáticamente..."
                              : detalle?.caja?.guardada
                                ? "Guardado con la caja."
                                : "Listo para guardar con la caja."}
                          </span>
                          <button className="npl-proofVerBtn" type="button" onClick={() => setLightboxSrc(comprobante.dataUrl)}>
                            Ver completo
                          </button>
                        </div>
                      </div>
                      ) : (
                        <div className="npl-proofEmpty">También podés hacer click acá y pegar una captura con Ctrl+V.</div>
                      )}

                      <div className="npl-proofAmount">
                        <label className="npl-k" htmlFor="montoComprobante">Monto que figura en el comprobante</label>
                        <input
                          id="montoComprobante"
                          value={montoComprobante}
                          onChange={(e) => setMontoComprobante(e.target.value)}
                          disabled={leyendoComprobante}
                          placeholder="Ej: 214172"
                        />
                        <span>
                          {leyendoComprobante
                            ? "Leyendo la imagen para completar el monto..."
                            : "Se completa automáticamente desde la imagen y debe coincidir con la seña o pago."}
                        </span>
                        {ocrTexto ? <span>Texto detectado: {ocrTexto.slice(0, 140)}</span> : null}
                      </div>
                    </>
                  ) : (
                    <div className="npl-proofEmpty">Para cargar comprobante seleccioná el tipo Seña o Pago.</div>
                  )}
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
                          const okComprobante = await validarComprobanteAntesDeGuardar("pago", total);
                          if (!okComprobante) return;
                          await onGuardarCaja?.(detalle, buildCajaPayload("pago", total));
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
                              const okComprobante = await validarComprobanteAntesDeGuardar("seña", montoSenia);
                              if (!okComprobante) return;

                              await onGuardarCaja?.(detalle, buildCajaPayload("seña", montoSenia));
                            });
                            return;
                          }
                        }

                        const okComprobante = await validarComprobanteAntesDeGuardar(payloadTipo, Number(monto || 0));
                        if (!okComprobante) return;
                        await onGuardarCaja?.(detalle, buildCajaPayload(payloadTipo, monto));
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
              <>
                {(() => {
                  const itemsConImg = (detalle?.items || []).filter(it => it.imagen || it.data?.imagen);
                  if (!itemsConImg.length) return null;
                  return (
                    <div className="npl-soloComprobanteBox npl-noPrint">
                      <div className="npl-k" style={{ marginBottom: 10 }}>Imágenes de referencia</div>
                      <div className="npl-refImgGrid">
                        {itemsConImg.map((it, i) => {
                          const src = it.imagen || it.data?.imagen;
                          const label = it.descripcion || it.tipo || `Ítem ${i + 1}`;
                          return (
                            <div key={i} className="npl-refImgItem">
                              <img
                                src={src}
                                alt={label}
                                className="npl-proofThumb"
                                style={{ width: 80, height: 64 }}
                                onClick={() => setLightboxSrc(src)}
                              />
                              <span className="npl-refImgLabel">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {detalle?.caja?.comprobante?.dataUrl ? (
                  <div className="npl-soloComprobanteBox npl-noPrint">
                    <div className="npl-soloComprobanteHeader">
                      <div>
                        <div className="npl-k">Comprobante de pago</div>
                        <div className="npl-proofHint">
                          {detalle.caja.metodo && <span>{detalle.caja.metodo} · </span>}
                          {detalle.caja.tipo && <span>{detalle.caja.tipo} · </span>}
                          {detalle.caja.comprobante.monto > 0 && <span>${toARS(detalle.caja.comprobante.monto)}</span>}
                        </div>
                      </div>
                      <button
                        className="npl-btnGhost"
                        type="button"
                        onClick={() => setLightboxSrc(detalle.caja.comprobante.dataUrl)}
                      >
                        Ver completo
                      </button>
                    </div>
                    <img
                      src={detalle.caja.comprobante.dataUrl}
                      alt="Comprobante de pago"
                      className="npl-soloComprobanteImg npl-proofThumb"
                      onClick={() => setLightboxSrc(detalle.caja.comprobante.dataUrl)}
                    />
                  </div>
                ) : null}
                <div className="npl-modalActions npl-modalActions--preview">
                  <button className="npl-btnGhost" onClick={handlePrint}>Imprimir</button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {lightboxSrc && (
        <div className="npl-lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Comprobante de pago" onClick={(e) => e.stopPropagation()} />
          <button className="npl-lightboxClose" type="button" onClick={() => setLightboxSrc(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
