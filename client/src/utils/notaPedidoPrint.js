import html2canvas from "html2canvas";

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
    .replace(/"/g, "&quot;")
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
    clienteDireccion: cliente?.direccion || "Todos los datos que sean necesarios",
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
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #111; }
    body { width: 100%; margin: 0; }
    .npw-doc {
      position: relative;
      overflow: hidden;
      width: 200mm;
      height: 145mm;
      margin: 0;
      padding: 4mm 5mm 3mm;
      background: #fff;
    }
    .npw-watermark {
      position: absolute;
      inset: 15mm auto auto 8mm;
      color: rgba(90, 90, 90, 0.08);
      line-height: 0.8;
      font-weight: 800;
      user-select: none;
      pointer-events: none;
    }
    .npw-watermark .year { font-size: 132mm; letter-spacing: -0.07em; }
    .npw-watermark .brand { margin-left: 48mm; margin-top: -12mm; font-size: 40mm; font-family: "Brush Script MT", "Segoe Script", cursive; }
    .npw-header {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 30mm minmax(0, 1fr);
      gap: 6mm;
      align-items: start;
    }
    .npw-serial { font-size: 10.5pt; color: #3f3f3f; margin-bottom: 1mm; }
    .npw-title { margin: 0; font-size: 25pt; line-height: 0.95; font-weight: 900; letter-spacing: -0.04em; }
    .npw-date-line { display: flex; align-items: center; gap: 3mm; margin-top: 1.5mm; }
    .npw-alert {
      width: 13mm; height: 13mm; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      background: #111; color: #fff; font-size: 24pt; font-weight: 900;
    }
    .npw-delivery { font-size: 30pt; line-height: 1; font-weight: 900; letter-spacing: -0.05em; }
    .npw-order-day { margin-top: 2mm; font-size: 12pt; line-height: 1.2; }
    .npw-logo-wrap { display: flex; justify-content: center; }
    .npw-logo-frame {
      width: 30mm; height: 30mm; border: 1mm solid #111; border-radius: 3mm;
      display: flex; align-items: center; justify-content: center; background: #fff;
    }
    .npw-logo-frame img { width: 19mm; object-fit: contain; filter: grayscale(1); }
    .npw-client-label { font-size: 12pt; letter-spacing: 0.08em; color: #2f2f2f; }
    .npw-client-name { margin-top: 1mm; font-size: 21pt; line-height: 1; font-weight: 900; }
    .npw-client-meta, .npw-client-address { margin-top: 1.5mm; font-size: 11pt; line-height: 1.2; }
    .npw-client-address { font-weight: 700; }
    .npw-table { position: relative; z-index: 1; width: 100%; border-collapse: collapse; margin-top: 5mm; }
    .npw-table thead th {
      background: #4b4948; color: #fff; padding: 3.2mm 2.5mm; font-size: 9pt;
      font-weight: 800; letter-spacing: 0.06em; text-align: center;
    }
    .npw-table thead th:nth-child(2), .npw-table tbody td:nth-child(2) { text-align: left; }
    .npw-table tbody td {
      padding: 3mm 2.5mm; font-size: 10pt; font-weight: 700; color: #464646;
      text-align: center; border-bottom: 1.6mm solid transparent;
    }
    .npw-table tbody tr.is-alt td { background: #f1f1f1; }
    .npw-table .empty { text-align: center !important; background: #f7f7f7; padding: 4mm !important; }
    .npw-summary { position: relative; z-index: 1; width: 95mm; margin-left: auto; margin-top: 2mm; }
    .npw-summary-row, .npw-summary-total { display: grid; align-items: center; }
    .npw-summary-row { grid-template-columns: 1fr auto; gap: 2.5mm; padding: 1.2mm 0; font-size: 10pt; color: #414141; }
    .npw-summary-row strong { font-size: 10pt; }
    .npw-summary-row.discount { grid-template-columns: 1fr auto auto; font-size: 7.6pt; }
    .npw-divider { border-top: 0.5mm solid #626262; margin: 1mm 0 1.5mm; }
    .npw-summary-total {
      grid-template-columns: 1fr auto; gap: 2.5mm; margin-top: 1.8mm;
      padding: 3.4mm 3.6mm; background: #4b4948; color: #fff; font-size: 15pt; font-weight: 900;
    }
    .npw-footer {
      position: relative; z-index: 1; margin-top: 4mm; text-align: center;
      font-size: 8.5pt; letter-spacing: 0.05em; color: #595959;
    }
  `;
}

export function buildNotaPedidoPrintMarkup(data) {
  const rows = buildRows(data.previewItems || []);
  return `
    <div class="npw-doc">
      <div class="npw-watermark" aria-hidden="true">
        <div class="year">${escapeHtml(new Date(data.fecha || Date.now()).getFullYear())}</div>
        <div class="brand">Sur</div>
      </div>

      <div class="npw-header">
        <div>
          <div class="npw-serial">N° ${escapeHtml(getPreviewNumber(data.numero))}</div>
          <h1 class="npw-title">Nota de Pedido</h1>
          <div class="npw-date-line">
            <span class="npw-alert">!</span>
            <span class="npw-delivery">${escapeHtml(fmtDate(data.entrega))}</span>
          </div>
          <div class="npw-order-day">DIA DEL PEDIDO:<br />${escapeHtml(fmtDate(data.fecha))}</div>
        </div>

        <div class="npw-logo-wrap">
          <div class="npw-logo-frame">
            <img src="${window.location.origin}/logo-linea-gris.png" alt="Sur Maderas" />
          </div>
        </div>

        <div>
          <div class="npw-client-label">CLIENTE</div>
          <div class="npw-client-name">${escapeHtml(data.clienteNombre || "Consumidor final")}</div>
          <div class="npw-client-meta"><strong>Teléfono:</strong> ${escapeHtml(formatPhonePreview(data.clienteTelefono))}</div>
          <div class="npw-client-meta"><strong>Dirección:</strong></div>
          <div class="npw-client-address">${escapeHtml(data.clienteDireccion || "Todos los datos que sean necesarios")}</div>
        </div>
      </div>

      <table class="npw-table">
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

      <div class="npw-summary">
        <div class="npw-summary-row">
          <span>Subtotal</span>
          <strong>$${escapeHtml(toARS(data.subtotal))}</strong>
        </div>
        <div class="npw-divider"></div>
        <div class="npw-summary-row discount">
          <span>Descuento (si hay)</span>
          <strong>${data.descuentoMonto > 0 ? `${escapeHtml(toARS(data.descuentoPct))}%` : "-"}</strong>
          <strong>$${escapeHtml(toARS(data.descuentoMonto))}</strong>
        </div>
        <div class="npw-summary-total">
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
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "200mm";
  host.style.background = "#fff";
  host.style.zIndex = "-1";
  host.innerHTML = `<style>${buildStyles()}</style>${buildNotaPedidoPrintMarkup(data)}`;
  document.body.appendChild(host);

  try {
    const node = host.querySelector(".npw-doc");
    await waitForImages(host);

    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      width: node.scrollWidth,
      height: node.scrollHeight,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
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
    window.alert("El navegador bloqueo la ventana de impresión. Habilitá ventanas emergentes e intentá de nuevo.");
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
