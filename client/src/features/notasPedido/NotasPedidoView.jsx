import { useMemo, useRef, useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";

import { crearNotaPedido, listarNotasPedido } from "../../services/notasPedido";
import { useProductos } from "./hooks/useProductos";
import { addBusinessDays, formatDateYYYYMMDD } from "./utils/dates";
import { toARS } from "./utils/money";

import { DEFAULT_TIPO, buildDescripcionFromItem } from "./config/detalleTypes";
import { getCorteMaterialByCode } from "./config/corteMateriales";

import CorteFields from "./components/fields/CorteFields";
import MarcoFields from "./components/fields/MarcoFields";
import CaladoFields from "./components/fields/CaladoFields";
import MuebleFields from "./components/fields/MuebleFields";
import PrestamoFields from "./components/fields/PrestamoFields";

import "../../css/NotasPedido.css";

const vendedores = ["Ariel", "Cecilia", "Gustavo", "Juana", "Matias", "Patricia", "Valentina", "WhatsApp"];

const emptyItem = {
  tipo: DEFAULT_TIPO,
  data: {},
  busqueda: "",
  productoId: "",
  descripcion: "",
  cantidad: 1,
  precio: "",
  especial: false,
  open: false,
  activeIndex: 0,
};

function formatTelefono(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);

  if (digits.startsWith("11")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isTelefonoValido(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^\d{10}$/.test(digits);
}

function formatPriceInput(value) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(Math.round(value));
}

function calcularPrecioUnitarioCorte(item) {
  const data = item?.data || {};
  const material = getCorteMaterialByCode(data.materialCode);
  const largoCm = Number(data.largoMm || 0);
  const anchoCm = Number(data.anchoMm || 0);

  if (!material || largoCm <= 0 || anchoCm <= 0) return "";

  const areaM2 = (largoCm / 100) * (anchoCm / 100);
  return formatPriceInput(areaM2 * material.precioM2);
}

function fmtDate(isoOrYmd) {
  if (!isoOrYmd) return "-";
  if (String(isoOrYmd).includes("-") && String(isoOrYmd).length <= 10) {
    return String(isoOrYmd).split("-").reverse().join("/");
  }
  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-AR");
}

function getNotaClienteNombre(nota) {
  return String(nota?.cliente?.nombre || nota?.cliente || "Sin cliente");
}

function getNotaTotal(nota) {
  return Number(nota?.totales?.total ?? nota?.total ?? 0);
}

function getEstadoComercial(nota) {
  const tipoCaja = String(nota?.caja?.tipo || "").toLowerCase();
  const estado = String(nota?.estado || "").toLowerCase();

  if (tipoCaja === "pago" || estado === "pagada") return "Pagada";
  if (tipoCaja === "seña" || tipoCaja === "sena" || tipoCaja === "senia" || estado === "señada") return "Señada";
  return "Pendiente";
}

export default function NotasPedidoView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { productos } = useProductos();
  const acItemsRef = useRef({});
  const rootRef = useRef(null);
  const prefillMarcoConsumidoRef = useRef(false);

  const [fecha, setFecha] = useState(() => formatDateYYYYMMDD(new Date()));
  const [diasHabiles, setDiasHabiles] = useState(15);
  const [guardando, setGuardando] = useState(false);

  const entregaDate = useMemo(() => {
    const d = addBusinessDays(fecha, Number(diasHabiles || 0));
    return formatDateYYYYMMDD(d);
  }, [fecha, diasHabiles]);

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [notasGuardadas, setNotasGuardadas] = useState([]);
  const [seguimientoLoading, setSeguimientoLoading] = useState(true);
  const [seguimientoError, setSeguimientoError] = useState("");

  const [items, setItems] = useState([{ ...emptyItem }]);
  const telefonoValido = isTelefonoValido(telefono);

  async function loadSeguimiento() {
    setSeguimientoLoading(true);
    setSeguimientoError("");

    try {
      const data = await listarNotasPedido({ q: "", page: 1, limit: 300, guardada: true });
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setNotasGuardadas(arr);
    } catch (e) {
      setSeguimientoError(e?.message || "No se pudieron cargar las notas de seguimiento");
    } finally {
      setSeguimientoLoading(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setItems((prev) => prev.map((it) => ({ ...it, open: false })));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    items.forEach((it, idx) => {
      if (!it.open) return;
      const el = acItemsRef.current[idx]?.[it.activeIndex];
      el?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    });
  }, [items]);

  useEffect(() => {
    setItems((prev) => {
      let changed = false;

      const next = prev.map((item) => {
        if (item.tipo !== "corte") return item;

        const precioCalculado = calcularPrecioUnitarioCorte(item);
        if (String(item.precio || "") === String(precioCalculado || "")) return item;

        changed = true;
        return { ...item, precio: precioCalculado };
      });

      return changed ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    loadSeguimiento();
  }, []);

  useEffect(() => {
    const prefillMarco = location.state?.prefillMarco;

    if (!prefillMarco || prefillMarcoConsumidoRef.current) {
      return;
    }

    prefillMarcoConsumidoRef.current = true;

    setItems([
      {
        ...emptyItem,
        tipo: "marco",
        descripcion: prefillMarco.descripcion || "",
        cantidad: Number(prefillMarco.cantidad || 1),
        precio: prefillMarco.precio || "",
        especial: Boolean(prefillMarco.especial),
        data: prefillMarco.data || {},
      },
    ]);

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const subtotal = useMemo(
    () =>
      items.reduce((acc, it) => {
        const qty = Number(it.cantidad || 0);
        const price = Number(String(it.precio).replace(",", ".") || 0);
        return acc + qty * price;
      }, 0),
    [items]
  );

  const totalFinal = subtotal;
  const notasEnProceso = useMemo(
    () => notasGuardadas.filter((nota) => nota?.estadoOperativo === "En taller"),
    [notasGuardadas]
  );
  const notasEnDeposito = useMemo(
    () => notasGuardadas.filter((nota) => nota?.estadoOperativo === "Finalizado"),
    [notasGuardadas]
  );

  function resetGenerador() {
    setFecha(formatDateYYYYMMDD(new Date()));
    setDiasHabiles(15);
    setCliente("");
    setTelefono("");
    setVendedor("");
    setItems([{ ...emptyItem }]);
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function setItemData(idx, dataPatch) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              data: { ...(it.data || {}), ...dataPatch },
            }
          : it
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function onChangeTipo(idx, tipo) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;

        const next = {
          ...it,
          tipo,
          data: {},
        };

        if (tipo !== "producto") {
          next.busqueda = "";
          next.productoId = "";
          next.open = false;
          next.activeIndex = 0;
        }

        return next;
      })
    );
  }

  function buscarOpciones(q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return [];
    return productos
      .filter((p) => {
        const codigo = String(p.codigo || "").toLowerCase();
        const nombre = String(p.nombre || "").toLowerCase();
        return codigo.includes(query) || nombre.includes(query);
      })
      .slice(0, 30);
  }

  function seleccionarProducto(idx, p) {
    updateItem(idx, {
      productoId: p._id,
      descripcion: `${p.codigo} - ${p.nombre}`,
      precio: String(p.precio ?? ""),
      busqueda: `${p.codigo} - ${p.nombre}`,
      open: false,
      activeIndex: 0,
      data: { ...(items[idx]?.data || {}), nombre: `${p.codigo} - ${p.nombre}` },
    });
  }

  async function onGuardarNota() {
    if (guardando) return;
    setGuardando(true);

    try {
      if (!String(cliente || "").trim()) throw new Error("Falta el nombre del cliente");
      if (!String(telefono || "").trim()) throw new Error("Falta el telefono del cliente");
      if (!telefonoValido) throw new Error("El telefono debe tener formato valido, por ejemplo 223-595-4165");
      if (!String(vendedor || "").trim()) throw new Error("Tenes que seleccionar un vendedor");

      const numero = `NP-${Date.now()}`;

      const itemsMapped = items
        .map((it) => {
          const tipo = it.tipo || DEFAULT_TIPO;
          const descFinal = buildDescripcionFromItem(it);

          if (!String(descFinal || "").trim()) return null;

          const cantidad = Number(it.cantidad || 0);
          const precioUnit = Number(String(it.precio ?? "").replace(",", ".")) || 0;

          return {
            tipo,
            productoId: tipo === "producto" ? it.productoId || null : null,
            descripcion: descFinal,
            cantidad,
            precioUnit,
            especial: Boolean(it.especial),
            data: it.data || {},
            imagen: it?.data?.imagen || null,
          };
        })
        .filter(Boolean)
        .filter((it) => it.cantidad > 0);

      if (itemsMapped.length === 0) throw new Error("Tenes que cargar al menos un item valido");

      const payload = {
        numero,
        fecha,
        entrega: entregaDate,
        diasHabiles: Number(diasHabiles || 0),
        cliente: { nombre: cliente, telefono: telefono || "", direccion: "" },
        vendedor: vendedor || "",
        medioPago: "",
        items: itemsMapped,
        totales: {
          subtotal,
          descuento: 0,
          total: totalFinal,
          adelanto: 0,
          resta: totalFinal,
        },
        pdfBase64: "",
      };

      await crearNotaPedido(payload);

      resetGenerador();
      await loadSeguimiento();

      await Swal.fire({
        icon: "success",
        title: "Nota guardada",
        text: `La nota ${numero} ya puede ir a abonar su nota por caja`,
        timer: 2600,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: e.message || "No se pudo guardar la nota",
      });
    } finally {
      setGuardando(false);
    }
  }

  function renderFieldsByTipo(it, idx) {
    switch (it.tipo) {
      case "corte":
        return <CorteFields it={it} setData={(patch) => setItemData(idx, patch)} />;
      case "marco":
        return <MarcoFields it={it} setData={(patch) => setItemData(idx, patch)} />;
      case "calado":
        return <CaladoFields it={it} productos={productos} setData={(patch) => setItemData(idx, patch)} />;
      case "mueble":
        return <MuebleFields it={it} setData={(patch) => setItemData(idx, patch)} />;
      case "prestamo":
        return <PrestamoFields it={it} setData={(patch) => setItemData(idx, patch)} />;
      case "producto":
      default:
        return null;
    }
  }

  return (
    <div className="np-page" ref={rootRef}>
      <div className="np-card">
        <div className="np-hero">
          <div>
            <div className="np-kicker">Sur Maderas</div>
            <h1 className="np-title">Generador de pedidos</h1>
            <p className="np-copy">
              Armá la nota en el momento, con cliente, entrega y detalle del trabajo listos para pasar a caja.
            </p>
          </div>

          <div className="np-heroStats">
            <div className="np-stat">
              <span className="np-statLabel">Items</span>
              <strong className="np-statValue">{items.length}</strong>
            </div>
            <div className="np-stat">
              <span className="np-statLabel">Entrega</span>
              <strong className="np-statValue">{entregaDate.split("-").reverse().join("/")}</strong>
            </div>
            <div className="np-stat">
              <span className="np-statLabel">Total</span>
              <strong className="np-statValue">${toARS(totalFinal)}</strong>
            </div>
          </div>
        </div>

        <div className="np-sectionCard">
          <div className="np-sectionHead">
            <h2 className="np-section-title">Datos del Cliente</h2>
            <span className="np-sectionHint">Informacion base para generar la nota</span>
          </div>

          <div className="np-grid-2">
            <div className="np-col">
              <div className="np-field">
                <label className="np-label">Fecha:</label>
                <input className="np-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>

              <div className="np-field">
                <label className="np-label">Señores:</label>
                <input
                  className="np-input"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="np-field">
                <label className="np-label">Telefono:</label>
                <input
                  className={`np-input${telefono && !telefonoValido ? " np-input--error" : ""}`}
                  value={telefono}
                  onChange={(e) => setTelefono(formatTelefono(e.target.value))}
                  placeholder="Ej: 2235954165"
                />
                <span className={`np-helpText${telefono && !telefonoValido ? " is-error" : ""}`}>
                  Escribí solo números. Se separa solo mientras tipeás. Ejemplos: 2235954165 o 1123456789.
                </span>
              </div>

              <div className="np-field">
                <label className="np-label">Vendedor:</label>
                <select className={`np-input${!vendedor ? " np-input--error" : ""}`} value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
                  <option value="">Seleccione un vendedor</option>
                  {vendedores.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <span className={`np-helpText${!vendedor ? " is-error" : ""}`}>
                  Elegí el vendedor responsable antes de guardar la nota.
                </span>
              </div>
            </div>

            <div className="np-col">
              <div className="np-field">
                <label className="np-label">Entrega para el dia:</label>
                <input
                  className="np-input np-readonly"
                  readOnly
                  value={`${diasHabiles} dias habiles (${entregaDate.split("-").reverse().join("/")})`}
                />
              </div>

              <div className="np-field">
                <label className="np-label">Dias habiles:</label>
                <input className="np-input" type="number" min={0} value={diasHabiles} onChange={(e) => setDiasHabiles(e.target.value)} />
              </div>

              <div className="np-field">
                <label className="np-label">Fecha entrega:</label>
                <input className="np-input" type="date" value={entregaDate} readOnly />
              </div>
            </div>
          </div>
        </div>

        <div className="np-sectionCard">
          <div className="np-sectionHead">
            <h2 className="np-section-title">Detalle del Pedido</h2>
            <span className="np-sectionHint">Cargá cortes, muebles, productos estandar o prestamos</span>
          </div>

          <div className="np-items">
            {items.map((it, idx) => {
              const opciones = it.tipo === "producto" ? buscarOpciones(it.busqueda) : [];
              acItemsRef.current[idx] = [];

              return (
                <div className={`np-item-row${it.tipo !== "producto" ? " np-item-row--detalle" : ""}`} key={idx}>
                  <select className="np-input" value={it.tipo || DEFAULT_TIPO} onChange={(e) => onChangeTipo(idx, e.target.value)}>
                    <option value="corte">Corte</option>
                    <option value="marco">Marco</option>
                    <option value="calado">Calado</option>
                    <option value="mueble">Mueble</option>
                    <option value="producto">Producto estandar</option>
                    <option value="prestamo">Prestamo</option>
                  </select>

                  <div className="np-item-fields">
                    {it.tipo === "producto" ? (
                      <div className="np-autocomplete">
                        <input
                          className="np-input np-item-search"
                          placeholder="Buscar producto por codigo o nombre..."
                          value={it.busqueda}
                          onFocus={() => updateItem(idx, { open: true })}
                          onChange={(e) => updateItem(idx, { busqueda: e.target.value, open: true, activeIndex: 0 })}
                          onKeyDown={(e) => {
                            if (!it.open) return;
                            if (e.key === "Escape") {
                              e.preventDefault();
                              updateItem(idx, { open: false });
                              return;
                            }
                            if (opciones.length === 0) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              updateItem(idx, { activeIndex: Math.min(it.activeIndex + 1, opciones.length - 1) });
                              return;
                            }
                            if (e.key === "ArrowUp") {
                              e.preventDefault();
                              updateItem(idx, { activeIndex: Math.max(it.activeIndex - 1, 0) });
                              return;
                            }
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const p = opciones[it.activeIndex] || opciones[0];
                              if (p) seleccionarProducto(idx, p);
                            }
                          }}
                        />

                        {it.open && it.busqueda.trim() !== "" && (
                          <div className="np-ac-list">
                            {opciones.length === 0 ? (
                              <div className="np-ac-empty">Sin resultados</div>
                            ) : (
                              opciones.map((p, i) => (
                                <button
                                  ref={(el) => {
                                    if (el) acItemsRef.current[idx][i] = el;
                                  }}
                                  type="button"
                                  key={p._id}
                                  className={`np-ac-item ${i === it.activeIndex ? "is-active" : ""}`}
                                  onMouseEnter={() => updateItem(idx, { activeIndex: i })}
                                  onClick={() => seleccionarProducto(idx, p)}
                                >
                                  <div className="np-ac-main">
                                    {p.codigo} - {p.nombre}
                                  </div>
                                  <div className="np-ac-sub">${toARS(p.precio)}</div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      renderFieldsByTipo(it, idx)
                    )}
                  </div>

                  <input
                    className="np-input np-item-qty"
                    type="number"
                    min={0}
                    value={it.cantidad}
                    onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                  />

                  <input
                    className="np-input np-item-price"
                    placeholder="Precio"
                    value={it.precio}
                    onChange={(e) => updateItem(idx, { precio: e.target.value })}
                    readOnly={it.tipo === "corte"}
                  />

                  <label className="np-check">
                    <input type="checkbox" checked={it.especial} onChange={(e) => updateItem(idx, { especial: e.target.checked })} />
                    <span>Especial</span>
                  </label>

                  {items.length > 1 ? (
                    <button className="np-linkdanger" type="button" onClick={() => removeItem(idx)}>
                      Quitar
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}

            <button className="np-btn np-btn-secondary" type="button" onClick={addItem}>
              Agregar otro producto
            </button>
          </div>
        </div>

        <div className="np-sectionCard">
          <div className="np-sectionHead">
            <h2 className="np-section-title">Totales del Pedido</h2>
            <span className="np-sectionHint">Resumen economico antes de pasar la nota a caja</span>
          </div>

          <div className="np-totals">
            <div className="np-field">
              <label className="np-label">Total $:</label>
              <input className="np-input np-readonly" readOnly value={toARS(totalFinal)} />
            </div>
          </div>
        </div>

        <div className="np-actions">
          <button className="np-btn np-btn-green" type="button" onClick={onGuardarNota} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar Nota"}
          </button>
        </div>

        <div className="np-sectionCard np-sectionCard--tracking">
          <div className="np-sectionHead np-sectionHead--tracking">
            <div>
              <h2 className="np-section-title">Seguimiento de pedidos</h2>
              <span className="np-sectionHint">
                Estos dos bloques quedan aparte del generador, pero dentro del modulo de pedidos.
              </span>
            </div>
            <button
              className="np-btn np-btn-secondary np-btn-secondary--compact"
              type="button"
              onClick={loadSeguimiento}
              disabled={seguimientoLoading}
            >
              {seguimientoLoading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {seguimientoError ? <div className="np-trackingError">{seguimientoError}</div> : null}

          <div className="np-trackingGrid">
            <section className="np-trackingPanel">
              <div className="np-trackingPanelHead">
                <div>
                  <h3 className="np-trackingTitle">Pedidos en taller</h3>
                  <p className="np-trackingCopy">Los pedidos que ya entraron a taller se siguen desde aca.</p>
                </div>
                <span className="np-trackingCount">{notasEnProceso.length}</span>
              </div>

              <div className="np-trackingList">
                {seguimientoLoading ? (
                  <div className="np-trackingEmpty">Cargando...</div>
                ) : notasEnProceso.length === 0 ? (
                  <div className="np-trackingEmpty">Todavia no hay pedidos en taller.</div>
                ) : (
                  notasEnProceso.map((nota) => (
                    <article className="np-trackItem" key={`proceso-${nota?._id || nota?.numero}`}>
                      <div className="np-trackTop">
                        <strong className="np-trackNumber">{nota?.numero || "-"}</strong>
                        <span className="np-trackBadge np-trackBadge--process">{getEstadoComercial(nota)}</span>
                      </div>
                      <div className="np-trackMeta">
                        <span>{getNotaClienteNombre(nota)}</span>
                        <span>Entrega: {fmtDate(nota?.entrega)}</span>
                        <span>Vendedor: {nota?.vendedor || "-"}</span>
                      </div>
                      <div className="np-trackBottom">
                        <span className="np-trackState">En taller</span>
                        <strong className="np-trackTotal">${toARS(getNotaTotal(nota))}</strong>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="np-trackingPanel">
              <div className="np-trackingPanelHead">
                <div>
                  <h3 className="np-trackingTitle">Pedidos en depositos</h3>
                  <p className="np-trackingCopy">Los pedidos finalizados y listos para entrega quedan aca.</p>
                </div>
                <span className="np-trackingCount">{notasEnDeposito.length}</span>
              </div>

              <div className="np-trackingList">
                {seguimientoLoading ? (
                  <div className="np-trackingEmpty">Cargando...</div>
                ) : notasEnDeposito.length === 0 ? (
                  <div className="np-trackingEmpty">Todavia no hay pedidos en depositos.</div>
                ) : (
                  notasEnDeposito.map((nota) => (
                    <article className="np-trackItem" key={`deposito-${nota?._id || nota?.numero}`}>
                      <div className="np-trackTop">
                        <strong className="np-trackNumber">{nota?.numero || "-"}</strong>
                        <span className="np-trackBadge np-trackBadge--deposit">{getEstadoComercial(nota)}</span>
                      </div>
                      <div className="np-trackMeta">
                        <span>{getNotaClienteNombre(nota)}</span>
                        <span>Entrega: {fmtDate(nota?.entrega)}</span>
                        <span>Vendedor: {nota?.vendedor || "-"}</span>
                      </div>
                      <div className="np-trackBottom">
                        <span className="np-trackState">En depósito</span>
                        <strong className="np-trackTotal">${toARS(getNotaTotal(nota))}</strong>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
