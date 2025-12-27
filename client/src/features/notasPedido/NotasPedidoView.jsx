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
      if (!String(cliente || "").trim()) {
        throw new Error("Falta el nombre del cliente");
      }

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

      if (itemsMapped.length === 0) {
        throw new Error("Tenés que cargar al menos un producto válido");
      }

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

        {/* --- (todo el JSX de formulario e items queda IGUAL al tuyo) --- */}

        <div className="np-actions">
          <button className="np-btn np-btn-green" onClick={onGuardarNota} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar Nota"}
          </button>

          <button className="np-btn np-btn-blue" onClick={onVerNotas}>
            Ver Notas
          </button>
        </div>
      </div>
    </div>
  );
}
