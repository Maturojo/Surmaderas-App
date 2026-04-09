import jsPDF from "jspdf";

function money(value) {
  return Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString("es-AR");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-AR");
}

function slugify(text = "") {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

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

export async function exportPresupuestoPdf(data) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 16;
  const items = Array.isArray(data.items) ? data.items : [];
  const total = items.reduce(
    (acc, item) => acc + Number(item.cant || 0) * Number(item.precio || 0),
    0
  );

  doc.setFillColor(48, 39, 31);
  doc.roundedRect(margin, y, contentWidth, 30, 5, 5, "F");
  doc.setFillColor(219, 194, 158);
  doc.roundedRect(margin, y + 24, contentWidth, 6, 0, 0, "F");

  try {
    const logo = await loadImageAsDataUrl("/logo-sur-maderas.png");
    doc.addImage(logo, "PNG", margin + 5, y + 3.5, 22, 22);
  } catch {
    doc.setFillColor(48, 39, 31);
    doc.setDrawColor(255, 255, 255);
    doc.circle(margin + 16, y + 14, 8.5, "FD");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SM", margin + 12.3, y + 16.2);
  }

  doc.setTextColor(255, 252, 247);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PRESUPUESTO OFICIAL", margin + 31, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Sur Maderas", margin + 31, y + 16);
  doc.text(`Fecha: ${formatDate(data.fecha)}`, margin + 31, y + 21.5);
  doc.text(`Nro: ${data.numero || "-"}`, pageWidth - margin - 4, y + 12, { align: "right" });
  doc.text(`Validez: ${data.validezDias || 7} dias`, pageWidth - margin - 4, y + 18, {
    align: "right",
  });

  y += 38;

  doc.setDrawColor(219, 209, 197);
  doc.setFillColor(250, 247, 242);
  doc.roundedRect(margin, y, contentWidth, 28, 4, 4, "FD");
  doc.setTextColor(51, 42, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DATOS DEL CLIENTE", margin + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Cliente: ${data.cliente || "-"}`, margin + 4, y + 14);
  doc.text(`Empresa: ${data.empresa || "-"}`, margin + 4, y + 20);
  doc.text(`Telefono: ${data.telefono || "-"}`, margin + 78, y + 14);
  doc.text(`Email: ${data.email || "-"}`, margin + 78, y + 20);

  y += 35;

  if (data.proyecto || data.detalle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ALCANCE", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const scopeText = [data.proyecto, data.detalle].filter(Boolean).join(" - ");
    const lines = doc.splitTextToSize(scopeText, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  const colDesc = 98;
  const colCant = 20;
  const colPrice = 32;
  const colSubtotal = contentWidth - colDesc - colCant - colPrice;
  const rowH = 9;

  doc.setFillColor(240, 233, 224);
  doc.rect(margin, y, contentWidth, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Descripcion", margin + 2, y + 6);
  doc.text("Cant.", margin + colDesc + colCant / 2, y + 6, { align: "center" });
  doc.text("Precio unit.", margin + colDesc + colCant + colPrice / 2, y + 6, { align: "center" });
  doc.text("Subtotal", pageWidth - margin - colSubtotal / 2, y + 6, { align: "center" });
  y += rowH;

  doc.setFont("helvetica", "normal");

  items.forEach((item, index) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 16;
    }

    const subtotal = Number(item.cant || 0) * Number(item.precio || 0);
    const descLines = doc.splitTextToSize(String(item.desc || `Item ${index + 1}`), colDesc - 4);
    const dynamicHeight = Math.max(rowH, descLines.length * 5 + 4);

    doc.setDrawColor(230, 222, 214);
    doc.rect(margin, y, contentWidth, dynamicHeight);
    doc.text(descLines, margin + 2, y + 5);
    doc.text(String(item.cant || 0), margin + colDesc + colCant / 2, y + 5, { align: "center" });
    doc.text(`$ ${money(item.precio)}`, margin + colDesc + colCant + colPrice / 2, y + 5, {
      align: "center",
    });
    doc.text(`$ ${money(subtotal)}`, pageWidth - margin - 2, y + 5, { align: "right" });
    y += dynamicHeight;
  });

  y += 8;

  doc.setFillColor(250, 247, 242);
  doc.roundedRect(pageWidth - margin - 62, y, 62, 22, 4, 4, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("TOTAL PRESUPUESTADO", pageWidth - margin - 31, y + 8, { align: "center" });
  doc.setFontSize(15);
  doc.text(`$ ${money(total)}`, pageWidth - margin - 31, y + 16, { align: "center" });
  y += 30;

  const extraBlocks = [
    data.entrega ? `Entrega: ${data.entrega}` : "",
    data.formaPago ? `Forma de pago: ${data.formaPago}` : "",
    data.observaciones ? `Observaciones: ${data.observaciones}` : "",
    data.condiciones ? `Condiciones: ${data.condiciones}` : "",
  ].filter(Boolean);

  if (extraBlocks.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    extraBlocks.forEach((block) => {
      const lines = doc.splitTextToSize(block, contentWidth);
      if (y + lines.length * 5 > pageHeight - 20) {
        doc.addPage();
        y = 16;
      }
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    });
  }

  doc.setDrawColor(190, 179, 164);
  doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 95, 82);
  doc.text("Sur Maderas · Presupuesto emitido desde gestion interna", margin, pageHeight - 10);
  doc.text("Documento comercial", pageWidth - margin, pageHeight - 10, { align: "right" });

  const name = slugify(data.cliente || data.empresa || "presupuesto");
  doc.save(`presupuesto-${name || "sur-maderas"}.pdf`);
}
