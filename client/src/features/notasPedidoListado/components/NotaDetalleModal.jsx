export default function NotaDetalleModal({
  open,
  onClose,
  detalle,
  loading,
  error,
  onRefresh,
  onGuardarCaja,
}) {
  if (!open) return null;

  const id = detalle?._id;

  return (
    <div className="npl-modalOverlay" onClick={onClose}>
      <div className="npl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="npl-modalHeader">
          <div>
            <div className="npl-modalTitle">Detalle</div>
            <div className="npl-muted">{id ? `ID: ${id}` : ""}</div>
          </div>

          <button className="npl-btnGhost" onClick={onClose}>Cerrar</button>
        </div>

        {loading ? <div className="npl-muted">Cargando…</div> : null}
        {error ? <div className="npl-error">{error}</div> : null}

        {!loading && detalle ? (
          <div className="npl-modalBody">
            <div className="npl-row">
              <div><b>Cliente:</b> {detalle.cliente || "-"}</div>
              <div><b>Total:</b> {detalle.total ?? 0}</div>
              <div><b>Estado:</b> {detalle.estado || "pendiente"}</div>
              <div><b>Caja:</b> {detalle?.caja?.guardada ? "Guardada" : "Pendiente"}</div>
            </div>

            <div className="npl-modalActions">
              <button className="npl-btnGhost" onClick={onRefresh}>Refrescar</button>

              <button
                className="npl-btn"
                disabled={detalle?.caja?.guardada === true}
                onClick={async () => {
                  try {
                    await onGuardarCaja?.(detalle, {
                      tipo: "pago",
                      monto: detalle.total,
                      metodo: "efectivo",
                    });
                  } catch (e) {
                    alert(e?.message || "Error guardando caja");
                  }
                }}
              >
                Guardar caja
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
