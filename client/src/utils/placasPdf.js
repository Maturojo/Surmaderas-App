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
  doc.roundedRect(12, 10, pageWidth - 24, 22, 4, 4, "F");
  doc.setTextColor(255, 250, 242);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Lista de placas", 16, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 16, 25);
  doc.text(`Filtro: ${filtros}`, pageWidth - 16, 25, { align: "right" });
  doc.setTextColor(40, 31, 23);
}

function ensureSpace(doc, y, needed, pageHeight, pageWidth, filtros) {
  if (y + needed <= pageHeight - 14) return y;
  doc.addPage();
  addHeader(doc, pageWidth, filtros);
  return 40;
}

function drawTableHeader(doc, y) {
  doc.setFillColor(239, 230, 216);
  doc.roundedRect(12, y, 186, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Producto", 14, y + 5.3);
  doc.text("Medida", 59, y + 5.3);
  doc.text("Espesor", 84, y + 5.3);
  doc.text("1/2 vertical", 108, y + 5.3);
  doc.text("1/2 horizontal", 138, y + 5.3);
  doc.text("Placa", 173, y + 5.3);
  doc.text("1/2", 192, y + 5.3, { align: "right" });
}

export function generarListaPlacasPdf({ bloques = [], categoriaActiva = "Todas", busqueda = "", autoPrint = false } = {}) {
  const items = Array.isArray(bloques) ? bloques : [];
  if (!items.length) {
    window.alert("No hay placas para exportar con los filtros actuales.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filtros = [categoriaActiva !== "Todas" ? categoriaActiva : "Todas las categorias", busqueda ? `Busqueda: ${busqueda}` : ""]
    .filter(Boolean)
    .join(" | ");

  addHeader(doc, pageWidth, filtros || "Sin filtros");

  let y = 40;

  items.forEach((bloque) => {
    y = ensureSpace(doc, y, 18, pageHeight, pageWidth, filtros || "Sin filtros");

    doc.setFillColor(247, 243, 236);
    doc.roundedRect(12, y, 186, 9, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${bloque.categoria} (${bloque.items.length})`, 14, y + 5.8);
    y += 12;

    drawTableHeader(doc, y);
    y += 10;

    bloque.items.forEach((item) => {
      y = ensureSpace(doc, y, 9, pageHeight, pageWidth, filtros || "Sin filtros");
      doc.setDrawColor(230, 221, 208);
      doc.line(12, y + 6.7, 198, y + 6.7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.text(String(item.nombre || ""), 14, y + 4.6, { maxWidth: 42 });
      doc.text(String(item.medida || ""), 59, y + 4.6);
      doc.text(String(item.espesor || ""), 84, y + 4.6);
      doc.text(String(item.mediaVertical || ""), 108, y + 4.6);
      doc.text(String(item.mediaHorizontal || ""), 138, y + 4.6);
      doc.text(formatPrice(item.precioPlaca), 173, y + 4.6, { align: "right" });
      doc.text(formatPrice(item.precioMedia), 192, y + 4.6, { align: "right" });
      y += 8;
    });

    y += 5;
  });

  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
    return;
  }

  doc.save("lista-placas.pdf");
}
