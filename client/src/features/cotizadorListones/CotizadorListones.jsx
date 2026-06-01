import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import "../../css/cotizador-cortes.css";
import { trackModuleUsage } from "../../services/estadisticas";

const LARGO_VARILLA_CM = 305;

const LISTONES = [
  { codigo: "30105", nombre: "LISTON 1/2 X 1/2", precioMetro: 403, seccion: "13 x 13 mm" },
  { codigo: "30106", nombre: "LISTON 1/2 X 3/4", precioMetro: 591, seccion: "19 x 13 mm" },
  { codigo: "30107", nombre: "LISTON 1/2 X 1", precioMetro: 667, seccion: "25 x 13 mm" },
  { codigo: "30108", nombre: "LISTON 1/2 X 1 1/2", precioMetro: 1014, seccion: "38 x 13 mm" },
  { codigo: "30109", nombre: "LISTON 1/2 X 2", precioMetro: 1287, seccion: "51 x 13 mm" },
  { codigo: "30110", nombre: "LISTON 1/2 X 3", precioMetro: 1923, seccion: "76 x 13 mm" },
  { codigo: "30111", nombre: "LISTON 1/2 X 4", precioMetro: 2556, seccion: "102 x 13 mm" },
  { codigo: "30112", nombre: "LISTON 1/2 X 5", precioMetro: 3199, seccion: "127 x 13 mm" },
  { codigo: "30113", nombre: "LISTON 1/2 X 6", precioMetro: 3831, seccion: "152 x 13 mm" },
  { codigo: "30122", nombre: "LISTON 3/4 X 3/4", precioMetro: 779, seccion: "19 x 19 mm" },
  { codigo: "30123", nombre: "LISTON 3/4 X 1", precioMetro: 934, seccion: "25 x 19 mm" },
  { codigo: "30124", nombre: "LISTON 3/4 X 1 1/2", precioMetro: 1446, seccion: "38 x 19 mm" },
  { codigo: "30125", nombre: "LISTON 3/4 X 2", precioMetro: 1928, seccion: "51 x 19 mm" },
  { codigo: "30126", nombre: "LISTON 3/4 X 3", precioMetro: 2876, seccion: "76 x 19 mm" },
  { codigo: "30127", nombre: "LISTON 3/4 X 4", precioMetro: 3835, seccion: "102 x 19 mm" },
  { codigo: "30128", nombre: "LISTON 3/4 X 5", precioMetro: 4817, seccion: "127 x 19 mm" },
  { codigo: "30129", nombre: "LISTON 3/4 X 6", precioMetro: 4685, seccion: "152 x 19 mm" },
  { codigo: "30138", nombre: "LISTON 1 X 1", precioMetro: 1178, seccion: "25 x 25 mm" },
  { codigo: "30139", nombre: "LISTON 1 X 1 1/2", precioMetro: 1730, seccion: "38 x 25 mm" },
  { codigo: "30140", nombre: "LISTON 1 X 2", precioMetro: 2308, seccion: "51 x 25 mm" },
  { codigo: "30141", nombre: "LISTON 1 X 3", precioMetro: 3478, seccion: "76 x 25 mm" },
  { codigo: "30142", nombre: "LISTON 1 X 4", precioMetro: 4625, seccion: "102 x 25 mm" },
  { codigo: "30143", nombre: "LISTON 1 X 5", precioMetro: 5776, seccion: "127 x 25 mm" },
  { codigo: "30144", nombre: "LISTON 1 X 6", precioMetro: 6955, seccion: "152 x 25 mm" },
  { codigo: "30153", nombre: "LISTON 1 1/2 X 1 1/2", precioMetro: 2877, seccion: "38 x 38 mm" },
  { codigo: "30154", nombre: "LISTON 1 1/2 X 2", precioMetro: 3842, seccion: "51 x 38 mm" },
  { codigo: "30155", nombre: "LISTON 1 1/2 X 3", precioMetro: 5756, seccion: "76 x 38 mm" },
  { codigo: "30170", nombre: "LISTON 2 X 2", precioMetro: 5241, seccion: "51 x 51 mm" },
  { codigo: "30171", nombre: "LISTON 2 X 3", precioMetro: 7917, seccion: "76 x 51 mm" },
  { codigo: "30172", nombre: "LISTON 2 X 4", precioMetro: 10484, seccion: "102 x 51 mm" },
];

