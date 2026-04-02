import jsPDF from "jspdf";

function loadImageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo preparar el logo"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("No se pudo cargar el logo"));
    img.src = src;
  });
}

function formatFecha(fecha) {
  if (!fecha) return "-";
  const value = String(fecha);
  if (value.includes("-") && value.length <= 10) {
    const [yyyy, mm, dd] = value.split("-");
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-AR");
}

function normalizeWhatsapp(telefono = "") {
  const digits = String(telefono || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("54") ? digits : `54${digits}`;
}

function buildItems(pedido) {
  return Array.isArray(pedido?.items) ? pedido.items : [];
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function isLarProvider(pedido) {
  return normalizeText(pedido?.proveedorNombre).includes("LAR");
}

function parseSectionedItems(pedido) {
  const sections = [];
  const map = new Map();

  const ensureSection = (title) => {
    const key = title || "DETALLE DEL PEDIDO";
    if (!map.has(key)) {
      const section = { title: key, rows: [] };
      map.set(key, section);
      sections.push(section);
    }
    return map.get(key);
  };

  buildItems(pedido).forEach((item) => {
    const rawDescripcion = String(item?.descripcion || "").trim();
    const cantidad = Number(item?.cantidad || 0);
    const unidad = String(item?.unidad || "").trim();

    const parts = rawDescripcion.split(/\s(?:\||::|:|>|\/)\s/);
    const hasSection = parts.length > 1;
    const title = hasSection ? parts[0].trim() : "DETALLE DEL PEDIDO";
    const descripcion = hasSection ? parts.slice(1).join(" - ").trim() : rawDescripcion;

    ensureSection(title).rows.push({
      descripcion: descripcion || rawDescripcion || "ITEM",
      cantidad: cantidad > 0 ? cantidad : "",
      unidad,
    });
  });

  if (!sections.length) {
    sections.push({ title: "DETALLE DEL PEDIDO", rows: [] });
  }

  return sections;
}

function drawLarTable(doc, section, layout) {
  const { margin, pageWidth, pageHeight } = layout;
  const tableWidth = pageWidth - margin * 2;
  const firstColWidth = tableWidth * 0.58;
  const secondColWidth = tableWidth - firstColWidth;
  const rowHeight = 9;
  const totalRows = Math.max(1, section.rows.length);

  const ensureSpace = (neededHeight) => {
    if (layout.y + neededHeight <= pageHeight - 18) return;
    doc.addPage();
    layout.y = 18;
  };

  ensureSpace(rowHeight * (totalRows + 2) + 18);

  doc.setDrawColor(34, 34, 34);
  doc.setLineWidth(0.5);
  doc.setFillColor(229, 229, 229);
  doc.rect(margin, layout.y, tableWidth, rowHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(section.title, margin + tableWidth / 2, layout.y + 6.2, { align: "center" });
  layout.y += rowHeight;

  const leftHeader = normalizeText(section.title).includes("HOJAS ENTERAS") ? "MADERA/ESPESOR" : "";
  doc.setFillColor(242, 242, 242);
  doc.rect(margin, layout.y, firstColWidth, rowHeight, "FD");
  doc.rect(margin + firstColWidth, layout.y, secondColWidth, rowHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  if (leftHeader) {
    doc.text(leftHeader, margin + 2, layout.y + 6.2);
  }
  doc.text("CANTIDAD DE HOJAS", margin + firstColWidth + secondColWidth / 2, layout.y + 6.2, { align: "center" });
  layout.y += rowHeight;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (let index = 0; index < totalRows; index += 1) {
    const row = section.rows[index];
    doc.rect(margin, layout.y, firstColWidth, rowHeight);
    doc.rect(margin + firstColWidth, layout.y, secondColWidth, rowHeight);

    if (row) {
      doc.text(String(row.descripcion || ""), margin + 2, layout.y + 6.2);
      if (row.cantidad !== "") {
        doc.setFont("helvetica", "bold");
        doc.text(String(row.cantidad), margin + firstColWidth + secondColWidth / 2, layout.y + 6.2, { align: "center" });
        doc.setFont("helvetica", "normal");
      }
    }

    layout.y += rowHeight;
  }

  layout.y += 14;
}

async function openPedidoProveedorPdfLar(pedido) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const layout = { y: 18, margin, pageWidth, pageHeight };

  const tableWidth = pageWidth - margin * 2;

  doc.setFillColor(55, 44, 34);
  doc.roundedRect(margin, layout.y, tableWidth, 34, 5, 5, "F");
  doc.setFillColor(216, 196, 167);
  doc.roundedRect(margin, layout.y + 27, tableWidth, 7, 0, 0, "F");

  try {
    const logoDataUrl = await loadImageAsDataUrl("/logo-sur-maderas.png");
    doc.addImage(logoDataUrl, "PNG", margin + 6, layout.y + 4, 24, 24);
  } catch {
    doc.setFillColor(55, 44, 34);
    doc.setDrawColor(255, 253, 248);
    doc.circle(margin + 18, layout.y + 16, 9, "FD");
    doc.setTextColor(255, 253, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SM", margin + 13.7, layout.y + 18.4);
  }

  doc.setTextColor(255, 253, 248);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PEDIDO SUR MADERAS", margin + 34, layout.y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Documento oficial de pedido para proveedor", margin + 34, layout.y + 16);
  doc.setFontSize(8.5);
  doc.text(`Fecha de pedido: ${formatFecha(pedido?.fechaPedido)}`, margin + 34, layout.y + 22);
  doc.text(`Tipo: ${pedido?.tipo || "-"}`, pageWidth - margin - 4, layout.y + 22, { align: "right" });
  doc.setTextColor(55, 44, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SUR MADERAS", margin + 4, layout.y + 31.8);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion interna", pageWidth - margin - 4, layout.y + 31.8, { align: "right" });

  layout.y += 36;

  doc.setDrawColor(28, 28, 28);
  doc.setLineWidth(0.7);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, layout.y, tableWidth, 10, "FD");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(13);
  doc.text(String(pedido?.proveedorNombre || "LAR").toUpperCase(), margin + tableWidth / 2, layout.y + 6.8, { align: "center" });
  layout.y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 78, 66);
  doc.text(`Proveedor: ${pedido?.proveedorNombre || "-"}`, margin, layout.y);
  doc.text(`Estado: ${pedido?.estado || "Pendiente"}`, pageWidth - margin, layout.y, { align: "right" });
  layout.y += 10;

  parseSectionedItems(pedido).forEach((section) => {
    drawLarTable(doc, section, layout);
  });

  if (pedido?.observacion) {
    if (layout.y > pageHeight - 45) {
      doc.addPage();
      layout.y = 18;
    }
    doc.setDrawColor(210, 201, 192);
    doc.setFillColor(250, 246, 240);
    doc.roundedRect(margin, layout.y - 2, tableWidth, 24, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(55, 44, 34);
    doc.text("OBSERVACIONES", margin + 3, layout.y + 3);
    layout.y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(pedido.observacion), tableWidth);
    doc.setTextColor(85, 74, 63);
    doc.text(lines, margin + 3, layout.y);
  }

  doc.setDrawColor(190, 178, 166);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 98, 87);
  doc.text("Sur Maderas · Documento emitido desde gestion interna", margin, pageHeight - 9);
  doc.text("Uso interno / Proveedor", pageWidth - margin, pageHeight - 9, { align: "right" });

  const fileName = `pedido-lar-${formatFecha(pedido?.fechaPedido).replace(/\//g, "-")}.pdf`.toLowerCase();
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  doc.save(fileName);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function buildPedidoProveedorWhatsappMessage(pedido, proveedor) {
  const items = buildItems(pedido);
  const detalle = items
    .map((item) => {
      const descripcion = String(item?.descripcion || "Item").trim();
      const cantidad = Number(item?.cantidad || 0);
      const unidad = String(item?.unidad || "").trim();
      return `- ${descripcion}${cantidad > 0 ? ` x${cantidad}` : ""}${unidad ? ` ${unidad}` : ""}`;
    })
    .join("\n");

  return [
    `Hola ${proveedor?.contacto || proveedor?.nombre || pedido?.proveedorNombre || ""}, te enviamos el pedido.`,
    "",
    `Proveedor: ${pedido?.proveedorNombre || proveedor?.nombre || "-"}`,
    `Tipo: ${pedido?.tipo || "-"}`,
    `Fecha: ${formatFecha(pedido?.fechaPedido)}`,
    "",
    "Detalle:",
    detalle || "- Sin items cargados",
    pedido?.observacion ? `\nObservacion:\n${pedido.observacion}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function openPedidoProveedorWhatsapp(pedido, proveedor) {
  const telefono = normalizeWhatsapp(proveedor?.telefono);
  if (!telefono) return false;

  const message = buildPedidoProveedorWhatsappMessage(pedido, proveedor);
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function openPedidoProveedorPdf(pedido) {
  if (isLarProvider(pedido)) {
    await openPedidoProveedorPdfLar(pedido);
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = 18;

  const writeLine = (text, opts = {}) => {
    const {
      size = 11,
      weight = "normal",
      color = [46, 38, 30],
      gapAfter = 6,
      indent = 0,
    } = opts;
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ""), pageWidth - margin * 2 - indent);
    lines.forEach((line) => {
      if (y > pageHeight - 18) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin + indent, y);
      y += size * 0.42 + 1.5;
    });
    y += gapAfter - 2;
  };

  doc.setFillColor(55, 44, 34);
  doc.roundedRect(margin, 12, pageWidth - margin * 2, 34, 6, 6, "F");

  try {
    const logoDataUrl = await loadImageAsDataUrl("/logo-sur-maderas.png");
    doc.addImage(logoDataUrl, "PNG", margin + 5, 16, 24, 24);
  } catch {
    doc.setFillColor(255, 253, 248);
    doc.circle(margin + 17, 28, 9, "F");
    doc.setTextColor(55, 44, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SM", margin + 13.5, 30.5);
  }

  doc.setTextColor(255, 253, 248);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Pedido de Sur Maderas", margin + 34, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Documento interno para proveedor", margin + 34, 30);
  doc.text(`Fecha de pedido: ${formatFecha(pedido?.fechaPedido)}`, margin + 34, 36);

  y = 56;

  doc.setDrawColor(219, 209, 198);
  doc.setFillColor(252, 248, 242);
  doc.roundedRect(margin, y - 2, pageWidth - margin * 2, 28, 4, 4, "FD");
  writeLine(`Proveedor: ${pedido?.proveedorNombre || "-"}`, { size: 12, weight: "bold", gapAfter: 3 });
  writeLine(`Tipo de pedido: ${pedido?.tipo || "-"}`, { size: 10, color: [96, 84, 72], gapAfter: 3 });
  writeLine(`Estado: ${pedido?.estado || "Pendiente"}`, { size: 10, color: [96, 84, 72], gapAfter: 7 });

  writeLine("Detalle del pedido", { size: 14, weight: "bold", gapAfter: 6 });
  buildItems(pedido).forEach((item, index) => {
    const descripcion = String(item?.descripcion || "Item").trim();
    const cantidad = Number(item?.cantidad || 0);
    const unidad = String(item?.unidad || "").trim();
    const blockTop = y - 1;
    doc.setDrawColor(230, 223, 215);
    doc.setFillColor(255, 252, 247);
    doc.roundedRect(margin, blockTop, pageWidth - margin * 2, 16, 4, 4, "FD");
    writeLine(`${index + 1}. ${descripcion}`, { size: 11, weight: "bold", gapAfter: 1.5, indent: 4 });
    writeLine(`Cantidad: ${cantidad || "-"} ${unidad}`.trim(), { size: 10, color: [96, 84, 72], indent: 8, gapAfter: 4.5 });
  });

  if (pedido?.observacion) {
    writeLine("Observacion", { size: 13, weight: "bold", gapAfter: 4 });
    writeLine(pedido.observacion, { size: 10, color: [96, 84, 72], gapAfter: 6 });
  }

  doc.setDrawColor(223, 216, 208);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(128, 115, 102);
  doc.text("Sur Maderas", margin, pageHeight - 12);
  doc.text("Pedido generado desde gestion interna", pageWidth - margin, pageHeight - 12, { align: "right" });

  const fileName = `pedido-proveedor-${pedido?.proveedorNombre || "sur-maderas"}.pdf`
    .toLowerCase()
    .replace(/\s+/g, "-");

  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  doc.save(fileName);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
