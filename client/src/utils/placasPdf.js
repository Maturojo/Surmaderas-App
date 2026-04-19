import jsPDF from "jspdf";

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function addHeader(doc, pageWidth, filtros) {
  doc.setFillColor(50, 38, 25);
  doc.roundedRect(12, 10, pageWidth - 24, 28, 4, 4, "F");
  doc.setTextColor(255, 250, 242);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Lista de placas", 16, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 16, 30);
  doc.text(`Filtro: ${filtros}`, pageWidth - 16, 30, { align: "right" });
  doc.setTextColor(40, 31, 23);
}

function ensureSpace(doc, y, needed, pageHeight, pageWidth, filtros) {
  if (y + needed <= pageHeight - 14) return y;
  doc.addPage();
  addHeader(doc, pageWidth, filtros);
  return 48;
}

function drawTableHeader(doc, y) {
  doc.setFillColor(239, 230, 216);
  doc.roundedRect(12, y, 273, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Producto", 14, y + 5.3);
  doc.text("Medida", 128, y + 6.5);
  doc.text("Espesor", 176, y + 6.5);
  doc.text("Placa entera", 225, y + 6.5, { align: "right" });
  doc.text("1/2 placa", 282, y + 6.5, { align: "right" });
}

export function generarListaPlacasPdf({ bloques = [], categoriaActiva = "Todas", busqueda = "", autoPrint = false } = {}) {
  const items = Array.isArray(bloques) ? bloques : [];
  if (!items.length) {
    window.alert("No hay placas para exportar con los filtros actuales.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filtros = [categoriaActiva !== "Todas" ? categoriaActiva : "Todas las categorias", busqueda ? `Busqueda: ${busqueda}` : ""]
    .filter(Boolean)
    .join(" | ");

  addHeader(doc, pageWidth, filtros || "Sin filtros");

  let y = 48;

  items.forEach((bloque) => {
    y = ensureSpace(doc, y, 22, pageHeight, pageWidth, filtros || "Sin filtros");

    doc.setFillColor(247, 243, 236);
    doc.roundedRect(12, y, 273, 11, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${bloque.categoria} (${bloque.items.length})`, 14, y + 7.2);
    y += 15;

    drawTableHeader(doc, y);
    y += 12;

    bloque.items.forEach((item) => {
      y = ensureSpace(doc, y, 12, pageHeight, pageWidth, filtros || "Sin filtros");
      doc.setDrawColor(230, 221, 208);
      doc.line(12, y + 9.5, 285, y + 9.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11.5);
      doc.text(String(item.nombre || ""), 14, y + 6.8, { maxWidth: 108 });
      doc.text(String(item.medida || ""), 128, y + 6.8);
      doc.text(String(item.espesor || ""), 176, y + 6.8);
      doc.text(formatPrice(item.precioPlaca), 225, y + 6.8, { align: "right" });
      doc.text(formatPrice(item.precioMedia), 282, y + 6.8, { align: "right" });
      y += 11;
    });

    y += 7;
  });

  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
    return;
  }

  doc.save("lista-placas.pdf");
}
