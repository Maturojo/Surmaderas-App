import "../../css/NotasPedidoListado.css";

import { useNotasPedidoListado } from "./hooks/useNotasPedidoListado";
import SearchBar from "./components/SearchBar";
import NotasTable from "./components/NotasTable";
import NotaDetalleModal from "./components/NotaDetalleModal";

export default function NotasPedidoListadoView() {
  const {
    q,
    setQ,
    page,
    data,
    totalPages,
    loading,
    error,

    openId,
    detalle,
    detalleLoading,
    detalleError,

    buscar,
    irPagina,
    abrirDetalle,
    cerrarDetalle,
  } = useNotasPedidoListado({ initialLimit: 25 });

  return (
    <div className="npl-page">
      <div className="npl-card">
        <div className="npl-header">
          <h1 className="npl-title">Notas de Pedido</h1>
        </div>

        <SearchBar q={q} setQ={setQ} onSearch={buscar} loading={loading} />

        {error && <div className="npl-error">{error}</div>}

        <NotasTable items={data.items} loading={loading} onVerDetalle={abrirDetalle} />

        <div className="npl-pager">
          <button
            className="npl-btnGhost"
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => irPagina(page - 1)}
          >
            Anterior
          </button>

          <div className="npl-muted">
            Página {page} / {totalPages} — Total: {data.total || 0}
          </div>

          <button
            className="npl-btnGhost"
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => irPagina(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      <NotaDetalleModal
        open={Boolean(openId)}
        onClose={cerrarDetalle}
        detalle={detalle}
        loading={detalleLoading}
        error={detalleError}
        onRefresh={() => openId && abrirDetalle(openId)}
      />
    </div>
  );
}
