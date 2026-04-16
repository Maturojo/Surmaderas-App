import { useMemo, useState } from "react";
import { PLACAS_ACTUALIZACION, PLACAS_DATA } from "../data/placasData";
import { generarListaPlacasPdf } from "../utils/placasPdf";
import "../css/lista-placas.css";

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function parseMedida(medida = "") {
  const normalized = String(medida || "").replace(/\s/g, "").replace(",", ".");
  const parts = normalized.split("x").map(Number).filter((value) => Number.isFinite(value));
  if (parts.length !== 2) return null;
  return { ancho: parts[0], alto: parts[1] };
}

function formatMedidaNumero(value) {
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function getMediasPlaca(medida = "") {
  const parsed = parseMedida(medida);
  if (!parsed) return { vertical: "-", horizontal: "-" };
  return {
    vertical: `${formatMedidaNumero(parsed.ancho / 2)} x ${formatMedidaNumero(parsed.alto)}`,
    horizontal: `${formatMedidaNumero(parsed.ancho)} x ${formatMedidaNumero(parsed.alto / 2)}`,
  };
}

function HalfPlateDiagram({ orientation }) {
  const titleByOrientation = {
    entera: "Placa entera",
    vertical: "1/2 placa vertical",
    horizontal: "1/2 placa horizontal",
  };

  return (
    <div className={`placas-diagram placas-diagram--${orientation}`}>
      <span className="placas-diagramLabel">{titleByOrientation[orientation] || orientation}</span>
      <div className="placas-diagramBoard">
        <span className="placas-diagramCut" />
      </div>
    </div>
  );
}
export default function ListaPlacas() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");

  const categorias = useMemo(
    () => ["Todas", ...PLACAS_DATA.map((bloque) => bloque.categoria)],
    []
  );

  const bloques = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return PLACAS_DATA.map((bloque) => ({
      ...bloque,
      items: bloque.items.filter((item) => {
        if (categoriaActiva !== "Todas" && bloque.categoria !== categoriaActiva) return false;
        if (!termino) return true;

        const medias = getMediasPlaca(item.medida);
        const texto = [
          bloque.categoria,
          item.nombre,
          item.medida,
          item.espesor,
          medias.vertical,
          medias.horizontal,
        ]
          .join(" ")
          .toLowerCase();
        return texto.includes(termino);
      }),
    })).filter((bloque) => bloque.items.length > 0);
  }, [busqueda, categoriaActiva]);

  const totalItems = useMemo(
    () => bloques.reduce((acc, bloque) => acc + bloque.items.length, 0),
    [bloques]
  );

  function handlePdf(autoPrint = false) {
    generarListaPlacasPdf({
      bloques,
      categoriaActiva,
      busqueda: busqueda.trim(),
      autoPrint,
    });
  }

  return (
    <section className="placas-page">
      <div className="placas-hero">
        <div>
          <div className="placas-kicker">Modulo nuevo</div>
          <h1 className="placas-title">Lista de placas</h1>
          <p className="placas-copy">
            Referencia armada en base a la primera hoja del Excel de precios. Incluye medida,
            espesor, placa entera y media placa horizontal o vertical.
          </p>

          <div className="placas-heroDiagrams" aria-label="Referencia visual de corte de placa">
            <HalfPlateDiagram orientation="entera" />
            <HalfPlateDiagram orientation="vertical" />
            <HalfPlateDiagram orientation="horizontal" />
          </div>
        </div>

        <div className="placas-metaGrid">
          <article className="placas-metaCard">
            <span className="placas-metaLabel">Categorias</span>
            <strong className="placas-metaValue">{PLACAS_DATA.length}</strong>
          </article>
          <article className="placas-metaCard">
            <span className="placas-metaLabel">Items visibles</span>
            <strong className="placas-metaValue">{totalItems}</strong>
          </article>
          <article className="placas-metaCard">
            <span className="placas-metaLabel">Actualizado</span>
            <strong className="placas-metaValue placas-metaValue--small">{PLACAS_ACTUALIZACION}</strong>
          </article>
        </div>
      </div>

      <div className="placas-toolbar">
        <div className="placas-toolbarTop">
          <input
            className="placas-search"
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, medida o espesor"
          />

          <div className="placas-actions">
            <button type="button" className="placas-actionBtn" onClick={() => handlePdf(false)}>
              Descargar PDF
            </button>
            <button
              type="button"
              className="placas-actionBtn placas-actionBtn--primary"
              onClick={() => handlePdf(true)}
            >
              Generar e imprimir PDF
            </button>
          </div>
        </div>

        <div className="placas-filters">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              type="button"
              className={`placas-filter${categoriaActiva === categoria ? " active" : ""}`}
              onClick={() => setCategoriaActiva(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>
      </div>

      {bloques.length === 0 ? (
        <div className="placas-empty">
          No encontramos placas con ese filtro.
        </div>
      ) : (
        <div className="placas-sections">
          {bloques.map((bloque) => (
            <article key={bloque.categoria} className="placas-section">
              <div className="placas-sectionHeader">
                <div>
                  <div className="placas-sectionEyebrow">Categoria</div>
                  <h2>{bloque.categoria}</h2>
                </div>
                <span className="placas-sectionCount">{bloque.items.length} items</span>
              </div>

              <div className="placas-tableWrap">
                <table className="placas-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Medida</th>
                      <th>Espesor</th>
                      <th>Placa entera</th>
                      <th>1/2 placa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.items.map((item) => (
                      <tr key={`${bloque.categoria}-${item.nombre}-${item.medida}-${item.espesor}`}>
                        <td>{item.nombre}</td>
                        <td>{item.medida}</td>
                        <td>{item.espesor}</td>
                        <td>{formatPrice(item.precioPlaca)}</td>
                        <td>{formatPrice(item.precioMedia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="placas-note">
        Los precios incluyen IVA y pueden modificarse sin previo aviso.
      </p>
    </section>
  );
}
