import "../../css/NotasPedidoListado.css";

import { useEffect, useState } from "react";

import { eliminarNotaPedido, guardarCajaNota } from "../../services/notasPedido";

import { useNotasPedidoListado } from "./hooks/useNotasPedidoListado";
import SearchBar from "./components/SearchBar";
import NotasTable from "./components/NotasTable";
import NotaDetalleModal from "./components/NotaDetalleModal";

export default function NotasPedidoListadoView() {
  const [flash, setFlash] = useState(null);
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

  const totalPendientes = data.total || 0;
  const visibles = data.items.length;

  useEffect(() => {
    if (!flash) return undefined;
    const t = window.setTimeout(() => setFlash(null), 2600);
    return () => window.clearTimeout(t);
  }, [flash]);

  async function handleGuardarCaja(nota, payload) {
    await guardarCajaNota(nota._id, payload);
    await cargar(page);
    cerrarDetalle();
    const tipo = String(payload?.tipo || "").toLowerCase();
    const message =
      tipo === "pago"
        ? `La nota ${nota?.numero || ""} se guardo en caja como pagada y paso a Notas guardadas.`
        : tipo === "seña" || tipo === "sena" || tipo === "senia"
          ? `La nota ${nota?.numero || ""} se guardo en caja como señada y paso a Notas guardadas.`
          : `La nota ${nota?.numero || ""} se guardo sin pagar y paso a Notas guardadas como pendiente.`;
    setFlash({
      kind: "success",
      message,
    });
  }

  async function handleEliminarNota(nota) {
    const ok = window.confirm(`Se va a borrar la nota ${nota?.numero || ""}.`);
    if (!ok) return;

    await eliminarNotaPedido(nota._id);
    await cargar(page);
    if (openId === nota._id) cerrarDetalle();
    setFlash({
      kind: "info",
      message: `La nota ${nota?.numero || ""} se borro del listado.`,
    });
  }

  return (
    <div className="npl-page">
      <div className="npl-head">
        <div>
          <div className="npl-eyebrow">Caja</div>
          <h1>Listado de notas</h1>
          <p className="npl-sub">Stand by de caja: solo se ven notas pendientes hasta guardar el pago o seña.</p>
        </div>

        <div className="npl-headStats">
          <div className="npl-statCard">
            <span className="npl-statLabel">Pendientes</span>
            <strong className="npl-statValue">{totalPendientes}</strong>
          </div>
          <div className="npl-statCard">
            <span className="npl-statLabel">Pagina actual</span>
            <strong className="npl-statValue">{page}</strong>
          </div>
          <div className="npl-statCard">
            <span className="npl-statLabel">Mostrando</span>
            <strong className="npl-statValue">{visibles}</strong>
          </div>
        </div>
      </div>

      <SearchBar q={q} setQ={setQ} onSearch={buscar} loading={loading} total={totalPendientes} />

      {error ? <div className="npl-error">{error}</div> : null}
      {flash ? <div className={`npl-flash npl-flash--${flash.kind}`}>{flash.message}</div> : null}

      <NotasTable
        items={data.items}
        loading={loading}
        onVerDetalle={abrirDetalle}
        onEliminar={handleEliminarNota}
      />

      <div className="npl-footer">
        <span className="npl-footerText">
          Pagina <b>{page}</b> de <b>{totalPages}</b> · <b>{totalPendientes}</b> notas pendientes
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