function formatARS(n) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function parseNumero(value) {
  const parsed = parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function calcularListon(liston, largoCm, cantidad) {
  const metrosPedidos = (largoCm * cantidad) / 100;
  const varillas = Math.max(1, Math.ceil((largoCm * cantidad) / LARGO_VARILLA_CM));
  const metrosCobrados = (varillas * LARGO_VARILLA_CM) / 100;
  const sobranteCm = Math.max(0, varillas * LARGO_VARILLA_CM - largoCm * cantidad);
  const subtotal = metrosCobrados * liston.precioMetro;
  return { metrosPedidos, varillas, metrosCobrados, sobranteCm, subtotal };
}

let nextId = 1;

export default function CotizadorListones() {
  useEffect(() => {
    trackModuleUsage("Cotizador de listones", "cotizadores");
  }, []);

  const [listonCode, setListonCode] = useState("");
  const [largo, setLargo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [items, setItems] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [editandoId, setEditandoId] = useState(null);
  const [editado, setEditado] = useState({ listonCode: "", largo: "", cantidad: "" });
  const tableRef = useRef(null);

  const listonSeleccionado = useMemo(
    () => LISTONES.find((liston) => liston.codigo === listonCode) || null,
    [listonCode]
  );

  const total = useMemo(() => items.reduce((acc, item) => acc + item.subtotal, 0), [items]);
  const totalCortes = useMemo(() => items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0), [items]);
  const totalVarillas = useMemo(() => items.reduce((acc, item) => acc + Number(item.varillas || 0), 0), [items]);

  function agregarListon() {
    const largoCm = parseNumero(largo);
    const cantidadValue = parseNumero(cantidad);

    if (!listonSeleccionado || largoCm <= 0 || cantidadValue <= 0) {
      alert("Selecciona un liston e ingresa largo de corte y cantidad.");
      return;
    }

    const calculo = calcularListon(listonSeleccionado, largoCm, cantidadValue);
    setItems((prev) => [
      ...prev,
      {
        id: nextId++,
        codigo: listonSeleccionado.codigo,
        nombre: listonSeleccionado.nombre,
        seccion: listonSeleccionado.seccion,
        precioMetro: listonSeleccionado.precioMetro,
        largo: largoCm,
        cantidad: cantidadValue,
        ...calculo,
      },
    ]);
    setLargo("");
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

  function iniciarEdicion(item) {
    setEditandoId(item.id);
    setEditado({ listonCode: item.codigo, largo: String(item.largo), cantidad: String(item.cantidad) });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setEditado({ listonCode: "", largo: "", cantidad: "" });
  }

  function guardarEdicion() {
    const liston = LISTONES.find((item) => item.codigo === editado.listonCode);
    const largoCm = parseNumero(editado.largo);
    const cantidadValue = parseNumero(editado.cantidad);

    if (!liston || largoCm <= 0 || cantidadValue <= 0) {
      alert("Revisa liston, largo y cantidad antes de guardar.");
      return;
    }

    const calculo = calcularListon(liston, largoCm, cantidadValue);
    setItems((prev) => prev.map((item) => (
      item.id === editandoId
        ? {
            ...item,
            codigo: liston.codigo,
            nombre: liston.nombre,
            seccion: liston.seccion,
            precioMetro: liston.precioMetro,
            largo: largoCm,
            cantidad: cantidadValue,
            ...calculo,
          }
        : item
    )));
    cancelarEdicion();
  }

  function eliminarSeleccionados() {
    if (seleccionados.size === 0) {
      alert("Selecciona al menos una fila para eliminar.");
      return;
    }
    setItems((prev) => prev.filter((item) => !seleccionados.has(item.id)));
    if (seleccionados.has(editandoId)) cancelarEdicion();
    setSeleccionados(new Set());
  }

  function construirTexto() {
    return [
      "Cotizacion de listones - Sur Maderas",
      "",
      ...items.flatMap((item, index) => [
        `Item ${index + 1}`,
        `Liston: ${item.codigo} - ${item.nombre}`,
        `Cortes: ${item.cantidad} de ${item.largo} cm`,
        `Pedido real: ${formatARS(item.metrosPedidos)} m`,
        `Se cobra: ${item.varillas} varilla(s) completa(s) / ${formatARS(item.metrosCobrados)} m`,
        `Sobrante estimado: ${formatARS(item.sobranteCm).replace(",00", "")} cm`,
        `Subtotal: $ ${formatARS(item.subtotal)}`,
        "",
      ]),
      `Total cortes: ${formatARS(totalCortes).replace(",00", "")}`,
      `Total varillas: ${formatARS(totalVarillas).replace(",00", "")}`,
      `Total: $ ${formatARS(total)}`,
    ].join("\n");
  }

  async function copiarTabla() {
    if (items.length === 0) {
      alert("No hay listones cargados para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(construirTexto());
      alert("Cotizacion copiada. Ya podes pegarla en un mensaje.");
    } catch {
      alert("No se pudo copiar automaticamente.");
    }
  }

  function imprimir() {
    const contenido = tableRef.current?.outerHTML ?? "";
    const v = window.open("", "_blank");
    v.document.write(
      `<html><head><title>Cotizacion de listones</title><style>
        body{font-family:Arial,sans-serif;padding:20px;}
        table{border-collapse:collapse;width:100%;font-size:12px;}
        th,td{border:1px solid #ddd;padding:9px;text-align:center;}
        thead th{background:#0A0A0A;color:white;}
        tfoot{background:#f5f5f5;font-weight:bold;}
        .cc-noprint{display:none;}
      </style></head><body>
        <h2>Cotizacion de listones - Sur Maderas</h2>
        <p style="color:#666;font-size:12px;">Se cobra siempre por varilla completa de 3,05 m.</p>
        <br>${contenido}
      </body></html>`
    );
    v.document.close();
    v.focus();
    v.print();
    v.close();
  }

  function exportarPDF() {
    if (items.length === 0) {
      alert("No hay listones cargados para exportar.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Cotizacion de listones - Sur Maderas", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Se cobra siempre por varilla completa de 3,05 m.", 14, 26);

    const headers = ["Cant.", "Liston", "Corte", "Varillas", "Metros cobrados", "Sobrante", "Subtotal"];
    const colWidths = [18, 74, 28, 24, 34, 28, 34];
    let y = 38;
    let x = 14;

    doc.setFillColor(10, 10, 10);
    doc.rect(14, y, colWidths.reduce((a, b) => a + b, 0), 9, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    headers.forEach((header, index) => {
      doc.text(header, x + colWidths[index] / 2, y + 6.2, { align: "center" });
      x += colWidths[index];
    });
    y += 9;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(248, 247, 245);
        doc.rect(14, y, colWidths.reduce((a, b) => a + b, 0), 9, "F");
      }
      x = 14;
      [
        String(item.cantidad),
        `${item.codigo} - ${item.nombre}`,
        `${item.largo} cm`,
        String(item.varillas),
        `${formatARS(item.metrosCobrados)} m`,
        `${formatARS(item.sobranteCm).replace(",00", "")} cm`,
        `$ ${formatARS(item.subtotal)}`,
      ].forEach((cell, cellIndex) => {
        doc.text(cell, x + colWidths[cellIndex] / 2, y + 6.2, { align: "center", maxWidth: colWidths[cellIndex] - 2 });
        x += colWidths[cellIndex];
      });
      y += 9;
    });

    doc.setFont("helvetica", "bold");
    doc.text(`Total: $ ${formatARS(total)}`, 14, y + 12);
    doc.save("cotizacion-listones-surmaderas.pdf");
  }

  function enviarWhatsApp() {
    if (items.length === 0) {
      alert("No hay listones cargados para enviar.");
      return;
    }
    const msg = encodeURIComponent(construirTexto());
    window.open(`https://wa.me/5492234383262?text=${msg}`, "_blank");
  }

  const preview = listonSeleccionado && parseNumero(largo) > 0 && parseNumero(cantidad) > 0
    ? calcularListon(listonSeleccionado, parseNumero(largo), parseNumero(cantidad))
    : null;

  return (
    <div className="cc-page">
      <div className="cc-hero">
        <div className="cc-kicker">Herramienta de precios</div>
        <h1 className="cc-title">Cotizador de listones</h1>
        <p className="cc-copy">
          Carga cortes de liston por cantidad y largo. El precio se calcula siempre por varilla completa de 3,05 m.
        </p>
      </div>

      <div className="cc-body">
        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">01</span>
            <span className="cc-stepLabel">Selecciona el liston</span>
          </div>
          <select className="cc-select" value={listonCode} onChange={(e) => setListonCode(e.target.value)}>
            <option value="">Ver opciones de liston</option>
            {LISTONES.map((liston) => (
              <option key={liston.codigo} value={liston.codigo}>
                {liston.codigo} - {liston.nombre} ({liston.seccion})
              </option>
            ))}
          </select>

          {listonSeleccionado && (
            <div className="cc-preview">
              <div className="cc-previewText">
                <h4 className="cc-previewName">{listonSeleccionado.codigo} - {listonSeleccionado.nombre}</h4>
                <p className="cc-previewDesc">Seccion {listonSeleccionado.seccion}. Varilla comercial: {LARGO_VARILLA_CM} cm.</p>
                <p className="cc-previewPrice"><strong>$ {formatARS(listonSeleccionado.precioMetro)}</strong> / metro</p>
              </div>
            </div>
          )}
        </section>

        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">02</span>
            <span className="cc-stepLabel">Ingresa los cortes</span>
          </div>
          <p className="cc-nota">Ejemplo: 6 cortes de 50 cm se cobran como 1 varilla completa de 305 cm.</p>
          <div className="cc-grid">
            <div className="cc-field">
              <label className="cc-fieldLabel">Largo de cada corte (cm)</label>
              <input type="number" className="cc-input" placeholder="ej: 50" value={largo} onChange={(e) => setLargo(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Cantidad de cortes</label>
              <input type="number" className="cc-input" placeholder="ej: 6" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Precio por metro</label>
              <input className="cc-input cc-input--readonly" readOnly value={listonSeleccionado ? `$ ${formatARS(listonSeleccionado.precioMetro)}` : ""} placeholder="Se carga al elegir liston" />
            </div>
            <div className="cc-field">
              <label className="cc-fieldLabel">Vista previa</label>
              <input
                className="cc-input cc-input--readonly"
                readOnly
                value={preview ? `${preview.varillas} varilla(s) / $ ${formatARS(preview.subtotal)}` : ""}
                placeholder="Calcula al completar"
              />
            </div>
          </div>
          <button className="cc-btnCalc" onClick={agregarListon}>Agregar liston</button>
        </section>

        <section className="cc-card">
          <div className="cc-stepHeader">
            <span className="cc-stepNum">03</span>
            <span className="cc-stepLabel">Mis listones</span>
          </div>
          <div className="cc-tableWrap">
            <table className="cc-table cc-table--listones" ref={tableRef}>
              <thead>
                <tr>
                  <th className="cc-noprint">Sel.</th>
                  <th>Cant.</th>
                  <th>Liston</th>
                  <th>Corte</th>
                  <th>Pedido</th>
                  <th>Varillas</th>
                  <th>Sobrante</th>
                  <th>Subtotal</th>
                  <th className="cc-noprint">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={9} className="cc-emptyRow">Todavia no agregaste listones</td></tr>
                ) : (
                  items.map((item) => {
                    const isEditing = editandoId === item.id;
                    const listonEditado = LISTONES.find((liston) => liston.codigo === editado.listonCode);
                    const previewEdit = isEditing && listonEditado && parseNumero(editado.largo) > 0 && parseNumero(editado.cantidad) > 0
                      ? calcularListon(listonEditado, parseNumero(editado.largo), parseNumero(editado.cantidad))
                      : null;

                    return (
                      <tr key={item.id} className={seleccionados.has(item.id) ? "cc-rowSelected" : ""}>
                        <td className="cc-noprint">
                          <input type="checkbox" className="cc-checkbox" checked={seleccionados.has(item.id)} onChange={() => toggleSeleccion(item.id)} />
                        </td>
                        {isEditing ? (
                          <>
                            <td><input type="number" className="cc-tableInput cc-tableInput--short" value={editado.cantidad} onChange={(e) => setEditado((actual) => ({ ...actual, cantidad: e.target.value }))} /></td>
                            <td>
                              <select className="cc-tableSelect" value={editado.listonCode} onChange={(e) => setEditado((actual) => ({ ...actual, listonCode: e.target.value }))}>
                                {LISTONES.map((liston) => (
                                  <option key={liston.codigo} value={liston.codigo}>{liston.codigo} - {liston.nombre}</option>
                                ))}
                              </select>
                            </td>
                            <td><input type="number" className="cc-tableInput cc-tableInput--short" value={editado.largo} onChange={(e) => setEditado((actual) => ({ ...actual, largo: e.target.value }))} /></td>
                            <td>{previewEdit ? `${formatARS(previewEdit.metrosPedidos)} m` : "-"}</td>
                            <td>{previewEdit ? `${previewEdit.varillas} / ${formatARS(previewEdit.metrosCobrados)} m` : "-"}</td>
                            <td>{previewEdit ? `${formatARS(previewEdit.sobranteCm).replace(",00", "")} cm` : "-"}</td>
                            <td>{previewEdit ? `$ ${formatARS(previewEdit.subtotal)}` : "-"}</td>
                            <td className="cc-noprint">
                              <div className="cc-rowActions">
                                <button type="button" className="cc-rowBtn cc-rowBtn--save" onClick={guardarEdicion}>Guardar</button>
                                <button type="button" className="cc-rowBtn" onClick={cancelarEdicion}>Cancelar</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{item.cantidad}</td>
                            <td>{item.codigo} - {item.nombre}</td>
                            <td>{item.largo} cm</td>
                            <td>{formatARS(item.metrosPedidos)} m</td>
                            <td>{item.varillas} / {formatARS(item.metrosCobrados)} m</td>
                            <td>{formatARS(item.sobranteCm).replace(",00", "")} cm</td>
                            <td>$ {formatARS(item.subtotal)}</td>
                            <td className="cc-noprint">
                              <button type="button" className="cc-rowBtn" onClick={() => iniciarEdicion(item)}>Editar</button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={6} className="cc-noprint" />
                  <th>{formatARS(totalVarillas).replace(",00", "")} varillas</th>
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
            <button className="cc-actionBtn cc-btnCopy" title="Copiar tabla" onClick={copiarTabla}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
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

        <div className="cc-totalStrip">
          <span className="cc-totalLabel">{formatARS(totalCortes).replace(",00", "")} cortes / {formatARS(totalVarillas).replace(",00", "")} varillas</span>
          <span className="cc-totalAmount">$ {formatARS(total)}</span>
        </div>
      </div>
    </div>
  );
}
