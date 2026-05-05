import { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import "../../css/cotizador-cortes.css";

const MATERIALES = [
  {
    grupo: "Fibro Fácil (MDF)",
    items: [
      { nombre: "Fibro Fácil 3 mm", precioM2: 12004, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 5 mm", precioM2: 15920, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 9 mm", precioM2: 22183, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 12 mm", precioM2: 27687, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 15 mm", precioM2: 34079, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
      { nombre: "Fibro Fácil 18 mm", precioM2: 40959, imagen: "https://surmaderas.com/cotizador/imagenes/fibrofacil.jpg", descripcion: "Madera MDF ideal para ebanistería y manualidades. Suave, fácil de cortar y pintar. No es resistente a la humedad." },
    ],
  },
  {
    grupo: "Tablero de Pino",
    items: [
      { nombre: "Tablero Pino 15 mm", precioM2: 63349, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
      { nombre: "Tablero Pino 18 mm", precioM2: 79325.2, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
      { nombre: "Tablero Pino 21 mm", precioM2: 88139, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
      { nombre: "Tablero Pino 30 mm", precioM2: 117313, imagen: "https://surmaderas.com/cotizador/imagenes/pino.jpg", descripcion: "Madera maciza de pino para muebles y estructuras. Resistente, ligera, con acabado natural que puede barnizarse o pintarse." },
    ],
  },
  {
    grupo: "Fenólico",
    items: [
      { nombre: "Fenólico 8 mm", precioM2: 34354.8, imagen: "https://surmaderas.com/cotizador/imagenes/fenolico.jpg", descripcion: "Tablero contrachapado con resina fenólica. Muy resistente a la humedad, usado en construcciones exteriores y encofrados." },
      { nombre: "Fenólico 12 mm", precioM2: 47104.4, imagen: "https://surmaderas.com/cotizador/imagenes/fenolico.jpg", descripcion: "Tablero contrachapado con resina fenólica. Muy resistente a la humedad, usado en construcciones exteriores y encofrados." },
      { nombre: "Fenólico 18 mm", precioM2: 58095.4, imagen: "https://surmaderas.com/cotizador/imagenes/fenolico.jpg", descripcion: "Tablero contrachapado con resina fenólica. Muy resistente a la humedad, usado en construcciones exteriores y encofrados." },
    ],
  },
  {
    grupo: "Pizarrones",
    items: [
      { nombre: "Pizarrón Negro", precioM2: 42288.1, imagen: "https://surmaderas.com/cotizador/imagenes/pizarron.jpg", descripcion: "Superficie recubierta con pintura especial para tiza. Para pizarrones escolares o domésticos." },
      { nombre: "Pizarrón Verde", precioM2: 42288.1, imagen: "https://surmaderas.com/cotizador/imagenes/pizarron.jpg", descripcion: "Superficie recubierta con pintura especial para tiza. Para pizarrones escolares o domésticos." },
    ],
  },
  {
    grupo: "Otros materiales",
    items: [
      { nombre: "Fibro Plus Blanco/Negro", precioM2: 18503, imagen: "https://surmaderas.com/cotizador/imagenes/fibroplus.jpg", descripcion: "MDF recubierto en laminado blanco o negro. Superficie lisa y fácil de limpiar, ideal para muebles." },
      { nombre: "OSB 10 mm", precioM2: 42938.4, imagen: "https://surmaderas.com/cotizador/imagenes/fibroplus.jpg", descripcion: "Tablero de virutas orientadas (OSB). Resistente, económico, con aspecto rústico. Usado en paredes, techos y suelos." },
      { nombre: "Terciado 3 mm", precioM2: 21867.3, imagen: "https://surmaderas.com/cotizador/imagenes/terciado.jpg", descripcion: "Tablero contrachapado delgado, ligero y flexible. Para revestimientos y aplicaciones sin gran demanda estructural." },
      { nombre: "Melamina Blanca 18 mm", precioM2: 40715.1, imagen: "https://surmaderas.com/cotizador/imagenes/melamina.jpg", descripcion: "Tablero de aglomerado con melamina blanca. Resistente, fácil de limpiar. Para muebles modulares." },
      { nombre: "Melamina Negra 18 mm", precioM2: 47497, imagen: "https://surmaderas.com/cotizador/imagenes/melamina.jpg", descripcion: "Tablero de aglomerado con melamina negra. Resistente, fácil de limpiar. Para muebles modulares." },
      { nombre: "Chapadur Perforado 3 mm", precioM2: 43734.6, imagen: "https://surmaderas.com/cotizador/imagenes/chapadur.jpg", descripcion: "Madera dura perforada para paneles decorativos y organización de herramientas. Liviana y versátil." },
      { nombre: "Vidrio 2 mm a Medida", precioM2: 33582, imagen: "https://surmaderas.com/cotizador/imagenes/vidrio.jpg", descripcion: "Vidrio fino transparente cortado a medida. Para ventanas, puertas y divisorias." },
      { nombre: "Espejo 3 mm a Medida", precioM2: 59166, imagen: "https://surmaderas.com/cotizador/imagenes/espejo.jpg", descripcion: "Espejo de grosor fino cortado a medida. Para decoración y uso funcional." },
    ],
  },
];

function formatARS(n) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

let nextId = 1;

export default function CotizadorCortes() {
  const [materialKey, setMaterialKey] = useState("");
  const [largo, setLargo] = useState("");
  const [ancho, setAncho] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [cortes, setCortes] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [costoActual, setCostoActual] = useState(null);
  const tableRef = useRef(null);

  const materialSeleccionado = useMemo(() => {
    if (!materialKey) return null;
    for (const grupo of MATERIALES) {
      const found = grupo.items.find((m) => m.nombre === materialKey);
      if (found) return found;
    }
    return null;
  }, [materialKey]);

  const total = useMemo(
    () => cortes.reduce((acc, c) => acc + c.subtotal, 0),
    [cortes]
  );

  function calcular() {
    const l = parseFloat(largo);
    const a = parseFloat(ancho);
    const q = parseFloat(cantidad);

    if (!materialSeleccionado || isNaN(l) || isNaN(a) || isNaN(q) || q <= 0) {
      alert("Por favor, seleccioná un material e ingresá largo, ancho y cantidad.");
      return;
    }

    const precioM2 = materialSeleccionado.precioM2;
    const minCosto = (10 * 10 * precioM2) / 10000;
    const area = (l / 100) * (a / 100);
    let costoUnd = area * precioM2;
    if (costoUnd < minCosto) costoUnd = minCosto;
    const subtotal = costoUnd * q;

    setCostoActual(subtotal);
    setCortes((prev) => [
      ...prev,
      { id: nextId++, cantidad: q, material: materialSeleccionado.nombre, largo: l, ancho: a, costoUnd, subtotal },
    ]);
    setLargo("");
    setAncho("");
    setCantidad("");
  }

  function toggleSeleccion(id) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function eliminarSeleccionados() {
    if (seleccionados.size === 0) {
      alert("Seleccioná al menos una fila para eliminar.");
      return;
    }
    setCortes((prev) => prev.filter((c) => !seleccionados.has(c.id)));
    setSeleccionados(new Set());
  }

  function imprimir() {
    const contenido = tableRef.current?.outerHTML ?? "";
    const v = window.open("", "_blank");
    v.document.write(
      `<html><head><title>Cotización Sur Maderas</title><style>
        body{font-family:Arial,sans-serif;padding:20px;}
        table{border-collapse:collapse;width:100%;font-size:13px;}
        th,td{border:1px solid #ddd;padding:10px;text-align:center;}
        thead th{background:#0A0A0A;color:white;}
        tfoot{background:#f5f5f5;font-weight:bold;}
        .cc-noprint{display:none;}
      </style></head><body>
        <h2>Cotización de cortes — Sur Maderas</h2>
        <p style="color:#666;font-size:12px;">Av. Luro 5020 / Av. Independencia 4490 — Mar del Plata</p>
        <br>${contenido}
      </body></html>`
    );
    v.document.close();
    v.focus();
    v.print();
    v.close();
  }

  function exportarPDF() {
    if (cortes.length === 0) {
      alert("No hay cortes cargados para exportar.");
      return;
    }
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Cotización de cortes — Sur Maderas", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Av. Luro 5020 / Av. Independencia 4490 — Mar del Plata", 14, 28);
    doc.setTextColor(0);

    const headers = ["Cant.", "Material", "Medida", "$ / unidad", "Subtotal"];
    const colWidths = [16, 64, 38, 30, 30];
    let y = 40;
    const rowH = 9;

    doc.setFillColor(10, 10, 10);
    doc.rect(14, y, pageW - 28, rowH, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x + colWidths[i] / 2, y + 6.2, { align: "center" });
      x += colWidths[i];
    });
    y += rowH;

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    cortes.forEach((c, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 247, 245);
        doc.rect(14, y, pageW - 28, rowH, "F");
      }
      const cells = [
        String(c.cantidad),
        c.material,
        `${c.largo} x ${c.ancho} cm`,
        `$ ${formatARS(c.costoUnd)}`,
        `$ ${formatARS(c.subtotal)}`,
      ];
      x = 14;
      cells.forEach((cell, i) => {
        doc.text(cell, x + colWidths[i] / 2, y + 6.2, { align: "center", maxWidth: colWidths[i] - 2 });
        x += colWidths[i];
      });
      y += rowH;
    });

    doc.setFillColor(248, 247, 245);
    doc.rect(14, y, pageW - 28, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const totalX = 14 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    doc.text("Total", totalX - 4, y + 6.2, { align: "right" });
    doc.text(`$ ${formatARS(total)}`, totalX + colWidths[4] / 2, y + 6.2, { align: "center" });

    doc.save("cotizacion-cortes-surmaderas.pdf");
  }

  function enviarWhatsApp() {
    if (cortes.length === 0) {
      alert("No hay cortes cargados para enviar.");
      return;
    }
    let msg = "📦 *Cotización de cortes — Sur Maderas*%0A";
    cortes.forEach((c, i) => {
      msg += `%0A🔹 *Corte ${i + 1}*%0AMaterial: ${c.material}%0AMedida: ${c.largo} x ${c.ancho} cm%0ACantidad: ${c.cantidad}%0ASubtotal: $${formatARS(c.subtotal)}%0A`;
    });
    msg += `%0A💰 *Total: $${formatARS(total)}*`;
    window.open(`https://wa.me/5492234383262?text=${msg}`, "_blank");
  }

  return (
    <div className="cc-page">
      <div className="cc-hero">
        <div className="cc-kicker">Herramienta de precios</div>
        <h1 className="cc-title">Cotizador de cortes</h1>
        <p className="cc-copy">
          Calculá el precio de tus cortes seleccionando el material y las medidas.
          Podés armar una lista y exportarla o enviarla por WhatsApp.
        </p>
      </div>

      <div className="cc-body">
        {/* PASO 1 */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">01</span>
            <span className="cc-stepLabel">Seleccioná el material</span>
          </div>
          <select
            className="cc-select"
            value={materialKey}
            onChange={(e) => setMaterialKey(e.target.value)}
          >
            <option value="">Ver opciones de material →</option>
            {MATERIALES.map((grupo) => (
              <optgroup key={grupo.grupo} label={grupo.grupo}>
                {grupo.items.map((m) => (
                  <option key={m.nombre} value={m.nombre}>{m.nombre}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {materialSeleccionado && (
            <div className="cc-preview">
              <img
                className="cc-previewImg"
                src={materialSeleccionado.imagen}
                alt={materialSeleccionado.nombre}
              />
              <div className="cc-previewText">
                <h4 className="cc-previewName">{materialSeleccionado.nombre}</h4>
                <p className="cc-previewDesc">{materialSeleccionado.descripcion}</p>
                <p className="cc-previewPrice">
                  <strong>$ {formatARS(materialSeleccionado.precioM2)}</strong> / m²
                </p>
              </div>
            </div>
          )}
        </section>

        {/* PASO 2 */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">02</span>
            <span className="cc-stepLabel">Ingresá las medidas</span>
          </div>
          <p className="cc-nota">Usá punto para decimales (ej: 50.5)</p>
          <div className="cc-grid">
            <div className="cc-field">
              <label className="cc-fieldLabel">Largo (cm)</label>
              <input type="number" className="cc-input" placeholder="ej: 240" value={largo} onChange={(e) => setLargo(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Ancho (cm)</label>
              <input type="number" className="cc-input" placeholder="ej: 60" value={ancho} onChange={(e) => setAncho(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Cantidad</label>
              <input type="number" className="cc-input" placeholder="ej: 2" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Precio por m²</label>
              <input
                type="text"
                className="cc-input cc-input--readonly"
                readOnly
                value={materialSeleccionado ? `$ ${formatARS(materialSeleccionado.precioM2)}` : ""}
                placeholder="Se carga al elegir material"
              />
            </div>
          </div>
          <button className="cc-btnCalc" onClick={calcular}>
            Agregar corte →
          </button>
        </section>

        {/* RESULTADO ÚLTIMO CORTE */}
        {costoActual !== null && (
          <div className="cc-result">
            <span className="cc-resultLabel">Último corte agregado</span>
            <span className="cc-resultAmount">$ {formatARS(costoActual)}</span>
          </div>
        )}

        {/* PASO 3 — TABLA */}
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">03</span>
            <span className="cc-stepLabel">Mis cortes</span>
          </div>
          <div className="cc-tableWrap">
            <table className="cc-table" ref={tableRef}>
              <thead>
                <tr>
                  <th className="cc-noprint">Sel.</th>
                  <th>Cant.</th>
                  <th>Material</th>
                  <th>Medida</th>
                  <th>$ / unidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cortes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="cc-emptyRow">Todavía no agregaste cortes</td>
                  </tr>
                ) : (
                  cortes.map((c) => (
                    <tr key={c.id} className={seleccionados.has(c.id) ? "cc-rowSelected" : ""}>
                      <td className="cc-noprint">
                        <input
                          type="checkbox"
                          className="cc-checkbox"
                          checked={seleccionados.has(c.id)}
                          onChange={() => toggleSeleccion(c.id)}
                        />
                      </td>
                      <td>{c.cantidad}</td>
                      <td>{c.material}</td>
                      <td>{c.largo} × {c.ancho} cm</td>
                      <td>$ {formatARS(c.costoUnd)}</td>
                      <td>$ {formatARS(c.subtotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4} className="cc-noprint" />
                  <th>Total</th>
                  <th>$ {formatARS(total)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="cc-actions">
            <button className="cc-actionBtn cc-btnDel" title="Eliminar seleccionados" onClick={eliminarSeleccionados}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnPrint" title="Imprimir" onClick={imprimir}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnPdf" title="Guardar PDF" onClick={exportarPDF}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
            </button>
            <button className="cc-actionBtn cc-btnWa" title="Enviar por WhatsApp" onClick={enviarWhatsApp}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
            </button>
          </div>
        </section>

        {/* TOTAL */}
        <div className="cc-totalStrip">
          <span className="cc-totalLabel">Total de tu pedido</span>
          <span className="cc-totalAmount">$ {formatARS(total)}</span>
        </div>

        <a className="cc-waStrip" href="https://wa.me/5492234383262" target="_blank" rel="noreferrer">
          <span>¿Tenés dudas sobre el material? Escribinos →</span>
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
        </a>
      </div>
    </div>
  );
}
