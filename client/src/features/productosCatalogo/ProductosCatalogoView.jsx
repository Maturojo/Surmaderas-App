import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  actualizarClasificacionMultiple,
  crearCategoriaOSubcategoria,
  eliminarCategoria,
  eliminarSubcategoria,
  guardarAccionHistorial,
  limpiarHistorialProductos,
  obtenerFiltrosProductos,
  obtenerHistorialProductos,
  obtenerProductosCatalogo,
} from "../../services/productosService";
import { imprimirCarteles } from "../../utils/imprimirCarteles";
import "../../css/productos-catalogo.css";

const toast = {
  success: (title) => Swal.fire({ toast: true, position: "top-end", timer: 2200, showConfirmButton: false, icon: "success", title }),
  error: (title) => Swal.fire({ toast: true, position: "top-end", timer: 2600, showConfirmButton: false, icon: "error", title }),
  warning: (title) => Swal.fire({ toast: true, position: "top-end", timer: 2200, showConfirmButton: false, icon: "warning", title }),
};

const PAGE_SIZE = 60;

const CATEGORY_THEMES = {
  "Artística": {
    bg: "#f3ecff",
    border: "#a977ff",
    chipBg: "#eadbff",
    chipColor: "#6f35d6",
    codeColor: "#6f35d6",
  },
  "Candy bar y LASER": {
    bg: "#fff2f4",
    border: "#f29aaa",
    chipBg: "#fde3e8",
    chipColor: "#bc4a61",
    codeColor: "#c13f56",
  },
  Cortineria: {
    bg: "#effcfc",
    border: "#8ce3ea",
    chipBg: "#daf6f4",
    chipColor: "#2d7f86",
    codeColor: "#2d7f86",
  },
  Listoneria: {
    bg: "#fff8eb",
    border: "#f2c46d",
    chipBg: "#fde8bf",
    chipColor: "#9d6a15",
    codeColor: "#b57718",
  },
  Molduras: {
    bg: "#eefdff",
    border: "#6fc9d5",
    chipBg: "#ccf1f7",
    chipColor: "#2c7180",
    codeColor: "#2c7180",
  },
  Muebles: {
    bg: "#f3fff2",
    border: "#7ce58a",
    chipBg: "#ddf9db",
    chipColor: "#3f8b45",
    codeColor: "#4d8b30",
  },
  "TODO PARA INFANTILES": {
    bg: "#fff6e6",
    border: "#f4ae57",
    chipBg: "#f8d39b",
    chipColor: "#c1640a",
    codeColor: "#dd6f16",
  },
  "TODO en accesorios para hogar": {
    bg: "#f8f6f6",
    border: "#c9bbbb",
    chipBg: "#eee5e5",
    chipColor: "#6f5858",
    codeColor: "#4c4c4c",
  },
  "Sin clasificar": {
    bg: "#eef4ff",
    border: "#6a95ff",
    chipBg: "#d9e5ff",
    chipColor: "#4b6ec8",
    codeColor: "#4b6ec8",
  },
};

function normalizarTexto(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ");
}

