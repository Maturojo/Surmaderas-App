import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { crearNotaPedido } from "../../services/notasPedido";
import { useProductos } from "./hooks/useProductos";
import { addBusinessDays, formatDateYYYYMMDD } from "./utils/dates";
import { toARS } from "./utils/money";

import "../../css/NotasPedido.css";

const vendedores = ["Matías", "Gustavo", "Ceci", "Guille"];
const mediosPago = ["Efectivo", "Transferencia", "Débito", "Crédito", "Cuenta Corriente"];

const emptyItem = {
  busqueda: "",
  productoId: "",
  descripcion: "",
  cantidad: 1,
  precio: "",
  especial: false,
  open: false,
  activeIndex: 0,
};

export default function NotasPedidoView() {
  const navigate = useNavigate();
  const { productos } = useProductos();

  const acItemsRef = useRef({});
  const rootRef = useRef(null);

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
  const [medioPago, setMedioPago] = useState("");

  const [items, setItems] = useState([{ ...emptyItem }]);
  const [descuento, setDescuento] = useState("");
  const [adelanto, setAdelanto] = useState("");

  /* -------------------- UX helpers -------------------- */

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

  /* -------------------- Totales -------------------- */

  const subtotal = useMemo(
    () =>
      items.reduce((acc, it) => {
        const qty = Number(it.cantidad || 0);
        const price = Number(String(it.precio).replace(",", ".") || 0);
        return acc + qty * price;
      }, 0),
    [items]
  );

  const totalFinal = useMemo(() => {
    const d = Number(String(descuento).replace(",", ".") || 0);
    return Math.max(0, subtotal - d);
  }, [subtotal, descuento]);

  const resta = useMemo(() => {
    const a = Number(String(adelanto).replace(",", ".") || 0);
    return Math.max(0, totalFinal - a);
  }, [totalFinal, adelanto]);

  /* -------------------- Items -------------------- */

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
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
    });
  }

  /* -------------------- GUARDAR NOTA (SOLO DATOS) -------------------- */

  async function onGuardarNota() {
    if (guardando) return;
    setGuardando(true);

    try {
      if (!String(cliente || "").trim()) throw new Error("Falta el nombre del cliente");

      const numero = `NP-${Date.now()}`;

      const itemsMapped = items
        .map((it) => {
          const descripcion = String(it.descripcion || it.busqueda || "").trim();
          if (!descripcion) return null;

          const cantidad = Number(it.cantidad || 0);
          const precioUnit = Number(String(it.precio ?? "").replace(",", ".")) || 0;

          return {
            productoId: it.productoId || null,
            descripcion,
            cantidad,
            precioUnit,
            especial: Boolean(it.especial),
          };
        })
        .filter(Boolean)
        .filter((it) => it.cantidad > 0);

      if (itemsMapped.length === 0) throw new Error("Tenés que cargar al menos un producto válido");

      const payload = {
        numero,
        fecha,
        entrega: entregaDate,
        diasHabiles: Number(diasHabiles || 0),

        cliente: { nombre: cliente, telefono: telefono || "", direccion: "" },
        vendedor: vendedor || "",
        medioPago: medioPago || "",

        items: itemsMapped,
        totales: {
          subtotal,
          descuento: Number(String(descuento).replace(",", ".") || 0),
          total: totalFinal,
          adelanto: Number(String(adelanto).replace(",", ".") || 0),
          resta,
        },

        // 🔴 PDF NO se genera acá
        pdfBase64: "",
      };

      await crearNotaPedido(payload);

      await Swal.fire({
        icon: "success",
        title: "Nota guardada",
        text: `La nota ${numero} se guardó correctamente`,
        timer: 1600,
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

  function onVerNotas() {
    navigate("/notas-pedido/listado");
  }

  /* -------------------- JSX -------------------- */

  return (
    <div className="np-page" ref={rootRef}>
      <div className="np-card">
        <h1 className="np-title">Generador de Nota de Pedido - Sur Maderas</h1>

        {/* Header/Formulario */}
        <div className="np-grid-2">
          <div className="np-col">
            <div className="np-field">
              <label className="np-label">Fecha:</label>
              <input
                className="np-input"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
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
              <label className="np-label">Teléfono:</label>
              <input
                className="np-input"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 223..."
              />
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

        {/* Items */}
        <div className="np-items">
          {items.map((it, idx) => {
            const opciones = buscarOpciones(it.busqueda);

            // reiniciar refs por fila (para scrollIntoView)
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

        {/* Totales */}
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

        {/* Acciones */}
        <div className="np-actions">
          <button className="np-btn np-btn-green" type="button" onClick={onGuardarNota} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar Nota"}
          </button>

          <button className="np-btn np-btn-blue" type="button" onClick={onVerNotas}>
            Ver Notas
          </button>
        </div>
      </div>
    </div>
  );
}
