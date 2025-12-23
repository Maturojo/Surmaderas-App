import { useMemo, useState, useEffect, useRef } from "react";
import { listarTodosLosProductos } from "../services/productosService";
import "../css/NotasPedido.css";

const vendedores = ["Matías", "Gustavo", "Ceci", "Guille"];
const mediosPago = ["Efectivo", "Transferencia", "Débito", "Crédito", "Cuenta Corriente"];

const emptyItem = {
  busqueda: "",
  productoId: "",
  descripcion: "",
  cantidad: 1,
  precio: "",
  especial: false,
  open: false,        // dropdown abierto/cerrado
  activeIndex: 0,     // navegación con flechas
};

function formatDateYYYYMMDD(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addBusinessDays(startDate, businessDays) {
  let d = new Date(startDate);
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NotasPedido() {
  // ✅ ESTE REF TIENE QUE ESTAR DENTRO DEL COMPONENTE (no afuera)
  const acItemsRef = useRef({});

  const [productos, setProductos] = useState([]);
  const [productosMap, setProductosMap] = useState({});

  const [fecha, setFecha] = useState(() => formatDateYYYYMMDD(new Date()));
  const [diasHabiles, setDiasHabiles] = useState(15);

  const entregaDate = useMemo(() => {
    const d = addBusinessDays(fecha, Number(diasHabiles || 0));
    return formatDateYYYYMMDD(d);
  }, [fecha, diasHabiles]);

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [medioPago, setMedioPago] = useState("");

  const [items, setItems] = useState([{ ...emptyItem }]);

  const [descuento, setDescuento] = useState("");
  const [adelanto, setAdelanto] = useState("");

  const rootRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const productosArray = await listarTodosLosProductos({ pageSize: 200 });
        setProductos(productosArray);

        const map = {};
        for (const p of productosArray) map[p._id] = p;
        setProductosMap(map);
      } catch (e) {
        console.error(e);
        alert(e.message || "No se pudieron cargar productos");
        setProductos([]);
        setProductosMap({});
      }
    })();
  }, []);

  // cerrar dropdowns al clickear afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setItems((prev) => prev.map((it) => ({ ...it, open: false })));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ scroll automático al moverte con flechas
  useEffect(() => {
    items.forEach((it, idx) => {
      if (!it.open) return;

      const el = acItemsRef.current[idx]?.[it.activeIndex];
      if (el && el.scrollIntoView) {
        el.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    });
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const qty = Number(it.cantidad || 0);
      const price = Number(String(it.precio).replace(",", ".") || 0);
      return acc + qty * price;
    }, 0);
  }, [items]);

  const totalFinal = useMemo(() => {
    const d = Number(String(descuento).replace(",", ".") || 0);
    return Math.max(0, subtotal - d);
  }, [subtotal, descuento]);

  const resta = useMemo(() => {
    const a = Number(String(adelanto).replace(",", ".") || 0);
    return Math.max(0, totalFinal - a);
  }, [totalFinal, adelanto]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function onGuardarNota() {
    alert("Luego conectamos esto al backend (crearNotaPedido).");
  }

  function onVerNotas() {
    alert("Luego lo conectamos a una pantalla /notas-pedido/listado");
  }

  function buscarOpciones(q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return [];
    const filtered = productos.filter((p) => {
      const codigo = String(p.codigo || "").toLowerCase();
      const nombre = String(p.nombre || "").toLowerCase();
      return codigo.includes(query) || nombre.includes(query);
    });
    return filtered.slice(0, 30);
  }

  function seleccionarProducto(idx, p) {
    updateItem(idx, {
      productoId: p._id,
      descripcion: `${p.codigo} - ${p.nombre}`,
      precio: String(p.precio ?? ""),
      busqueda: `${p.codigo} - ${p.nombre}`,
      open: false,
      activeIndex: 0,
    });
  }

  return (
    <div className="np-page" ref={rootRef}>
      <div className="np-card">
        <h1 className="np-title">Generador de Nota de Pedido - Sur Maderas</h1>

        <div className="np-grid-2">
          <div className="np-col">
            <div className="np-field">
              <label className="np-label">Fecha:</label>
              <input className="np-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>

            <div className="np-field">
              <label className="np-label">Señores:</label>
              <input className="np-input" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>

            <div className="np-field">
              <label className="np-label">Teléfono:</label>
              <input className="np-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>

            <div className="np-field">
              <label className="np-label">Vendedor:</label>
              <select className="np-input" value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
                <option value="">Seleccione un vendedor</option>
                {vendedores.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="np-field">
              <label className="np-label">Medio de pago:</label>
              <select className="np-input" value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
                <option value="">Seleccione una opción</option>
                {mediosPago.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="np-col">
            <div className="np-field">
              <label className="np-label">Entrega para el día:</label>
              <input
                className="np-input np-readonly"
                readOnly
                value={`${diasHabiles} días hábiles (${entregaDate.split("-").reverse().join("/")})`}
              />
            </div>

            <div className="np-field">
              <label className="np-label">Días hábiles:</label>
              <input
                className="np-input"
                type="number"
                min={0}
                value={diasHabiles}
                onChange={(e) => setDiasHabiles(e.target.value)}
              />
            </div>

            <div className="np-field">
              <label className="np-label">Fecha entrega:</label>
              <input className="np-input" type="date" value={entregaDate} readOnly />
            </div>
          </div>
        </div>

        <h2 className="np-section-title">Detalle del Pedido:</h2>

        <div className="np-items">
          {items.map((it, idx) => {
            const opciones = buscarOpciones(it.busqueda);

            // ✅ reiniciar refs por fila (para scrollIntoView)
            acItemsRef.current[idx] = [];

            return (
              <div className="np-item-row" key={idx}>
                <div className="np-autocomplete">
                  <input
                    className="np-input np-item-search"
                    placeholder="Buscar producto por código o nombre..."
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
                />

                <label className="np-check">
                  <input
                    type="checkbox"
                    checked={it.especial}
                    onChange={(e) => updateItem(idx, { especial: e.target.checked })}
                  />
                  <span>Especial</span>
                </label>

                {items.length > 1 ? (
                  <button className="np-linkdanger" type="button" onClick={() => removeItem(idx)}>
                    Quitar
                  </button>
                ) : (
                  <span className="np-spacer" />
                )}
              </div>
            );
          })}

          <button className="np-btn np-btn-secondary" type="button" onClick={addItem}>
            Agregar otro producto
          </button>
        </div>

        <div className="np-totals">
          <div className="np-field">
            <label className="np-label">Total $:</label>
            <input className="np-input np-readonly" readOnly value={toARS(totalFinal)} />
          </div>

          <div className="np-field">
            <label className="np-label">Descuento $:</label>
            <input className="np-input" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
          </div>

          <div className="np-field">
            <label className="np-label">Adelanto $:</label>
            <input className="np-input" value={adelanto} onChange={(e) => setAdelanto(e.target.value)} />
          </div>

          <div className="np-field">
            <label className="np-label">Resta $:</label>
            <input className="np-input np-readonly" readOnly value={toARS(resta)} />
          </div>
        </div>

        <div className="np-actions">
          <button className="np-btn np-btn-green" type="button" onClick={onGuardarNota}>
            Guardar Nota
          </button>

          <button className="np-btn np-btn-blue" type="button" onClick={onVerNotas}>
            Ver Notas
          </button>
        </div>
      </div>
    </div>
  );
}
