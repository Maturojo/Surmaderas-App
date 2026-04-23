import html2canvas from "html2canvas";

const NOTE_WIDTH_MM = 200;
const NOTE_HEIGHT_MM = 145;
const CSS_PX_PER_MM = 96 / 25.4;
const DESCRIPTION_CHARS_PER_LINE = 26;
const FIRST_PAGE_UNITS = 13.5;
const CONTINUATION_PAGE_UNITS = 18.5;
const LAST_PAGE_UNITS = 11.8;

export function toARS(n) {
  return Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(value) {
  if (!value) return "-";
  if (String(value).includes("-") && String(value).length <= 10) {
    return String(value).split("-").reverse().join("/");
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-AR");
}

export function formatPhonePreview(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "-";
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return String(value);
}

export function getPreviewNumber(value) {
  const numero = String(value || "").trim();
  return numero || "002-000123";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildNotaPedidoPrintData(nota, options = {}) {
  const cliente = nota?.cliente || {};
  const {
    audience = "client",
    providerName = "",
  } = options;
  const showPrices = audience !== "provider";
  const showClientDetails = audience !== "provider";
  const items = Array.isArray(nota?.items)
    ? nota.items.map((item, idx) => {
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
    : [];

  const subtotal = Number(nota?.caja?.subtotal || nota?.totales?.subtotal || nota?.total || 0);
  const descuentoMonto = Number(nota?.caja?.descuento ?? nota?.totales?.descuento ?? 0);
  const total = Number(nota?.caja?.total || nota?.totales?.total || nota?.total || 0);
  const descuentoPct = subtotal > 0 ? (descuentoMonto / subtotal) * 100 : 0;
  const tipoCaja = String(nota?.caja?.tipo || "").toLowerCase();
  const estadoComercial = String(nota?.estado || "").toLowerCase();
  const estaSenada = tipoCaja === "seña" || tipoCaja === "sena" || tipoCaja === "senia" || estadoComercial === "señada";
  const estaPagada = tipoCaja === "pago" || estadoComercial === "pagada";
  const estadoCajaLabel = estaPagada ? "Pagada" : estaSenada ? "Señada" : "";
  const montoCaja = Number(nota?.caja?.monto || 0);
  const totalPendiente = estaSenada ? Math.max(0, total - montoCaja) : total;

  return {
    numero: nota?.numero || "",
    fecha: nota?.fecha || "",
    entrega: nota?.entrega || "",
    clienteNombre: cliente?.nombre || "Consumidor final",
    clienteTelefono: cliente?.telefono || "",
    providerName,
    vendedor: nota?.vendedor || "",
    subtotal,
    descuentoMonto,
    descuentoPct,
    total: totalPendiente,
    estadoCajaLabel,
    estaSenada,
    montoCaja,
    previewItems: items,
    audience,
    showPrices,
    showClientDetails,
  };
}

function buildRows(previewItems, showPrices = true) {
  if (!previewItems.length) {
    return `
      <tr>
        <td colspan="${showPrices ? 5 : 3}" class="empty">Sin items cargados.</td>
      </tr>
    `;
  }

  return previewItems
    .map(
      (item, idx) => `
        <tr class="${idx % 2 === 1 ? "is-alt" : ""}">
          <td>${item.orden}</td>
          <td>${escapeHtml(item.descripcion)}</td>
          ${showPrices ? `<td>$${escapeHtml(toARS(item.precio))}</td>` : ""}
          <td>${item.cantidad}</td>
          ${showPrices ? `<td>$${escapeHtml(toARS(item.total))}</td>` : ""}
        </tr>
      `
    )
    .join("");
}

function estimateRowUnits(item) {
  const description = String(item?.descripcion || "").trim();
  if (!description) return 1;

  const segments = description.split(/\r?\n/);
  const lines = segments.reduce((acc, segment) => {
    const clean = segment.trim();
    if (!clean) return acc + 1;
    return acc + Math.max(1, Math.ceil(clean.length / DESCRIPTION_CHARS_PER_LINE));
  }, 0);

  return 1.02 + Math.max(0, lines - 1) * 0.76;
}

function estimateItemsUnits(items) {
  return items.reduce((acc, item) => acc + estimateRowUnits(item), 0);
}

function takeItemsByCapacity(items, capacity) {
  const taken = [];
  let units = 0;

  for (const item of items) {
    const itemUnits = estimateRowUnits(item);
    if (taken.length > 0 && units + itemUnits > capacity) break;
    taken.push(item);
    units += itemUnits;
  }

  return taken.length ? taken : items.slice(0, 1);
}

function paginatePreviewItems(items) {
  if (!items.length) return [[]];
  if (estimateItemsUnits(items) <= LAST_PAGE_UNITS) return [items];

  const pages = [];
  let remaining = items;
  let isFirstPage = true;

  while (remaining.length) {
    const allRemainingFitOnLast = estimateItemsUnits(remaining) <= LAST_PAGE_UNITS;
    if (allRemainingFitOnLast) {
      pages.push(remaining);
      break;
    }

    const capacity = isFirstPage ? FIRST_PAGE_UNITS : CONTINUATION_PAGE_UNITS;
    let pageItems = takeItemsByCapacity(remaining, capacity);
    if (pageItems.length >= remaining.length && estimateItemsUnits(remaining) > LAST_PAGE_UNITS) {
      pageItems = remaining.slice(0, Math.max(1, remaining.length - 1));
    }
    pages.push(pageItems);
    remaining = remaining.slice(pageItems.length);
    isFirstPage = false;
  }

  return pages;
}

export function getNotaPedidoPageCount(data) {
  return paginatePreviewItems(data?.previewItems || []).length;
}

function buildStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background:
        radial-gradient(circle at top left, rgba(206, 194, 176, 0.22), transparent 26%),
        linear-gradient(180deg, #f7f3ee 0%, #ffffff 30%);
      font-family: "Montserrat", Arial, Helvetica, sans-serif;
      color: #111;
    }
    body { width: 100%; margin: 0; }
    .npw-pages {
      width: fit-content;
      margin: 0 auto;
    }
    .npw-doc {
      width: 200mm;
      height: 148mm;
      margin: 0 0 5mm;
      padding: 4mm 6.5mm 9mm;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(251,249,246,0.98) 100%);
      border: 0.35mm solid rgba(27, 24, 21, 0.08);
      border-radius: 4mm;
      box-shadow:
        0 4mm 10mm rgba(43, 34, 25, 0.08),
        inset 0 0 0 0.35mm rgba(255, 255, 255, 0.9);
      overflow: hidden;
      break-after: page;
      page-break-after: always;
      position: relative;
    }
    .npw-doc--continuation {
      padding-top: 6mm;
    }
    .npw-doc:last-child {
      margin-bottom: 0;
      break-after: auto;
      page-break-after: auto;
    }
    .npw-doc::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 1.4mm;
      background: linear-gradient(90deg, #1b1a18 0%, #3a352f 55%, #1b1a18 100%);
    }
    .npw-header {
      display: grid;
      grid-template-columns: 29mm minmax(0, 1fr);
      gap: 5.8mm;
      align-items: start;
      padding: 3mm 3.3mm 3.2mm;
      border-radius: 3.2mm;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(245, 240, 234, 0.96) 100%);
      border: 0.3mm solid rgba(27, 24, 21, 0.07);
    }
    .npw-logoWrap {
      display: flex;
      justify-content: flex-start;
      padding-top: 0.8mm;
    }
    .npw-logoFrame {
      width: 24.8mm;
      height: 24.8mm;
      border: 0.7mm solid #111;
      border-radius: 2.3mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #ffffff 0%, #f5f2ee 100%);
      box-shadow:
        0 1.4mm 3mm rgba(33, 27, 20, 0.10),
        inset 0 0 0 0.3mm rgba(255,255,255,0.9);
    }
    .npw-logoFrame img {
      width: 21.8mm;
      height: 21.8mm;
      object-fit: contain;
      filter: grayscale(1);
    }
    .npw-headerMain {
      min-width: 0;
    }
    .npw-topline {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 3mm;
      align-items: end;
    }
    .npw-topLeft {
      min-width: 0;
    }
    .npw-topRight {
      font-size: 6.2mm;
      line-height: 1.05;
      font-weight: 400;
      color: #26221e;
      text-align: right;
      white-space: nowrap;
      padding-bottom: 1mm;
    }
    .npw-serial {
      color: #7d6244;
      font-size: 3.8mm;
      margin-bottom: 0.7mm;
      letter-spacing: 0.03em;
    }
    .npw-title {
      margin: 0;
      font-size: 6.2mm;
      line-height: 1.02;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #171513;
      position: relative;
      top: -1.4mm;
    }
    .npw-headDivider {
      margin-top: 1.8mm;
      border-top: 0.3mm solid rgba(84, 72, 58, 0.7);
    }
    .npw-bottomline {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 5.5mm;
      align-items: start;
      margin-top: 2mm;
    }
    .npw-client {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 3.2mm;
    }
    .npw-clientInfo {
      min-width: 0;
      padding-right: 1mm;
    }
    .npw-clientName {
      font-size: 4.8mm;
      line-height: 1.06;
      font-weight: 500;
      color: #1d1916;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      letter-spacing: 0.03em;
    }
    .npw-clientPhone {
      font-size: 4.5mm;
      line-height: 1.08;
      font-weight: 400;
      color: #222;
      margin-top: 0.9mm;
      letter-spacing: 0.01em;
      text-align: left;
    }
    .npw-vendedor {
      font-size: 3.8mm;
      line-height: 1.08;
      font-weight: 700;
      color: #6f614f;
      margin-top: 0.8mm;
      text-align: left;
    }
    .npw-clientDivider {
      width: 0.3mm;
      align-self: stretch;
      background: rgba(96, 82, 65, 0.72);
      min-height: 16.5mm;
    }
    .npw-delivery {
      display: flex;
      align-items: baseline;
      gap: 1.3mm;
      padding-top: 2mm;
      white-space: nowrap;
    }
    .npw-deliveryLabel {
      font-size: 4.6mm;
      line-height: 1;
      font-weight: 400;
      color: #1f1f1f;
    }
    .npw-deliveryValue {
      font-size: 5.3mm;
      line-height: 1;
      font-weight: 900;
      color: #171513;
    }
    .npw-tableCard {
      margin-top: 3.5mm;
      border-radius: 3.4mm;
      overflow: hidden;
      background: rgba(255,255,255,0.95);
      border: 0.3mm solid rgba(28, 25, 22, 0.08);
      box-shadow: 0 2.2mm 5.5mm rgba(41, 31, 23, 0.05);
    }
    .npw-doc--continuation .npw-tableCard {
      margin-top: 0;
    }
    .npw-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    .npw-table thead th {
      background: linear-gradient(180deg, #181614 0%, #050505 100%);
      color: #fff;
      padding: 1.8mm 2mm;
      font-size: 3.4mm;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-align: center;
    }
    .npw-table thead th:nth-child(2),
    .npw-table tbody td:nth-child(2) {
      text-align: left;
    }
    .npw-table tbody td {
      padding: 2mm 2.2mm;
      font-size: 4mm;
      font-weight: 700;
      color: #4a4a4a;
      text-align: center;
      border-bottom: 0.28mm solid rgba(60, 48, 37, 0.08);
    }
    .npw-table tbody tr.is-alt td {
      background: linear-gradient(180deg, #f7f4f0 0%, #f1efec 100%);
    }
    .npw-table tbody tr:last-child td {
      border-bottom: 0;
    }
    .npw-table .empty {
      text-align: center !important;
      background: #f7f7f7;
      padding: 4mm !important;
    }
    .npw-summary {
      width: 101.5mm;
      margin-left: auto;
      margin-top: 2mm;
      padding: 2mm 2.8mm 2mm;
      border-radius: 3.2mm;
      background: linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(247,243,238,0.97) 100%);
      border: 0.3mm solid rgba(28, 25, 22, 0.08);
      box-shadow: 0 2.2mm 5.5mm rgba(41, 31, 23, 0.05);
    }
    .npw-summaryRow,
    .npw-summaryTotal {
      display: grid;
      align-items: center;
    }
    .npw-summaryRow {
      grid-template-columns: 1fr auto;
      gap: 2.5mm;
      padding: 0.9mm 0;
      font-size: 4mm;
      color: #35302b;
    }
    .npw-summaryRow strong {
      font-size: 4mm;
      color: #23201c;
    }
    .npw-summaryRow.discount {
      grid-template-columns: 1fr auto;
      font-size: 3.6mm;
      color: #7a6a5a;
    }
    .npw-summaryRow.status {
      margin-top: 0.4mm;
      padding: 1.1mm 0;
      border-top: 0.25mm solid rgba(63, 54, 44, 0.16);
      grid-template-columns: auto 1fr auto;
      gap: 2mm;
    }
    .npw-statusBadge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      padding: 0;
      border-radius: 999px;
      background: transparent;
      border: 0;
      color: #23201c;
      font-size: 4.4mm;
      font-weight: 900;
      letter-spacing: 0;
    }
    .npw-divider {
      border-top: 0.35mm solid rgba(63, 54, 44, 0.42);
      margin: 0.8mm 0 1.2mm;
    }
    .npw-summaryTotal {
      grid-template-columns: 1fr auto;
      gap: 2.5mm;
      margin-top: 1.2mm;
      padding: 2.2mm 2.8mm;
      border-radius: 2.4mm;
      background: linear-gradient(180deg, #171513 0%, #050505 100%);
      color: #fff;
      font-size: 4.5mm;
      font-weight: 900;
      box-shadow: inset 0 0 0 0.25mm rgba(255,255,255,0.06);
    }
    .npw-footer {
      position: absolute;
      left: 6.5mm;
      right: 6.5mm;
      bottom: 5.2mm;
      padding-top: 2.4mm;
      border-top: 0.28mm solid rgba(72, 61, 49, 0.14);
      text-align: center;
      font-size: 4.2mm;
      letter-spacing: 0.05em;
      color: #6d6359;
    }
    .npw-pageMark {
      position: absolute;
      left: 6.5mm;
      right: 6.5mm;
      bottom: 1.8mm;
      text-align: center;
      font-size: 3.1mm;
      font-weight: 800;
      letter-spacing: 0.03em;
      color: #6d6359;
    }
    @media print {
      html, body {
        background: #fff !important;
      }
      .npw-doc {
        margin: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #fff !important;
      }
      .npw-doc::before {
        height: 1mm !important;
      }
      .npw-header,
      .npw-tableCard,
      .npw-summary {
        box-shadow: none !important;
      }
    }
  `;
}

function buildDocPage(data, items, { showSummary, showFooter, isFirstPage, pageNumber, pageCount }) {
  const rows = buildRows(items, data.showPrices);
  return `
    <div class="npw-doc${isFirstPage ? "" : " npw-doc--continuation"}">
      ${
        isFirstPage
          ? `
            <div class="npw-header">
              <div class="npw-logoWrap">
                <div class="npw-logoFrame">
                  <img src="${window.location.origin}/logo-linea-gris.png" alt="Sur Maderas" />
                </div>
              </div>

              <div class="npw-headerMain">
                <div class="npw-topline">
                  <div class="npw-topLeft">
                    <div class="npw-serial">N ${escapeHtml(getPreviewNumber(data.numero))}</div>
                    <h1 class="npw-title">Nota de Pedido</h1>
                  </div>
                  <div class="npw-topRight">${escapeHtml(fmtDate(data.fecha))}</div>
                </div>

                <div class="npw-headDivider"></div>

                <div class="npw-bottomline">
                  <div class="npw-client">
                    <div class="npw-clientInfo">
                      <div class="npw-clientName">${
                        data.showClientDetails
                          ? escapeHtml(data.clienteNombre || "Consumidor final")
                          : escapeHtml(data.providerName || "Uso para proveedor")
                      }</div>
                      ${
                        data.showClientDetails
                          ? `<div class="npw-clientPhone">${escapeHtml(formatPhonePreview(data.clienteTelefono))}</div>`
                          : ""
                      }
                      ${
                        data.vendedor
                          ? `<div class="npw-vendedor">Vendedor: ${escapeHtml(data.vendedor)}</div>`
                          : ""
                      }
                    </div>
                    <div class="npw-clientDivider" aria-hidden="true"></div>
                  </div>

                  <div class="npw-delivery">
                    <span class="npw-deliveryLabel">Entrega:</span>
                    <span class="npw-deliveryValue">${escapeHtml(fmtDate(data.entrega))}</span>
                  </div>
                </div>
              </div>
            </div>
          `
          : ""
      }

      <div class="npw-tableCard">
        <table class="npw-table">
          <thead>
            <tr>
              <th>#</th>
              <th>DESCRIPCI&Oacute;N</th>
              ${data.showPrices ? "<th>PRECIO</th>" : ""}
              <th>CANTIDAD</th>
              ${data.showPrices ? "<th>TOTAL</th>" : ""}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      ${
        showSummary && data.showPrices
          ? `
            <div class="npw-summary">
              <div class="npw-summaryRow">
                <span>Subtotal</span>
                <strong>$${escapeHtml(toARS(data.subtotal))}</strong>
              </div>
              ${
                data.descuentoMonto > 0
                  ? `
                    <div class="npw-divider"></div>
                    <div class="npw-summaryRow discount">
                      <span>Descuento ${escapeHtml(toARS(data.descuentoPct))}%</span>
                      <strong>- $${escapeHtml(toARS(data.descuentoMonto))}</strong>
                    </div>
                  `
                  : ""
              }
              ${
                data.estadoCajaLabel
                  ? `
                    <div class="npw-summaryRow status">
                      <span>Estado</span>
                      <strong><span class="npw-statusBadge">${escapeHtml(data.estadoCajaLabel)}</span></strong>
                      ${
                        data.estadoCajaLabel === "Señada" && data.montoCaja > 0
                          ? `<strong>$${escapeHtml(toARS(data.montoCaja))}</strong>`
                          : ""
                      }
                    </div>
                  `
                  : ""
              }
              <div class="npw-summaryTotal">
                <span>${data.estaSenada ? "SALDO" : "TOTAL"}</span>
                <strong>$${escapeHtml(toARS(data.total))}</strong>
              </div>
            </div>
          `
          : ""
      }

      ${showFooter ? `<div class="npw-footer">surmaderas.com.ar - surmaderasmdp@gmail.com - 223 438 3262</div>` : ""}
      <div class="npw-pageMark">Hoja ${pageNumber} de ${pageCount}</div>
    </div>
  `;
}

export function buildNotaPedidoPrintMarkup(data) {
  const pages = paginatePreviewItems(data.previewItems || []);
  return `
    <div class="npw-pages">
      ${pages
        .map((pageItems, index) =>
          buildDocPage(data, pageItems, {
            showSummary: index === pages.length - 1,
            showFooter: index === pages.length - 1,
            isFirstPage: index === 0,
            pageNumber: index + 1,
            pageCount: pages.length,
          })
        )
        .join("")}
    </div>
  `;
}

export function buildNotaPedidoPrintHtml(data) {
  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Nota de pedido ${escapeHtml(data.numero || "")}</title>
        <style>${buildStyles()}</style>
      </head>
      <body>${buildNotaPedidoPrintMarkup(data)}</body>
    </html>`;
}

async function waitForImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

async function waitForFonts() {
  if (!document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    // Ignore font loading errors and continue with available fonts.
  }
}

export async function generateNotaPedidoImageFile(data) {
  const widthPx = Math.round(NOTE_WIDTH_MM * CSS_PX_PER_MM);
  const pageCount = getNotaPedidoPageCount(data);
  const heightPx = Math.round(NOTE_HEIGHT_MM * CSS_PX_PER_MM * pageCount);
  const renderScale = Math.max(3, Math.min(4, Math.ceil(window.devicePixelRatio || 1)));

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${widthPx}px`;
  host.style.height = `${heightPx}px`;
  host.style.background = "#fff";
  host.style.zIndex = "-1";
  host.innerHTML = `<style>${buildStyles()}</style>${buildNotaPedidoPrintMarkup(data)}`;
  document.body.appendChild(host);

  try {
    const node = host.querySelector(".npw-pages");
    node.style.width = `${widthPx}px`;
    node.style.height = `${heightPx}px`;
    await waitForFonts();
    await waitForImages(host);

    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: renderScale,
      useCORS: true,
      logging: false,
      width: widthPx,
      height: heightPx,
      windowWidth: widthPx,
      windowHeight: heightPx,
    });

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("No se pudo generar la imagen de la nota"));
      }, "image/png");
    });

    return new File([blob], `nota-${getPreviewNumber(data.numero).replace(/[^\w-]+/g, "_")}.png`, {
      type: "image/png",
    });
  } finally {
    host.remove();
  }
}

export function openNotaPedidoPrintWindow(data) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    window.alert("El navegador bloqueo la ventana de impresion. Habilita ventanas emergentes e intenta de nuevo.");
    return;
  }

  const html = buildNotaPedidoPrintHtml(data);
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

export function openWhatsappText(phone, message) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function copyFileToClipboard(file) {
  if (!(navigator.clipboard && window.ClipboardItem)) return false;
  try {
    await navigator.clipboard.write([new window.ClipboardItem({ [file.type]: file })]);
    return true;
  } catch {
    return false;
  }
}

export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareFileWithText({ file, title, text }) {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      text,
      files: [file],
    });
    return "shared";
  }

  const copied = await copyFileToClipboard(file);
  downloadFile(file);
  return copied ? "downloaded_and_copied" : "downloaded";
}
