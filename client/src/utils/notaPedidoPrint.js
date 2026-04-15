import html2canvas from "html2canvas";

const NOTE_WIDTH_MM = 200;
const NOTE_HEIGHT_MM = 145;
const CSS_PX_PER_MM = 96 / 25.4;

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

export function buildNotaPedidoPrintData(nota) {
  const cliente = nota?.cliente || {};
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

  const subtotal = Number(nota?.totales?.subtotal ?? nota?.total ?? 0);
  const descuentoMonto = Number(nota?.totales?.descuento ?? 0);
  const total = Number(nota?.totales?.total ?? nota?.total ?? 0);
  const descuentoPct = subtotal > 0 ? (descuentoMonto / subtotal) * 100 : 0;

  return {
    numero: nota?.numero || "",
    fecha: nota?.fecha || "",
    entrega: nota?.entrega || "",
    clienteNombre: cliente?.nombre || "Consumidor final",
    clienteTelefono: cliente?.telefono || "",
    vendedor: nota?.vendedor || "",
    subtotal,
    descuentoMonto,
    descuentoPct,
    total,
    previewItems: items,
  };
}

function buildRows(previewItems) {
  if (!previewItems.length) {
    return `
      <tr>
        <td colspan="5" class="empty">Sin items cargados.</td>
      </tr>
    `;
  }

  return previewItems
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
    .join("");
}

function buildStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: "Montserrat", Arial, Helvetica, sans-serif; color: #111; }
    body { width: 100%; margin: 0; }
    .npw-doc {
      width: 200mm;
      height: 145mm;
      margin: 0;
      padding: 4.5mm 6.5mm 3mm;
      background: #fff;
      overflow: hidden;
    }
    .npw-header {
      display: grid;
      grid-template-columns: 29mm minmax(0, 1fr);
      gap: 5.8mm;
      align-items: start;
    }
    .npw-logoWrap {
      display: flex;
      justify-content: flex-start;
      padding-top: 1.5mm;
    }
    .npw-logoFrame {
      width: 24.8mm;
      height: 24.8mm;
      border: 0.7mm solid #111;
      border-radius: 2.3mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }
    .npw-logoFrame img {
      width: 16.6mm;
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
      color: #1d1d1d;
      text-align: right;
      white-space: nowrap;
      padding-bottom: 1mm;
    }
    .npw-serial {
      color: #3c3c3c;
      font-size: 3.8mm;
      margin-bottom: 0.7mm;
      letter-spacing: 0.01em;
    }
    .npw-title {
      margin: 0;
      font-size: 6.9mm;
      line-height: 0.97;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .npw-headDivider {
      margin-top: 1.2mm;
      border-top: 0.3mm solid #6c6c6c;
    }
    .npw-bottomline {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 5.5mm;
      align-items: start;
      margin-top: 1.5mm;
    }
    .npw-client {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 3.2mm;
    }
    .npw-clientInfo {
      min-width: 0;
    }
    .npw-clientName {
      font-size: 5.2mm;
      line-height: 1.06;
      font-weight: 500;
      color: #111;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.03em;
    }
    .npw-clientPhone {
      font-size: 4.8mm;
      line-height: 1.08;
      font-weight: 400;
      color: #222;
      margin-top: 0.5mm;
      letter-spacing: 0.01em;
      text-align: center;
    }
    .npw-clientDivider {
      width: 0.3mm;
      align-self: stretch;
      background: #6a6a6a;
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
      color: #111;
    }
    .npw-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6.9mm;
    }
    .npw-table thead th {
      background: #040404;
      color: #fff;
      padding: 2.9mm 2.5mm;
      font-size: 4.1mm;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-align: center;
    }
    .npw-table thead th:nth-child(2),
    .npw-table tbody td:nth-child(2) {
      text-align: left;
    }
    .npw-table tbody td {
      padding: 2.8mm 2.5mm;
      font-size: 4.75mm;
      font-weight: 700;
      color: #4a4a4a;
      text-align: center;
      border-bottom: 1mm solid transparent;
    }
    .npw-table tbody tr.is-alt td {
      background: #f3f3f3;
    }
    .npw-table .empty {
      text-align: center !important;
      background: #f7f7f7;
      padding: 4mm !important;
    }
    .npw-summary {
      width: 101.5mm;
      margin-left: auto;
      margin-top: 1.6mm;
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
      font-size: 4.9mm;
      color: #414141;
    }
    .npw-summaryRow strong {
      font-size: 4.9mm;
    }
    .npw-summaryRow.discount {
      grid-template-columns: 1fr auto auto;
      font-size: 3.1mm;
    }
    .npw-divider {
      border-top: 0.35mm solid #626262;
      margin: 0.8mm 0 1.2mm;
    }
    .npw-summaryTotal {
      grid-template-columns: 1fr auto;
      gap: 2.5mm;
      margin-top: 1.4mm;
      padding: 2.8mm 3mm;
      background: #040404;
      color: #fff;
      font-size: 4.9mm;
      font-weight: 900;
    }
    .npw-footer {
      margin-top: 13.8mm;
      text-align: center;
      font-size: 4.2mm;
      letter-spacing: 0.05em;
      color: #595959;
    }
  `;
}

export function buildNotaPedidoPrintMarkup(data) {
  const rows = buildRows(data.previewItems || []);
  return `
    <div class="npw-doc">
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
                <div class="npw-clientName">${escapeHtml(data.clienteNombre || "Consumidor final")}</div>
                <div class="npw-clientPhone">${escapeHtml(formatPhonePreview(data.clienteTelefono))}</div>
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

      <table class="npw-table">
        <thead>
          <tr>
            <th>#</th>
            <th>DESCRIPCI&Oacute;N</th>
            <th>PRECIO</th>
            <th>CANTIDAD</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="npw-summary">
        <div class="npw-summaryRow">
          <span>Subtotal</span>
          <strong>$${escapeHtml(toARS(data.subtotal))}</strong>
        </div>
        <div class="npw-divider"></div>
        <div class="npw-summaryRow discount">
          <span>Descuento (si hay)</span>
          <strong>${data.descuentoMonto > 0 ? `${escapeHtml(toARS(data.descuentoPct))}%` : "-"}</strong>
          <strong>$${escapeHtml(toARS(data.descuentoMonto))}</strong>
        </div>
        <div class="npw-summaryTotal">
          <span>TOTAL</span>
          <strong>$${escapeHtml(toARS(data.total))}</strong>
        </div>
      </div>

      <div class="npw-footer">surmaderas.com.ar - surmaderasmdp@gmail.com - 223 438 3262</div>
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

export async function generateNotaPedidoImageFile(data) {
  const widthPx = Math.round(NOTE_WIDTH_MM * CSS_PX_PER_MM);
  const heightPx = Math.round(NOTE_HEIGHT_MM * CSS_PX_PER_MM);
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
    const node = host.querySelector(".npw-doc");
    node.style.width = `${widthPx}px`;
    node.style.height = `${heightPx}px`;
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
