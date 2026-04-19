import { useEffect, useMemo, useState } from "react";
import { PLACAS_ACTUALIZACION, PLACAS_DATA } from "../data/placasData";
import { generarListaPlacasPdf } from "../utils/placasPdf";
import "../css/lista-placas.css";

const PLACAS_STORAGE_KEY = "surmaderas-placas-config-v1";

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

function clonePlacasData(data = PLACAS_DATA) {
  return data.map((bloque) => ({
    ...bloque,
    items: (bloque.items || []).map((item) => ({ ...item })),
  }));
}

function getTodayLabel() {
  return new Date().toLocaleDateString("es-AR");
}

function loadPlacasConfig() {
  if (typeof window === "undefined") {
    return { data: clonePlacasData(), actualizacion: PLACAS_ACTUALIZACION };
  }

  try {
    const raw = window.localStorage.getItem(PLACAS_STORAGE_KEY);
    if (!raw) return { data: clonePlacasData(), actualizacion: PLACAS_ACTUALIZACION };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.data)) {
      return { data: clonePlacasData(), actualizacion: PLACAS_ACTUALIZACION };
    }
    return {
      data: clonePlacasData(parsed.data),
      actualizacion: parsed.actualizacion || PLACAS_ACTUALIZACION,
    };
  } catch {
    return { data: clonePlacasData(), actualizacion: PLACAS_ACTUALIZACION };
  }
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
  const initialConfig = useMemo(() => loadPlacasConfig(), []);
  const [placasData, setPlacasData] = useState(initialConfig.data);
  const [actualizacionLabel, setActualizacionLabel] = useState(initialConfig.actualizacion);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const [configOpen, setConfigOpen] = useState(false);
  const [ajusteModo, setAjusteModo] = useState("general");
  const [ajusteCategoria, setAjusteCategoria] = useState("");
  const [ajustePorcentaje, setAjustePorcentaje] = useState("");
  const [mensajeConfig, setMensajeConfig] = useState("");
  const [nuevaPlaca, setNuevaPlaca] = useState({
    categoriaExistente: "",
    categoriaNueva: "",
    nombre: "",
    medida: "",
    espesor: "",
    precioPlaca: "",
    precioMedia: "",
  });

  const categorias = useMemo(
    () => ["Todas", ...placasData.map((bloque) => bloque.categoria)],
    [placasData]
  );

  const bloques = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return placasData.map((bloque) => ({
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
  }, [busqueda, categoriaActiva, placasData]);

  const totalItems = useMemo(
    () => bloques.reduce((acc, bloque) => acc + bloque.items.length, 0),
    [bloques]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PLACAS_STORAGE_KEY,
      JSON.stringify({
        data: placasData,
        actualizacion: actualizacionLabel,
      })
    );
  }, [placasData, actualizacionLabel]);

  function touchActualizacion() {
    setActualizacionLabel(getTodayLabel());
  }

  function actualizarNuevaPlaca(field, value) {
    setNuevaPlaca((prev) => ({ ...prev, [field]: value }));
  }

  function aplicarAjustePrecios() {
    const porcentaje = Number(String(ajustePorcentaje).replace(",", "."));
    if (!Number.isFinite(porcentaje) || porcentaje === 0) {
      setMensajeConfig("Ingresá un porcentaje valido distinto de 0.");
      return;
    }

    if (ajusteModo === "material" && !ajusteCategoria) {
      setMensajeConfig("Elegí una categoria antes de aplicar el aumento por material.");
      return;
    }

    setPlacasData((prev) =>
      prev.map((bloque) => {
        if (ajusteModo === "material" && bloque.categoria !== ajusteCategoria) return bloque;

        return {
          ...bloque,
          items: bloque.items.map((item) => ({
            ...item,
            precioPlaca: Number((item.precioPlaca * (1 + porcentaje / 100)).toFixed(2)),
            precioMedia: Number((item.precioMedia * (1 + porcentaje / 100)).toFixed(2)),
          })),
        };
      })
    );

    touchActualizacion();
    setMensajeConfig(
      ajusteModo === "general"
        ? `Se actualizo toda la lista un ${porcentaje}%.`
        : `Se actualizo ${ajusteCategoria} un ${porcentaje}%.`
    );
    setAjustePorcentaje("");
  }

  function agregarPlacaNueva() {
    const categoriaFinal = (nuevaPlaca.categoriaNueva || nuevaPlaca.categoriaExistente).trim();
    const nombre = nuevaPlaca.nombre.trim();
    const medida = nuevaPlaca.medida.trim();
    const espesor = nuevaPlaca.espesor.trim();
    const precioPlaca = Number(String(nuevaPlaca.precioPlaca).replace(",", "."));
    const precioMedia = Number(String(nuevaPlaca.precioMedia).replace(",", "."));

    if (!categoriaFinal || !nombre || !medida || !espesor) {
      setMensajeConfig("Completa categoria, nombre, medida y espesor para agregar la placa.");
      return;
    }

    if (!Number.isFinite(precioPlaca) || !Number.isFinite(precioMedia)) {
      setMensajeConfig("Cargá precios validos para placa entera y media placa.");
      return;
    }

    setPlacasData((prev) => {
      const existente = prev.find((bloque) => bloque.categoria === categoriaFinal);
      if (existente) {
        return prev.map((bloque) =>
          bloque.categoria === categoriaFinal
            ? {
                ...bloque,
                items: [
                  ...bloque.items,
                  { nombre, medida, espesor, precioPlaca, precioMedia },
                ],
              }
            : bloque
        );
      }

      return [
        ...prev,
        {
          categoria: categoriaFinal,
          items: [{ nombre, medida, espesor, precioPlaca, precioMedia }],
        },
      ];
    });

    touchActualizacion();
    setMensajeConfig(`Se agrego ${nombre} en ${categoriaFinal}.`);
    setNuevaPlaca({
      categoriaExistente: "",
      categoriaNueva: "",
      nombre: "",
      medida: "",
      espesor: "",
      precioPlaca: "",
      precioMedia: "",
    });
  }

  function restablecerListaBase() {
    setPlacasData(clonePlacasData());
    setActualizacionLabel(PLACAS_ACTUALIZACION);
    setMensajeConfig("Se restablecio la lista base de placas.");
  }

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
            <strong className="placas-metaValue">{placasData.length}</strong>
          </article>
          <article className="placas-metaCard">
            <span className="placas-metaLabel">Items visibles</span>
            <strong className="placas-metaValue">{totalItems}</strong>
          </article>
          <article className="placas-metaCard">
            <span className="placas-metaLabel">Actualizado</span>
            <strong className="placas-metaValue placas-metaValue--small">{actualizacionLabel}</strong>
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
            <button
              type="button"
              className="placas-actionBtn"
              onClick={() => setConfigOpen((prev) => !prev)}
            >
              {configOpen ? "Cerrar configuracion" : "Configuracion"}
            </button>
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

      {configOpen ? (
        <section className="placas-configPanel">
          <div className="placas-configGrid">
            <article className="placas-configCard">
              <div className="placas-configTitle">Subir precios</div>
              <p className="placas-configCopy">
                Ajusta toda la lista o solo un tipo de material. El porcentaje impacta placa entera y media placa.
              </p>

              <div className="placas-configInline">
                <label className="placas-field">
                  <span>Modo</span>
                  <select value={ajusteModo} onChange={(event) => setAjusteModo(event.target.value)}>
                    <option value="general">General</option>
                    <option value="material">Por material</option>
                  </select>
                </label>

                {ajusteModo === "material" ? (
                  <label className="placas-field">
                    <span>Material</span>
                    <select
                      value={ajusteCategoria}
                      onChange={(event) => setAjusteCategoria(event.target.value)}
                    >
                      <option value="">Elegir categoria</option>
                      {placasData.map((bloque) => (
                        <option key={bloque.categoria} value={bloque.categoria}>
                          {bloque.categoria}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="placas-field">
                  <span>Porcentaje</span>
                  <input
                    type="number"
                    step="0.01"
                    value={ajustePorcentaje}
                    onChange={(event) => setAjustePorcentaje(event.target.value)}
                    placeholder="Ej: 8"
                  />
                </label>
              </div>

              <div className="placas-configActions">
                <button type="button" className="placas-actionBtn placas-actionBtn--primary" onClick={aplicarAjustePrecios}>
                  Aplicar aumento
                </button>
                <button type="button" className="placas-actionBtn" onClick={restablecerListaBase}>
                  Restablecer lista base
                </button>
              </div>
            </article>

            <article className="placas-configCard">
              <div className="placas-configTitle">Agregar placa nueva</div>
              <p className="placas-configCopy">
                Puedes cargarla dentro de una categoria existente o crear un material nuevo.
              </p>

              <div className="placas-configInline">
                <label className="placas-field">
                  <span>Categoria existente</span>
                  <select
                    value={nuevaPlaca.categoriaExistente}
                    onChange={(event) => actualizarNuevaPlaca("categoriaExistente", event.target.value)}
                  >
                    <option value="">Elegir categoria</option>
                    {placasData.map((bloque) => (
                      <option key={bloque.categoria} value={bloque.categoria}>
                        {bloque.categoria}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="placas-field">
                  <span>O categoria nueva</span>
                  <input
                    value={nuevaPlaca.categoriaNueva}
                    onChange={(event) => actualizarNuevaPlaca("categoriaNueva", event.target.value)}
                    placeholder="Ej: Enchapados"
                  />
                </label>
              </div>

              <div className="placas-configInline">
                <label className="placas-field">
                  <span>Nombre</span>
                  <input
                    value={nuevaPlaca.nombre}
                    onChange={(event) => actualizarNuevaPlaca("nombre", event.target.value)}
                    placeholder="Ej: Roble natural"
                  />
                </label>

                <label className="placas-field">
                  <span>Medida</span>
                  <input
                    value={nuevaPlaca.medida}
                    onChange={(event) => actualizarNuevaPlaca("medida", event.target.value)}
                    placeholder="Ej: 1,83 x 2,75"
                  />
                </label>

                <label className="placas-field">
                  <span>Espesor</span>
                  <input
                    value={nuevaPlaca.espesor}
                    onChange={(event) => actualizarNuevaPlaca("espesor", event.target.value)}
                    placeholder="Ej: 18mm"
                  />
                </label>
              </div>

              <div className="placas-configInline">
                <label className="placas-field">
                  <span>Placa entera</span>
                  <input
                    type="number"
                    step="0.01"
                    value={nuevaPlaca.precioPlaca}
                    onChange={(event) => actualizarNuevaPlaca("precioPlaca", event.target.value)}
                    placeholder="0"
                  />
                </label>

                <label className="placas-field">
                  <span>1/2 placa</span>
                  <input
                    type="number"
                    step="0.01"
                    value={nuevaPlaca.precioMedia}
                    onChange={(event) => actualizarNuevaPlaca("precioMedia", event.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="placas-configActions">
                <button type="button" className="placas-actionBtn placas-actionBtn--primary" onClick={agregarPlacaNueva}>
                  Agregar placa
                </button>
              </div>
            </article>
          </div>

          <div className="placas-configFoot">
            <span>
              Esta configuracion se guarda en este navegador para que puedas seguir editando la lista sin recargar todo desde cero.
            </span>
            {mensajeConfig ? <strong>{mensajeConfig}</strong> : null}
          </div>
        </section>
      ) : null}

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
