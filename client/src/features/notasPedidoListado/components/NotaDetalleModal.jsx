import { useState } from "react";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { guardarPdfNotaPedido } from "../../../services/notasPedido";

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

/**
 * Construye el PDF desde los datos de la nota
 * NO descarga, solo devuelve el doc
 */
function buildPdfDocFromNota(nota) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(`NOTA DE PEDIDO ${nota.numero}`, 14, 16);

  doc.setFontSize(10);
  doc.text(`Fecha: ${fmtDate(nota.fecha)}`, 14, 24);
  doc.text(`Entrega: ${fmtDate(nota.entrega)}`, 14, 30);

  doc.text(`Cliente: ${nota.cliente?.nombre || ""}`, 14, 38);
  doc.text(`Tel: ${nota.cliente?.telefono || ""}`, 14, 44);
  doc.text(`Vendedor: ${nota.vendedor || ""}`, 14, 50);
  doc.text(`Medio de pago: ${nota.medioPago || ""}`, 14, 56);

  let y = 70;
  doc.setFontSize(9);

  (nota.items || []).forEach((it) => {
    const sub = (it.cantidad || 0) * (it.precioUnit || 0);
    doc.text(
      `${it.descripcion} | Cant: ${it.cantidad} | $${toARS(sub)}`,
      14,
      y
    );
    y += 6;

    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  y += 8;
  doc.setFontSize(11);
  doc.text(`Subtotal: $${toARS(nota.totales?.subtotal)}`, 14, y);
  y += 7;
  doc.text(`Descuento: $${toARS(nota.totales?.descuento)}`, 14, y);
  y += 7;
  doc.text(`TOTAL: $${toARS(nota.totales?.total)}`, 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.text(
    `Adelanto: $${toARS(nota.totales?.adelanto)} | Resta: $${toARS(
      nota.totales?.resta
    )}`,
    14,
    y
  );

  return doc;
}

export default function NotaDetalleModal({
  open,
  onClose,
  detalle,
  loading,
  error,
}) {
  const [previewPdf, setPreviewPdf] = useState(null);

  if (!open) return null;

  function onVistaPreviaPdf() {
    if (!detalle) return;

    // Si ya existe en BD → usarlo
    if (detalle.pdfBase64) {
      setPreviewPdf(detalle.pdfBase64);
      return;
    }

    // Si no existe → generarlo al vuelo
    const doc = buildPdfDocFromNota(detalle);
    const pdfBase64 = doc.output("datauristring");
    setPreviewPdf(pdfBase64);
  }

  function onDescargarPdf() {
    if (!detalle) return;
    const doc = buildPdfDocFromNota(detalle);
    doc.save(`${detalle.numero}.pdf`);
  }

  async function onGuardarPdfEnBD() {
    if (!detalle) return;

    try {
      const result = await Swal.fire({
        icon: "question",
        title: "Guardar PDF",
        text: "¿Querés guardar el PDF de esta nota en la base de datos?",
        showCancelButton: true,
        confirmButtonText: "Sí, guardar",
        cancelButtonText: "Cancelar",
      });

      if (!result.isConfirmed) return;

      const doc = buildPdfDocFromNota(detalle);
      const pdfBase64 = doc.output("datauristring");

      await guardarPdfNotaPedido(detalle._id, pdfBase64);

      await Swal.fire({
        icon: "success",
        title: "PDF guardado",
        text: "El PDF se guardó correctamente en la base de datos.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: e.message || "No se pudo guardar el PDF",
      });
    }
  }

  return (
    <>
      {/* MODAL DETALLE */}
      <div className="npl-modalBack" onMouseDown={onClose}>
        <div className="npl-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="npl-modalHeader">
            <div className="npl-modalTitle">Detalle de Nota de Pedido</div>
            <button className="npl-x" type="button" onClick={onClose}>
              ×
            </button>
          </div>

          {loading ? (
            <div className="npl-muted">Cargando detalle...</div>
          ) : error ? (
            <div className="npl-error">{error}</div>
          ) : !detalle ? (
            <div className="npl-muted">Sin información</div>
          ) : (
            <>
              <div className="npl-detailGrid">
                <div><b>Número:</b> {detalle.numero}</div>
                <div><b>Fecha:</b> {fmtDate(detalle.fecha)}</div>
                <div><b>Entrega:</b> {fmtDate(detalle.entrega)}</div>
                <div><b>Cliente:</b> {detalle.cliente?.nombre}</div>
                <div><b>Tel:</b> {detalle.cliente?.telefono || "-"}</div>
                <div><b>Vendedor:</b> {detalle.vendedor || "-"}</div>
                <div><b>Medio de pago:</b> {detalle.medioPago || "-"}</div>
                <div><b>Estado:</b> {detalle.estado || "-"}</div>
              </div>

              <div className="npl-itemsTitle">Items</div>
              <div className="npl-itemsList">
                {detalle.items?.map((it, i) => (
                  <div className="npl-itemRow" key={i}>
                    <div className="npl-itemDesc">{it.descripcion}</div>
                    <div className="npl-itemMeta">
                      Cant: {it.cantidad} — Unit: ${toARS(it.precioUnit)} — Sub: $
                      {toARS((it.cantidad || 0) * (it.precioUnit || 0))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="npl-totalsBox">
                <div>Subtotal: ${toARS(detalle.totales?.subtotal)}</div>
                <div>Descuento: ${toARS(detalle.totales?.descuento)}</div>
                <div><b>Total: ${toARS(detalle.totales?.total)}</b></div>
                <div>Adelanto: ${toARS(detalle.totales?.adelanto)}</div>
                <div>Resta: ${toARS(detalle.totales?.resta)}</div>
              </div>

              <div className="npl-modalActions">
                <button className="npl-btn" onClick={onVistaPreviaPdf}>
                  Vista previa PDF
                </button>

                <button className="npl-btn" onClick={onDescargarPdf}>
                  Descargar PDF
                </button>

                <button
                  className="npl-btn"
                  disabled={Boolean(detalle.pdfBase64)}
                  onClick={onGuardarPdfEnBD}
                >
                  Guardar PDF en la BD
                </button>
              </div>

              {detalle.pdfBase64 && (
                <div className="npl-muted" style={{ marginTop: 8 }}>
                  Esta nota ya tiene un PDF guardado en la base de datos.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL VISTA PREVIA */}
      {previewPdf && (
        <div
          className="npl-modalBack"
          onMouseDown={() => setPreviewPdf(null)}
        >
          <div
            className="npl-modal npl-modal-preview"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="npl-modalHeader">
              <div className="npl-modalTitle">Vista previa PDF</div>
              <button
                className="npl-x"
                type="button"
                onClick={() => setPreviewPdf(null)}
              >
                ×
              </button>
            </div>

            <iframe
              src={previewPdf}
              title="Vista previa PDF"
              style={{
                width: "100%",
                height: "80vh",
                border: "none",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
