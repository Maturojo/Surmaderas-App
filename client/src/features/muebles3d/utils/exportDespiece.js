function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportDespieceCSV({ despiece, filenameBase = "despiece" }) {
  const rows = Array.isArray(despiece) ? despiece : [];
  if (rows.length === 0) return;

  const headers = ["nombre", "pieza", "ancho_mm", "alto_mm", "espesor_mm", "material"];
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(`${filenameBase}.csv`, blob);
}

export function exportDespiecePDFPrint({ despiece, titulo = "Despiece", meta = {} }) {
  const rows = Array.isArray(despiece) ? despiece : [];
  if (rows.length === 0) return;

  const w = window.open("", "_blank");
  if (!w) return;

  const fecha = new Date().toLocaleString();

  const safe = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const metaLines = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `<div><b>${safe(k)}:</b> ${safe(v)}</div>`)
    .join("");

  const htmlRows = rows
    .map(
      (r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${safe(r.nombre)}</td>
        <td>${safe(r.pieza)}</td>
        <td class="num">${safe(r.ancho_mm)}</td>
        <td class="num">${safe(r.alto_mm)}</td>
        <td class="num">${safe(r.espesor_mm)}</td>
        <td>${safe(r.material)}</td>
      </tr>
    `
    )
    .join("");

  w.document.open();
  w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safe(titulo)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .muted { color: #666; font-size: 12px; margin-bottom: 14px; }
    .meta { font-size: 12px; margin: 10px 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
    th { background: #f3f3f3; text-align: left; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .footer { margin-top: 18px; font-size: 11px; color: #666; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:12px;">
    <button onclick="window.print()" style="padding:8px 12px; border:1px solid #ddd; background:#f7f7f7; border-radius:8px; cursor:pointer;">
      Imprimir / Guardar como PDF
    </button>
  </div>

  <h1>${safe(titulo)}</h1>
  <div class="muted">Generado: ${safe(fecha)}</div>

  ${metaLines ? `<div class="meta">${metaLines}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre</th>
        <th>Pieza</th>
        <th>Ancho (mm)</th>
        <th>Largo (mm)</th>
        <th>Espesor (mm)</th>
        <th>Material</th>
      </tr>
    </thead>
    <tbody>
      ${htmlRows}
    </tbody>
  </table>

  <div class="footer">
    Nota: medidas en mm. Se normaliza: espesor = menor dimensión, largo = mayor dimensión, ancho = dimensión intermedia.
  </div>
</body>
</html>
  `);
  w.document.close();
}

/* ===== PNG downloads ===== */
function dataUrlToBlob(dataUrl) {
  const [meta, content] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(content);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function downloadDataUrl(filename, dataUrl) {
  const blob = dataUrlToBlob(dataUrl);
  downloadBlob(filename, blob);
}
