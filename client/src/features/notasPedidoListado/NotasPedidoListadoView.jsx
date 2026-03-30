import "../../css/NotasPedidoListado.css";

import { guardarCajaNota } from "../../services/notasPedido";

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
    cargar,
    buscar,
    irPagina,
    abrirDetalle,
    cerrarDetalle,
  } = useNotasPedidoListado();

  async function handleGuardarCaja(nota, payload) {
    await guardarCajaNota(nota._id, payload);
    await cargar(page);
    if (openId === nota._id) {
      await abrirDetalle(nota._id);
    }
  }

  return (
    <div className="npl-page">
      <div className="npl-head">
        <div>
          <h1>Listado de notas</h1>
          <p className="npl-sub">Busqueda, detalle y guardado en caja.</p>
        </div>
      </div>

      <SearchBar q={q} setQ={setQ} onSearch={buscar} loading={loading} />

      {error ? <div className="npl-error">{error}</div> : null}

      <NotasTable
        items={data.items}
        loading={loading}
        onVerDetalle={abrirDetalle}
        onGuardarCaja={handleGuardarCaja}
      />

      <div className="npl-footer">
        <span>
          Pagina <b>{page}</b> de <b>{totalPages}</b>
        </span>

        <div className="npl-pager">
          <button className="npl-btnGhost" type="button" onClick={() => irPagina(1)} disabled={page === 1}>
            «
          </button>
          <button className="npl-btnGhost" type="button" onClick={() => irPagina(page - 1)} disabled={page === 1}>
            Anterior
          </button>
          <button className="npl-btnGhost" type="button" onClick={() => irPagina(page + 1)} disabled={page === totalPages}>
            Siguiente
          </button>
          <button className="npl-btnGhost" type="button" onClick={() => irPagina(totalPages)} disabled={page === totalPages}>
            »
          </button>
        </div>
      </div>

      <NotaDetalleModal
        open={Boolean(openId)}
        onClose={cerrarDetalle}
        detalle={detalle}
        loading={detalleLoading}
        error={detalleError}
        onRefresh={() => abrirDetalle(openId)}
        onGuardarCaja={handleGuardarCaja}
      />
    </div>
  );
}
