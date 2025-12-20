import { useEffect, useMemo, useRef, useState } from "react";
import { listarProductos } from "../services/productosService";
import "../css/productos.css";

const LIMIT = 25;

export default function Productos() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = useRef(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / LIMIT)),
    [total]
  );

  async function cargar({ q = query, p = page } = {}) {
    setLoading(true);
    setError("");
    try {
      const data = await listarProductos({ q, page: p, limit: LIMIT });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message || "Error cargando productos");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar({ q: "", p: 1 });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      cargar({ q: query, p: 1 });
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line
  }, [query]);

  useEffect(() => {
    cargar({ q: query, p: page });
    // eslint-disable-next-line
  }, [page]);

  return (
    <div className="productos-page">
      <div className="productos-header">
        <div>
          <h1>Productos</h1>
          <p>{loading ? "Cargando..." : `${total} producto(s)`}</p>
        </div>

        <div className="productos-search">
          <input
            placeholder="Buscar por nombre o código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => cargar({ q: query, p: 1 })}>Buscar</button>
          <button className="ghost" onClick={() => setQuery("")}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="productos-card">
        {error && <div className="productos-error">{error}</div>}

        <div className="productos-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th className="right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty">
                    No hay productos para mostrar
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p._id}>
                    <td className="mono">{p.codigo || "-"}</td>
                    <td>{p.nombre}</td>
                    <td className="right">
                      {typeof p.precio === "number"
                        ? `$${p.precio.toLocaleString("es-AR")}`
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {loading && <div className="loading-overlay">Cargando...</div>}
        </div>

        <div className="productos-footer">
          <span>
            Página <b>{page}</b> de <b>{totalPages}</b>
          </span>

          <div className="pager">
            <button onClick={() => setPage(1)} disabled={page === 1}>
              «
            </button>
            <button onClick={() => setPage(page - 1)} disabled={page === 1}>
              Anterior
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Siguiente
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
