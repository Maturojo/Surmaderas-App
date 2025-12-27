import { useEffect, useState } from "react";
import { listarNotasPedido, obtenerNotaPedido } from "../services/notasPedido";
import "../css/NotasPedidoListado.css";

function toARS(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadBase64Pdf(base64, filename = "nota.pdf") {
  const clean = String(base64 || "").replace(/^data:application\/pdf;base64,/, "");
  const byteCharacters = atob(clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NotasPedidoListado() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const [data, setData] = useState({ items: [], total: 0, page: 1, limit });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState(null);
  const [detalle, setDetalle] = useState(null);

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

  useEffect(() => {
    cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscar() {
    setPage(1);
    await cargar(1);
  }

  async function abrirDetalle(id) {
    setOpenId(id);
    setDetalle(null);
    try {
      const item = await obtenerNotaPedido(id);
      setDetalle(item);
    } catch (e) {
      setDetalle({ _error: e.message || "Error cargando detalle" });
    }
  }

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / limit));

  return (
    <div className="npl-page">
      <div className="npl-card">
        <div className="npl-header">
          <h1 className="npl-title">Notas de Pedido</h1>
        </div>

        <div className="npl-toolbar">
          <input
            className="npl-input"
            placeholder="Buscar por número, cliente o teléfono..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <button className="npl-btn" type="button" onClick={buscar} disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {error && <div className="npl-error">{error}</div>}

        <div className="npl-tableWrap">
          <table className="npl-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Entrega</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="npl-muted">Cargando...</td></tr>
              ) : (data.items?.length ? (
                data.items.map((n) => (
                  <tr key={n._id}>
                    <td>{n.numero}</td>
                    <td>{String(n.fecha || "").split("-").reverse().join("/")}</td>
                    <td>{String(n.entrega || "").split("-").reverse().join("/")}</td>
                    <td>{n.cliente?.nombre || "-"}</td>
                    <td>{n.vendedor || "-"}</td>
                    <td>${toARS(n.totales?.total)}</td>
                    <td className="npl-actions">
                      <button className="npl-link" type="button" onClick={() => abrirDetalle(n._id)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="npl-muted">Sin resultados</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="npl-pager">
          <button
            className="npl-btnGhost"
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => {
              const p = page - 1;
              setPage(p);
              cargar(p);
            }}
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
            onClick={() => {
              const p = page + 1;
              setPage(p);
              cargar(p);
            }}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal Detalle */}
      {openId && (
        <div className="npl-modalBack" onMouseDown={() => setOpenId(null)}>
          <div className="npl-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="npl-modalHeader">
              <div className="npl-modalTitle">Detalle</div>
              <button className="npl-x" type="button" onClick={() => setOpenId(null)}>×</button>
            </div>

            {!detalle ? (
              <div className="npl-muted">Cargando detalle...</div>
            ) : detalle._error ? (
              <div className="npl-error">{detalle._error}</div>
            ) : (
              <>
                <div className="npl-detailGrid">
                  <div><b>Número:</b> {detalle.numero}</div>
                  <div><b>Fecha:</b> {String(detalle.fecha || "").split("-").reverse().join("/")}</div>
                  <div><b>Entrega:</b> {String(detalle.entrega || "").split("-").reverse().join("/")}</div>
                  <div><b>Cliente:</b> {detalle.cliente?.nombre}</div>
                  <div><b>Tel:</b> {detalle.cliente?.telefono || "-"}</div>
                  <div><b>Vendedor:</b> {detalle.vendedor || "-"}</div>
                  <div><b>Medio pago:</b> {detalle.medioPago || "-"}</div>
                  <div><b>Estado:</b> {detalle.estado || "-"}</div>
                </div>

                <div className="npl-itemsTitle">Items</div>
                <div className="npl-itemsList">
                  {detalle.items?.map((it, i) => (
                    <div className="npl-itemRow" key={i}>
                      <div className="npl-itemDesc">{it.descripcion}</div>
                      <div className="npl-itemMeta">
                        Cant: {it.cantidad} — Unit: ${toARS(it.precioUnit)} — Sub: ${toARS((it.cantidad || 0) * (it.precioUnit || 0))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="npl-totalsBox">
                  <div>Subtotal: ${toARS(detalle.totales?.subtotal)}</div>
                  <div>Descuento: ${toARS(detalle.totales?.descuento)}</div>
                  <div><b>Total: ${toARS(detalle.totales?.total)}</b></div>
                  <div>Adelanto: ${toARS(detalle.totales?.adelanto)}</div>
                  <div>Resta: ${toARS(detalle.totales?.resta)}</div>
                </div>

                <div className="npl-modalActions">
                  <button
                    className="npl-btn"
                    type="button"
                    disabled={!detalle.pdfBase64}
                    onClick={() => downloadBase64Pdf(detalle.pdfBase64, `${detalle.numero}.pdf`)}
                  >
                    Descargar PDF
                  </button>
                </div>

                {!detalle.pdfBase64 && (
                  <div className="npl-muted" style={{ marginTop: 8 }}>
                    Esta nota no tiene pdfBase64 guardado (solo descargaste el PDF local al generarla).
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
