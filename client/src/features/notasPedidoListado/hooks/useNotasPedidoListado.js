import { useEffect, useMemo, useState } from "react";
import { listarNotasPedido, obtenerNotaPedido } from "../../../services/notasPedido";

export function useNotasPedidoListado({ initialLimit = 25 } = {}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);

  const [data, setData] = useState({ ok: true, items: [], total: 0, page: 1, limit: initialLimit });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((data.total || 0) / limit));
  }, [data.total, limit]);

  async function cargar(p = page) {
    setLoading(true);
    setError("");
    try {
      const res = await listarNotasPedido({ q, page: p, limit });
      setData(res);
    } catch (e) {
      setError(e.message || "Error cargando notas");
    } finally {
      setLoading(false);
    }
  }

  async function buscar() {
    const p = 1;
    setPage(p);
    await cargar(p);
  }

  async function irPagina(p) {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    await cargar(next);
  }

  async function abrirDetalle(id) {
    setOpenId(id);
    setDetalle(null);
    setDetalleError("");
    setDetalleLoading(true);

    try {
      const item = await obtenerNotaPedido(id);
      setDetalle(item);
    } catch (e) {
      setDetalleError(e.message || "Error cargando detalle");
    } finally {
      setDetalleLoading(false);
    }
  }

  function cerrarDetalle() {
    setOpenId(null);
    setDetalle(null);
    setDetalleError("");
    setDetalleLoading(false);
  }

  // carga inicial
  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // state
    q,
    setQ,
    page,
    limit,
    data,
    totalPages,
    loading,
    error,

    // detalle
    openId,
    detalle,
    detalleLoading,
    detalleError,

    // actions
    cargar,
    buscar,
    irPagina,
    abrirDetalle,
    cerrarDetalle,
  };
}
