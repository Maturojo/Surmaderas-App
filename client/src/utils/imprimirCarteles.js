import cartelPrintCssUrl from "../css/carteles-print.css?url";

export function imprimirCarteles(productos, formato = "a4") {
  if (!productos.length) {
    alert("No hay productos seleccionados para imprimir.");
    return;
  }

  const configByFormat = {
    a4: { maxProductosPorCartel: 22, bodyClass: "formato-a4" },
    "media-a4": { maxProductosPorCartel: 8, bodyClass: "formato-media-a4" },
  };

  const config = configByFormat[formato] || configByFormat.a4;

  const groups = {};
  productos.forEach((p) => {
    const categoria = String(p.categoria || "Sin clasificar").trim();
    const subcategoria = String(p.subcategoria || "Sin subcategoria").trim();
    const key = `${categoria}|||${subcategoria}`;
    if (!groups[key]) groups[key] = { categoria, subcategoria, items: [] };
    groups[key].items.push(p);
  });

  const chunk = (list, size) => {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  };

  const pagedGroups = Object.values(groups).flatMap((group) => {
    const ordered = [...group.items].sort((a, b) =>
      String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" })
    );
    const blocks = chunk(ordered, config.maxProductosPorCartel);
    return blocks.map((items, index) => ({
      categoria: group.categoria,
      subcategoria: group.subcategoria,
      items,
      numeroCartel: index + 1,
      totalCarteles: blocks.length,
    }));
  });

  const escapeHtml = (text) =>
    String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatPrice = (value) => `$${Number(value || 0).toLocaleString("es-AR")}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Carteles de productos</title>
        <link rel="stylesheet" href="${cartelPrintCssUrl}" />
      </head>
      <body class="${config.bodyClass}">
        <div style="position:sticky;top:0;z-index:10;padding:10px 12px;background:#fff;border-bottom:1px solid #ddd;display:flex;justify-content:flex-end;gap:10px;" class="no-print">
          <button onclick="window.print()" style="height:40px;padding:0 16px;border-radius:10px;border:1px solid #222;background:#222;color:#fff;font-weight:700;cursor:pointer;">Abrir menu de impresion</button>
        </div>
        ${pagedGroups
          .map(
            (group) => `
              <section class="cartel">
                <div class="cartel-header">
                  ${
                    group.subcategoria && group.subcategoria !== "Sin subcategoria"
                      ? `
                        <h1 class="subcategoria">${escapeHtml(group.subcategoria)}</h1>
                        <h2 class="categoria">${escapeHtml(group.categoria)}</h2>
                      `
                      : `
                        <h1 class="subcategoria solo-categoria">${escapeHtml(group.categoria)}</h1>
                      `
                  }
                  ${
                    group.totalCarteles > 1
                      ? `<div class="cartel-info">Cartel ${group.numeroCartel} de ${group.totalCarteles}</div>`
                      : ""
                  }
                </div>
                <div class="cartel-tabla-wrap">
                  <table class="cartel-tabla">
                    <thead>
                      <tr>
                        <th>Cod.</th>
                        <th>Descripcion</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${group.items
                        .map(
                          (p) => `
                            <tr>
                              <td>${escapeHtml(p.codigo)}</td>
                              <td>${escapeHtml(p.nombre)}</td>
                              <td>${formatPrice(p.precio)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </section>
            `
          )
          .join("")}
      </body>
    </html>
  `;

  const popup = window.open("", "_blank");
  if (!popup) {
    alert("No se pudo abrir la ventana de impresion. Revisa si el navegador bloquea popups.");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
}
