import "../../css/NotasPedidoListado.css";

import { useEffect, useState } from "react";

import { eliminarNotaPedido, guardarCajaNota } from "../../services/notasPedido";
import {
  buildNotaPedidoPrintData,
  copyFileToClipboard,
  downloadFile,
  generateNotaPedidoImageFile,
  openWhatsappText,
} from "../../utils/notaPedidoPrint";
import { getNotaTotal } from "../../utils/notaPedido";

function normalizarTel(telefono = "") {
  const d = String(telefono || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) return `549${d.slice(2)}`;
  return `549${d}`;
}

function toARSLocal(n) {
  return Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function construirMensajeNota(nota) {
  const nombre = nota?.cliente?.nombre || nota?.cliente || "cliente";
  return [
    `Hola ${nombre}, te compartimos la nota de pedido ${nota?.numero || ""}.`,
    "",
    `Entrega estimada: ${nota?.entrega || "-"}`,
    `Vendedor: ${nota?.vendedor || "-"}`,
    `Total: $${toARSLocal(getNotaTotal(nota))}`,
    "",
    "Si necesitás alguna corrección o confirmación, respondé por este medio.",
  ].join("\n");
}

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
        ? `El pedido ${nota?.numero || ""} se guardo en caja como pagado y paso a Pedidos para pasar.`
        : tipo === "seña" || tipo === "sena" || tipo === "senia"
          ? `El pedido ${nota?.numero || ""} se guardo en caja como señado y paso a Pedidos para pasar.`
          : `El pedido ${nota?.numero || ""} se guardo sin pagar y paso a Pedidos para pasar como pendiente.`;
    setFlash({
      kind: "success",
      message,
    });
  }

  async function handleEnviarCliente(nota) {
    const tel = normalizarTel(nota?.cliente?.telefono || nota?.telefono);
    if (!tel) {
      setFlash({ kind: "info", message: "La nota no tiene teléfono de cliente para enviar." });
      return;
    }
    const mensaje = construirMensajeNota(nota);
    openWhatsappText(tel, mensaje);
    try {
      const file = await generateNotaPedidoImageFile(buildNotaPedidoPrintData(nota));
      const copied = await copyFileToClipboard(file);
      if (!copied) downloadFile(file);
    } catch {
      // si falla la imagen igual se abrió el WhatsApp con el mensaje
    }
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
          <h1>Pedidos en caja</h1>
          <p className="npl-sub">Stand by de caja: solo se ven pedidos pendientes hasta guardar el pago o seña.</p>
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
        onEnviarCliente={handleEnviarCliente}
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
