import { useMemo, useState, useEffect } from "react";
import { listarTodosLosProductos } from "../services/productosService";

import "../css/NotasPedido.css";



const vendedores = ["Matías", "Gustavo", "Ceci", "Guille"];
const mediosPago = ["Efectivo", "Transferencia", "Débito", "Crédito", "Cuenta Corriente"];

const emptyItem = {
  productoId: "",
  descripcion: "",
  cantidad: 1,
  precio: "",
  especial: false,
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
  return x.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NotasPedido() {
  /* =========================
     PRODUCTOS
  ========================= */
  const [productos, setProductos] = useState([]);
  const [productosMap, setProductosMap] = useState({});

  useEffect(() => {
  (async () => {
    try {
      // Trae todos los productos paginando por detrás
      const productosArray = await listarTodosLosProductos({ pageSize: 200 });

      setProductos(productosArray);

      const map = {};
      for (const p of productosArray) {
        map[p._id] = p;
      }
      setProductosMap(map);

       console.log("TOTAL productos cargados:", productosArray.length);
    } catch (e) {
      console.error(e);
      alert(e.message || "No se pudieron cargar productos");
      setProductos([]);
      setProductosMap({});
    }

   

  })();
}, []);

  /* =========================
     CABECERA
  ========================= */
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

  /* =========================
     ITEMS
  ========================= */
  const [items, setItems] = useState([{ ...emptyItem }]);

  const [descuento, setDescuento] = useState("");
  const [adelanto, setAdelanto] = useState("");

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
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
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

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="np-page">
      <div className="np-card">
        <h1 className="np-title">Generador de Nota de Pedido - Sur Maderas</h1>

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
              />
            </div>

            <div className="np-field">
              <label className="np-label">Teléfono:</label>
              <input
                className="np-input"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="np-field">
              <label className="np-label">Vendedor:</label>
              <select
                className="np-input"
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
              >
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
              <select
                className="np-input"
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
              >
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
                value={`${diasHabiles} días hábiles (${entregaDate
                  .split("-")
                  .reverse()
                  .join("/")})`}
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
              <input
                className="np-input"
                type="date"
                value={entregaDate}
                readOnly
              />
            </div>
          </div>
        </div>

        <h2 className="np-section-title">Detalle del Pedido:</h2>

        <div className="np-items">
          {items.map((it, idx) => (
            <div className="np-item-row" key={idx}>
              <select
                className="np-input np-item-product"
                value={it.productoId}
                onChange={(e) => {
                  const id = e.target.value;
                  const p = productosMap[id];

                  updateItem(idx, {
                    productoId: id,
                    descripcion: p ? `${p.codigo} - ${p.nombre}` : "",
                    precio: p ? String(p.precio) : "",
                  });
                }}
              >
                <option value="">Seleccione un producto</option>
                {Array.isArray(productos) &&
                  productos.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.codigo} - {p.nombre}
                    </option>
                  ))}
              </select>

              <input
                className="np-input np-item-qty"
                type="number"
                min={0}
                value={it.cantidad}
                onChange={(e) =>
                  updateItem(idx, { cantidad: e.target.value })
                }
              />

              <input
                className="np-input np-item-price"
                placeholder="Precio"
                value={it.precio}
                onChange={(e) =>
                  updateItem(idx, { precio: e.target.value })
                }
              />

              <label className="np-check">
                <input
                  type="checkbox"
                  checked={it.especial}
                  onChange={(e) =>
                    updateItem(idx, { especial: e.target.checked })
                  }
                />
                <span>Especial</span>
              </label>

              {items.length > 1 ? (
                <button
                  className="np-linkdanger"
                  type="button"
                  onClick={() => removeItem(idx)}
                >
                  Quitar
                </button>
              ) : (
                <span className="np-spacer" />
              )}
            </div>
          ))}

          <button
            className="np-btn np-btn-secondary"
            type="button"
            onClick={addItem}
          >
            Agregar otro producto
          </button>
        </div>

        <div className="np-totals">
          <div className="np-field">
            <label className="np-label">Total $:</label>
            <input
              className="np-input np-readonly"
              readOnly
              value={toARS(totalFinal)}
            />
          </div>

          <div className="np-field">
            <label className="np-label">Descuento $:</label>
            <input
              className="np-input"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
            />
          </div>

          <div className="np-field">
            <label className="np-label">Adelanto $:</label>
            <input
              className="np-input"
              value={adelanto}
              onChange={(e) => setAdelanto(e.target.value)}
            />
          </div>

          <div className="np-field">
            <label className="np-label">Resta $:</label>
            <input
              className="np-input np-readonly"
              readOnly
              value={toARS(resta)}
            />
          </div>
        </div>

        <div className="np-actions">
          <button
            className="np-btn np-btn-green"
            type="button"
            onClick={onGuardarNota}
          >
            Guardar Nota
          </button>

          <button
            className="np-btn np-btn-blue"
            type="button"
            onClick={onVerNotas}
          >
            Ver Notas
          </button>
        </div>
      </div>
    </div>
  );
}