function fmtDate(value) {
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function getCardTheme(categoria) {
  const categoriaNormalizada = normalizarTexto(categoria) || "Sin clasificar";
  const theme = CATEGORY_THEMES[categoriaNormalizada] || CATEGORY_THEMES["Sin clasificar"];

  return {
    "--pc-card-bg": theme.bg,
    "--pc-card-border": theme.border,
    "--pc-chip-bg": theme.chipBg,
    "--pc-chip-color": theme.chipColor,
    "--pc-category-accent": theme.chipColor,
    "--pc-subcategory-accent": theme.chipColor,
    "--pc-code-color": theme.codeColor,
  };
}

export default function ProductosCatalogoView() {
  const [productos, setProductos] = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [page, setPage] = useState(1);
  const [categorias, setCategorias] = useState([]);
  const [subcategoriasPorCategoria, setSubcategoriasPorCategoria] = useState({});
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historial, setHistorial] = useState([]);
  const [mostrandoHistorial, setMostrandoHistorial] = useState(false);
  const [formatoImpresion, setFormatoImpresion] = useState("a4");

  const [editandoMultiple, setEditandoMultiple] = useState(false);
  const [categoriaMultiple, setCategoriaMultiple] = useState("");
  const [subcategoriaMultiple, setSubcategoriaMultiple] = useState("");
  const [guardandoMultiple, setGuardandoMultiple] = useState(false);

  const [mostrandoEditorCategorias, setMostrandoEditorCategorias] = useState(false);
  const [categoriaBaseNuevaSub, setCategoriaBaseNuevaSub] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");
  const [errorNuevaClasificacion, setErrorNuevaClasificacion] = useState("");

  const [mostrandoEliminar, setMostrandoEliminar] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState("");
  const [subcategoriaAEliminar, setSubcategoriaAEliminar] = useState("");
  const [eliminandoClasificacion, setEliminandoClasificacion] = useState(false);

  const subcategoriasDisponibles = useMemo(() => {
    if (!categoriaSeleccionada) return [];
    return subcategoriasPorCategoria[categoriaSeleccionada] || [];
  }, [categoriaSeleccionada, subcategoriasPorCategoria]);

  const subcategoriasMultiplesDisponibles = useMemo(() => {
    if (!categoriaMultiple) return [];
    return subcategoriasPorCategoria[categoriaMultiple] || [];
  }, [categoriaMultiple, subcategoriasPorCategoria]);

  const subcategoriasEliminarDisponibles = useMemo(() => {
    if (!categoriaAEliminar) return [];
    return subcategoriasPorCategoria[categoriaAEliminar] || [];
  }, [categoriaAEliminar, subcategoriasPorCategoria]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalProductos || 0) / PAGE_SIZE)),
    [totalProductos]
  );

  const todosSeleccionados =
    productos.length > 0 && productos.every((producto) => seleccionados.some((sel) => sel._id === producto._id));

  async function confirmar({ titulo, texto, icon = "warning" }) {
    const result = await Swal.fire({
      title: titulo,
      text: texto,
      icon,
      showCancelButton: true,
      confirmButtonText: "Si, continuar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });
    return result.isConfirmed;
  }

  async function cargarFiltros() {
    const data = await obtenerFiltrosProductos();
    setCategorias(data.categorias || []);
    setSubcategoriasPorCategoria(data.subcategorias || {});
  }

  async function cargarProductos() {
    setLoading(true);
    setError("");
    try {
      const data = await obtenerProductosCatalogo({
        categoria: categoriaSeleccionada,
        subcategoria: subcategoriaSeleccionada,
        q: busqueda,
        page,
        limit: PAGE_SIZE,
      });
      setProductos(data.items || []);
      setTotalProductos(Number(data.total || 0));
    } catch (err) {
      setError(err.message || "No se pudieron cargar los productos");
      toast.error("No se pudieron cargar los productos.");
      setProductos([]);
      setTotalProductos(0);
    } finally {
      setLoading(false);
    }
  }

  async function cargarHistorial() {
    try {
      setHistorial((await obtenerHistorialProductos()) || []);
    } catch {
      toast.error("No se pudo cargar el historial.");
    }
  }

  async function refrescarVista() {
    try {
      await Promise.all([cargarFiltros(), cargarProductos(), cargarHistorial()]);
      toast.success("Productos actualizados.");
    } catch {
      toast.error("No se pudo actualizar la vista de productos.");
    }
  }

  useEffect(() => {
    cargarFiltros().catch(() => toast.error("No se pudieron cargar los filtros."));
    cargarHistorial();
  }, []);

  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaSeleccionada, subcategoriaSeleccionada, busqueda, page]);

  useEffect(() => {
    let cancelled = false;

    async function refrescarSilencioso() {
      try {
        const [filtros, productosData] = await Promise.all([
          obtenerFiltrosProductos(),
          obtenerProductosCatalogo({
            categoria: categoriaSeleccionada,
            subcategoria: subcategoriaSeleccionada,
            q: busqueda,
            page,
            limit: PAGE_SIZE,
          }),
        ]);

        if (cancelled) return;

        setCategorias(filtros.categorias || []);
        setSubcategoriasPorCategoria(filtros.subcategorias || {});
        setProductos(productosData.items || []);
        setTotalProductos(Number(productosData.total || 0));
      } catch {
        // Evitamos ruido visual en refrescos automaticos.
      }
    }

    function onFocus() {
      refrescarSilencioso();
    }

    function onVisibilityChange() {
      if (!document.hidden) refrescarSilencioso();
    }

    const intervalId = window.setInterval(refrescarSilencioso, 15000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [categoriaSeleccionada, subcategoriaSeleccionada, busqueda, page]);

  useEffect(() => {
    setPage(1);
  }, [categoriaSeleccionada, subcategoriaSeleccionada, busqueda]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setSeleccionados((prev) => prev.filter((sel) => productos.some((p) => p._id === sel._id)));
  }, [productos]);

  async function guardarEnHistorial(accion) {
    try {
      const nuevo = await guardarAccionHistorial(accion);
      setHistorial((prev) => [nuevo, ...prev].slice(0, 100));
    } catch {
      toast.error("No se pudo guardar en el historial.");
    }
  }

  function toggleSeleccion(producto) {
    setSeleccionados((prev) => {
      const existe = prev.some((p) => p._id === producto._id);
      return existe ? prev.filter((p) => p._id !== producto._id) : [...prev, producto];
    });
  }

  function toggleSeleccionTodos() {
    if (!productos.length) return;
    if (todosSeleccionados) {
      setSeleccionados((prev) => prev.filter((sel) => !productos.some((p) => p._id === sel._id)));
      return;
    }

    const map = new Map();
    seleccionados.forEach((item) => map.set(item._id, item));
    productos.forEach((item) => map.set(item._id, item));
    setSeleccionados(Array.from(map.values()));
  }

  async function guardarClasificacionMultiple() {
    if (!seleccionados.length) return toast.warning("Selecciona al menos un producto.");

    try {
      setGuardandoMultiple(true);
      await actualizarClasificacionMultiple(
        seleccionados.map((item) => item._id),
        { categoria: categoriaMultiple, subcategoria: subcategoriaMultiple }
      );
      await guardarEnHistorial({
        tipo: "clasificacion-multiple",
        descripcion: `Se actualizaron ${seleccionados.length} productos a ${categoriaMultiple || "Sin clasificar"} > ${subcategoriaMultiple || "Sin subcategoria"}`,
        cantidad: seleccionados.length,
        categoria: categoriaMultiple || "Sin clasificar",
        subcategoria: subcategoriaMultiple || "Sin subcategoria",
      });
      await cargarFiltros();
      await cargarProductos();
      setSeleccionados([]);
      setEditandoMultiple(false);
      setCategoriaMultiple("");
      setSubcategoriaMultiple("");
      toast.success("Clasificacion actualizada correctamente.");
    } catch {
      toast.error("No se pudo actualizar la clasificacion multiple.");
    } finally {
      setGuardandoMultiple(false);
    }
  }

  async function quitarClasificacionMultiple() {
    if (!seleccionados.length) return toast.warning("Selecciona al menos un producto.");

    try {
      setGuardandoMultiple(true);
      await actualizarClasificacionMultiple(
        seleccionados.map((item) => item._id),
        { categoria: "", subcategoria: "" }
      );
      await guardarEnHistorial({
        tipo: "quitar-clasificacion-multiple",
        descripcion: `Se quito la clasificacion de ${seleccionados.length} productos`,
        cantidad: seleccionados.length,
        categoria: "Sin clasificar",
        subcategoria: "Sin subcategoria",
      });
      await cargarFiltros();
      await cargarProductos();
      setSeleccionados([]);
      setEditandoMultiple(false);
      toast.success("Clasificacion eliminada correctamente.");
    } catch {
      toast.error("No se pudo quitar la clasificacion multiple.");
    } finally {
      setGuardandoMultiple(false);
    }
  }

  async function guardarNuevaCategoriaOSubcategoria() {
    const categoriaExistenteElegida = normalizarTexto(categoriaBaseNuevaSub);
    const categoriaNueva = normalizarTexto(nuevaCategoria);
    const subNueva = normalizarTexto(nuevaSubcategoria);
    const categoriaFinal = categoriaNueva || categoriaExistenteElegida;

    if (!categoriaFinal) {
      setErrorNuevaClasificacion("Tenes que elegir o escribir una categoria.");
      return;
    }

    if (
      categoriaFinal.toLowerCase() === "sin clasificar" ||
      subNueva.toLowerCase() === "sin subcategoria"
    ) {
      setErrorNuevaClasificacion("Ese nombre no se puede usar.");
      return;
    }

    try {
      await crearCategoriaOSubcategoria({ categoria: categoriaFinal, subcategoria: subNueva || "" });
      await cargarFiltros();
      await guardarEnHistorial({
        tipo: "crear-categoria-subcategoria",
        descripcion: subNueva ? `Se creo ${categoriaFinal} > ${subNueva}` : `Se creo la categoria ${categoriaFinal}`,
        cantidad: 0,
        categoria: categoriaFinal,
        subcategoria: subNueva || "",
      });
      setCategoriaMultiple(categoriaFinal);
      setSubcategoriaMultiple(subNueva || "");
      setMostrandoEditorCategorias(false);
      setCategoriaBaseNuevaSub("");
      setNuevaCategoria("");
      setNuevaSubcategoria("");
      setErrorNuevaClasificacion("");
      toast.success("Categoria / subcategoria guardada.");
    } catch {
      toast.error("No se pudo guardar la categoria / subcategoria.");
    }
  }

  async function limpiarHistorial() {
    const ok = await confirmar({ titulo: "Limpiar historial?", texto: "Se eliminaran todas las acciones registradas." });
    if (!ok) return;
    try {
      await limpiarHistorialProductos();
      setHistorial([]);
      toast.success("Historial limpiado correctamente.");
    } catch {
      toast.error("No se pudo limpiar el historial.");
    }
  }

  async function eliminarCategoriaCompleta() {
    if (!categoriaAEliminar) return toast.warning("Selecciona una categoria.");
    const ok = await confirmar({ titulo: "Eliminar categoria?", texto: `Se eliminara la categoria ${categoriaAEliminar} y se limpiaran los productos asociados.` });
    if (!ok) return;

    try {
      setEliminandoClasificacion(true);
      const resultado = await eliminarCategoria(categoriaAEliminar);
      await guardarEnHistorial({
        tipo: "eliminar-categoria",
        descripcion: `Se elimino la categoria ${categoriaAEliminar} y se limpiaron ${resultado.productosActualizados || 0} productos`,
        cantidad: resultado.productosActualizados || 0,
        categoria: categoriaAEliminar,
        subcategoria: "",
      });
      await cargarFiltros();
      await cargarProductos();
      setMostrandoEliminar(false);
      setCategoriaAEliminar("");
      setSubcategoriaAEliminar("");
      toast.success("Categoria eliminada correctamente.");
    } catch {
      toast.error("No se pudo eliminar la categoria.");
    } finally {
      setEliminandoClasificacion(false);
    }
  }

  async function eliminarSubcategoriaIndividual() {
    if (!categoriaAEliminar || !subcategoriaAEliminar) return toast.warning("Selecciona categoria y subcategoria.");
    const ok = await confirmar({ titulo: "Eliminar subcategoria?", texto: `Se eliminara la subcategoria ${subcategoriaAEliminar} de ${categoriaAEliminar}.` });
    if (!ok) return;

    try {
      setEliminandoClasificacion(true);
      const resultado = await eliminarSubcategoria(categoriaAEliminar, subcategoriaAEliminar);
      await guardarEnHistorial({
        tipo: "eliminar-subcategoria",
        descripcion: `Se elimino la subcategoria ${categoriaAEliminar} > ${subcategoriaAEliminar} y se limpiaron ${resultado.productosActualizados || 0} productos`,
        cantidad: resultado.productosActualizados || 0,
        categoria: categoriaAEliminar,
        subcategoria: subcategoriaAEliminar,
      });
      await cargarFiltros();
      await cargarProductos();
      setMostrandoEliminar(false);
      setCategoriaAEliminar("");
      setSubcategoriaAEliminar("");
      toast.success("Subcategoria eliminada correctamente.");
    } catch {
      toast.error("No se pudo eliminar la subcategoria.");
    } finally {
      setEliminandoClasificacion(false);
    }
  }

  return (
    <section className="pc-page">
      <div className="pc-hero">
        <div>
          <div className="pc-kicker">Catalogo</div>
          <h1 className="pc-title">Productos</h1>
          <p className="pc-copy">Version copiada del proyecto de precios para clasificar, seleccionar e imprimir carteles sin salir de Sur Maderas.</p>
        </div>
        <div className="pc-heroMeta">
          <div className="pc-metaCard">
            <span className="pc-metaLabel">Productos filtrados</span>
            <strong className="pc-metaValue">{totalProductos}</strong>
          </div>
          <div className="pc-metaCard">
            <span className="pc-metaLabel">Seleccionados</span>
            <strong className="pc-metaValue">{seleccionados.length}</strong>
          </div>
          <div className="pc-metaCard">
            <span className="pc-metaLabel">Pagina</span>
            <strong className="pc-metaValue">{page}</strong>
          </div>
        </div>
      </div>

      <div className="pc-toolbar">
        <div className="pc-actions">
          <button className="pc-btn" onClick={toggleSeleccionTodos} disabled={!productos.length}>
            {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
          <button className="pc-btn" onClick={() => setSeleccionados([])} disabled={!seleccionados.length}>Limpiar seleccion</button>
          <button className="pc-btn" onClick={() => setEditandoMultiple(true)} disabled={!seleccionados.length}>Editar clasificacion ({seleccionados.length})</button>
          <button className="pc-btn" onClick={() => setMostrandoEditorCategorias(true)}>Nueva categoria / subcategoria</button>
          <button className="pc-btn pc-btn--danger" onClick={() => setMostrandoEliminar(true)}>Eliminar categoria / subcategoria</button>
          <button className="pc-btn" onClick={refrescarVista}>Actualizar</button>
          <button className="pc-btn" onClick={() => setMostrandoHistorial((prev) => !prev)}>{mostrandoHistorial ? "Ocultar historial" : "Ver historial"}</button>
          <select className="pc-select" value={formatoImpresion} onChange={(e) => setFormatoImpresion(e.target.value)}>
            <option value="a4">Cartel A4</option>
            <option value="media-a4">Media hoja</option>
          </select>
          <button className="pc-btn pc-btn--primary" onClick={() => imprimirCarteles(seleccionados, formatoImpresion)} disabled={!seleccionados.length}>Imprimir ({seleccionados.length})</button>
        </div>

        <div className="pc-filters">
          <input className="pc-input" type="text" placeholder="Buscar por nombre o codigo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select value={categoriaSeleccionada} onChange={(e) => { setCategoriaSeleccionada(e.target.value); setSubcategoriaSeleccionada(e.target.value === "Sin clasificar" ? "Sin subcategoria" : ""); }}>
            <option value="">Todas las categorias</option>
            {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={subcategoriaSeleccionada} onChange={(e) => setSubcategoriaSeleccionada(e.target.value)} disabled={!categoriaSeleccionada}>
            <option value="">Todas las subcategorias</option>
            {subcategoriasDisponibles.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>

        <div className="pc-filterSummary">
          <span className="pc-filterChip">{categoriaSeleccionada || "Todas las categorias"}</span>
          <span className="pc-filterChip">{subcategoriaSeleccionada || "Todas las subcategorias"}</span>
          <span className="pc-filterChip">Mostrando {productos.length} de {totalProductos}</span>
        </div>
      </div>

      {seleccionados.length ? (
        <div className="pc-panel pc-selectionBar">
          <div>
            <strong>{seleccionados.length} productos seleccionados</strong>
            <div className="pc-state">La seleccion se mantiene mientras filtras o buscas.</div>
          </div>
          <div className="pc-selectionTags">
            {seleccionados.slice(0, 6).map((item) => (
              <span key={item._id} className="pc-tag">{item.codigo} {item.nombre}</span>
            ))}
            {seleccionados.length > 6 ? <span className="pc-tag">+{seleccionados.length - 6} mas</span> : null}
          </div>
        </div>
      ) : null}

      {mostrandoEditorCategorias ? (
        <div className="pc-panel">
          <h3>Agregar categoria o subcategoria</h3>
          <div className="pc-editGrid">
            <select value={categoriaBaseNuevaSub} onChange={(e) => setCategoriaBaseNuevaSub(e.target.value)}>
              <option value="">Elegir categoria existente</option>
              {categorias.filter((cat) => cat !== "Sin clasificar").map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="text" placeholder="O escribir categoria nueva" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
            <input type="text" placeholder="Subcategoria nueva (opcional)" value={nuevaSubcategoria} onChange={(e) => setNuevaSubcategoria(e.target.value)} />
          </div>
          {errorNuevaClasificacion ? <p className="pc-state pc-state--error">{errorNuevaClasificacion}</p> : null}
          <div className="pc-editActions">
            <button className="pc-btn pc-btn--primary" onClick={guardarNuevaCategoriaOSubcategoria}>Guardar</button>
            <button className="pc-btn" onClick={() => { setMostrandoEditorCategorias(false); setErrorNuevaClasificacion(""); }}>Cancelar</button>
          </div>
        </div>
      ) : null}

      {editandoMultiple ? (
        <div className="pc-panel">
          <h3>Editar clasificacion de seleccionados</h3>
          <div className="pc-editGrid">
            <select value={categoriaMultiple} onChange={(e) => { setCategoriaMultiple(e.target.value); setSubcategoriaMultiple(""); }}>
              <option value="">Sin clasificar</option>
              {categorias.filter((cat) => cat !== "Sin clasificar").map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={subcategoriaMultiple} onChange={(e) => setSubcategoriaMultiple(e.target.value)} disabled={!categoriaMultiple}>
              <option value="">Sin subcategoria</option>
              {subcategoriasMultiplesDisponibles.filter((sub) => sub !== "Sin subcategoria").map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div className="pc-editActions">
            <button className="pc-btn pc-btn--primary" onClick={guardarClasificacionMultiple} disabled={guardandoMultiple}>Guardar clasificacion</button>
            <button className="pc-btn" onClick={quitarClasificacionMultiple} disabled={guardandoMultiple}>Quitar clasificacion</button>
            <button className="pc-btn" onClick={() => setEditandoMultiple(false)} disabled={guardandoMultiple}>Cancelar</button>
          </div>
        </div>
      ) : null}

      {mostrandoEliminar ? (
        <div className="pc-panel">
          <h3>Eliminar categoria o subcategoria</h3>
          <div className="pc-editGrid">
            <select value={categoriaAEliminar} onChange={(e) => { setCategoriaAEliminar(e.target.value); setSubcategoriaAEliminar(""); }}>
              <option value="">Seleccionar categoria</option>
              {categorias.filter((cat) => cat !== "Sin clasificar").map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={subcategoriaAEliminar} onChange={(e) => setSubcategoriaAEliminar(e.target.value)} disabled={!categoriaAEliminar}>
              <option value="">Seleccionar subcategoria</option>
              {subcategoriasEliminarDisponibles.filter((sub) => sub !== "Sin subcategoria").map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div className="pc-editActions">
            <button className="pc-btn pc-btn--danger" onClick={eliminarCategoriaCompleta} disabled={!categoriaAEliminar || eliminandoClasificacion}>Eliminar categoria completa</button>
            <button className="pc-btn pc-btn--danger" onClick={eliminarSubcategoriaIndividual} disabled={!categoriaAEliminar || !subcategoriaAEliminar || eliminandoClasificacion}>Eliminar solo subcategoria</button>
            <button className="pc-btn" onClick={() => setMostrandoEliminar(false)} disabled={eliminandoClasificacion}>Cancelar</button>
          </div>
        </div>
      ) : null}

      {mostrandoHistorial ? (
        <div className="pc-panel">
          <div className="pc-selectionBar">
            <div>
              <strong>Historial de acciones</strong>
              <div className="pc-state">Registro de cambios manuales sobre el catalogo.</div>
            </div>
            <button className="pc-btn" onClick={limpiarHistorial} disabled={!historial.length}>Limpiar historial</button>
          </div>
          {!historial.length ? <p className="pc-state">Todavia no hay acciones registradas.</p> : (
            <div className="pc-historyList">
              {historial.map((item) => (
                <div key={item.id || item._id} className="pc-historyItem">
                  <strong>{item.descripcion}</strong>
                  <div className="pc-historyMeta">{fmtDate(item.fecha)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {loading ? <p className="pc-state">Cargando productos...</p> : null}
      {error ? <p className="pc-state pc-state--error">{error}</p> : null}

      {!loading && !error ? (
        <div className="pc-grid">
          {productos.map((producto) => {
            const checked = seleccionados.some((item) => item._id === producto._id);
            return (
              <article
                key={producto._id}
                className={`pc-card${checked ? " pc-card--selected" : ""}`}
                style={getCardTheme(producto.categoria, producto.subcategoria)}
              >
                <label className="pc-check">
                  <input type="checkbox" checked={checked} onChange={() => toggleSeleccion(producto)} />
                  Seleccionar
                </label>
                <div className="pc-cardTop">
                  <span className="pc-cardCode">{producto.codigo}</span>
                  <span className="pc-cardPrice">${Number(producto.precio || 0).toLocaleString("es-AR")}</span>
                </div>
                <h3 className="pc-cardTitle">{producto.nombre}</h3>
                <div className="pc-cardTags">
                  <span>{producto.categoria || "Sin clasificar"}</span>
                  <span>{producto.subcategoria || "Sin subcategoria"}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && totalPages > 1 ? (
        <div className="pc-panel pc-pagination">
          <div className="pc-state">
            Pagina <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>
          <div className="pc-editActions">
            <button className="pc-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="pc-btn" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>Anterior</button>
            <button className="pc-btn" onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} disabled={page === totalPages}>Siguiente</button>
            <button className="pc-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        </div>
      ) : null}

      {!loading && !error && !productos.length ? <p className="pc-state">No hay productos para esos filtros.</p> : null}
    </section>
  );
}
