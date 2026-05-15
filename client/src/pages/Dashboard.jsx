import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerCalendario } from "../services/calendar";
import { getUserRole } from "../services/auth";
import { getTurnero, takeTurno } from "../services/turnero";
import { getStats } from "../services/whatsappApi";
import { listarNotasPedido } from "../services/notasPedido";
import { listPresupuestoDrafts } from "../services/presupuestos";
import { getVentasMensuales, getVentasTransferencias } from "../services/ventasMensuales";

const CARDS = [
  {
    label: "Marcos",
    title: "Cotizador de marcos",
    copy: "Calcula varillas, vidrio, fondo, cables y armado con una vista 3D preliminar.",
    to: "/marcos",
  },
  {
    label: "Caja",
    title: "Pedidos en caja",
    copy: "Aca vive el circuito de espera hasta que el cliente paga o deja seña.",
    to: "/notas-pedido/listado",
  },
  {
    label: "Ventas",
    title: "Generador de pedidos",
    copy: "Genera pedidos en mostrador con cliente, entrega, detalle e importe.",
    to: "/notas-pedido",
  },
  {
    label: "Archivo",
    title: "Pedidos para pasar",
    copy: "Consulta, imprime o comparte pedidos ya cerrados en caja.",
    to: "/notas-pedido/guardadas",
  },
];

const VENTAS_CARDS = [
  {
    label: "Marcos",
    title: "Cotizador de marcos",
    copy: "Arma una cotizacion rapida del marco con extras y visualizacion previa.",
    to: "/marcos",
  },
  {
    label: "Ventas",
    title: "Generador de pedidos",
    copy: "Genera pedidos en mostrador con cliente, entrega, detalle e importe.",
    to: "/notas-pedido",
  },
  {
    label: "Presupuestos",
    title: "Nuevo presupuesto",
    copy: "Carga rapido los datos, fotos y detalles para retomarlos despues.",
    to: "/presupuestos/cargar",
  },
  {
    label: "Productos",
    title: "Consultar productos",
    copy: "Busca referencias, materiales y articulos disponibles sin salir del panel.",
    to: "/productos",
  },
];

const heroTopStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap",
};

const turneroCardStyle = {
  width: "min(260px, 100%)",
  padding: "16px",
  borderRadius: "24px",
  border: "1px solid rgba(73, 58, 38, 0.14)",
  background: "rgba(255,255,255,0.74)",
  boxShadow: "0 14px 30px rgba(56, 44, 29, 0.08)",
  textAlign: "center",
  marginLeft: "auto",
  flex: "1 1 260px",
};

const turneroLabelStyle = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a765a",
};

const turneroNumberStyle = {
  marginTop: "8px",
  fontSize: "48px",
  lineHeight: 0.95,
  fontWeight: 900,
  color: "#2f241a",
};

const turneroStatusStyle = {
  marginTop: "10px",
  minHeight: "38px",
  color: "var(--sm-muted)",
  fontSize: "13px",
};

const turneroButtonStyle = {
  width: "100%",
  minHeight: "42px",
  marginTop: "12px",
  border: 0,
  borderRadius: "16px",
  background: "linear-gradient(135deg, #372c22 0%, #5d4734 100%)",
  color: "#fffdf8",
  fontWeight: 900,
  cursor: "pointer",
};

const turneroErrorStyle = {
  marginTop: "10px",
  color: "#9d2f2f",
  fontSize: "12px",
  textAlign: "center",
};

function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatEntrega(value) {
  if (!value) return "Sin fecha";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function buildDeliveryAlerts(events = [], todayKey, tomorrowKey) {
  const notes = events
    .filter((item) => item?.type === "nota-pedido" && !item.completado)
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return String(a.fecha || "").localeCompare(String(b.fecha || ""));
      return String(a.numero || "").localeCompare(String(b.numero || ""));
    });

  return {
    overdue: notes.filter((item) => item.fecha && item.fecha < todayKey),
    today: notes.filter((item) => item.fecha === todayKey),
    tomorrow: notes.filter((item) => item.fecha === tomorrowKey),
  };
}

function DeliveryAlertColumn({ title, tone, items, emptyText, canOpenNote }) {
  return (
    <article className={`dashboard-alertColumn dashboard-alertColumn--${tone}`}>
      <div className="dashboard-alertColumnHead">
        <span>{title}</span>
        <strong>{items.length}</strong>
      </div>

      {items.length > 0 ? (
        <div className="dashboard-alertList">
          {items.slice(0, 4).map((item) => (
            <div key={item.id} className="dashboard-alertItem">
              <div className="dashboard-alertItemMain">
                <strong>{item.numero || "Nota de pedido"}</strong>
                <span>{item.cliente?.nombre || "Sin cliente"}</span>
              </div>
              <div className="dashboard-alertItemMeta">
                <span>{formatEntrega(item.fecha)}</span>
                <span>{item.estadoOperativo || "Pendiente"}</span>
              </div>
              <div className="dashboard-alertActions">
                {canOpenNote ? (
                  <Link className="dashboard-alertLink" to={`/notas-pedido/listado?nota=${item.sourceId || item._id}`}>
                    Ver nota
                  </Link>
                ) : null}
                <Link className="dashboard-alertLink" to="/calendario">
                  Calendario
                </Link>
              </div>
            </div>
          ))}
          {items.length > 4 ? (
            <Link className="dashboard-alertMore" to="/calendario">
              Ver {items.length - 4} mas en calendario
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="dashboard-alertEmpty">{emptyText}</p>
      )}
    </article>
  );
}

function OperationMetric({ title, value, detail, to, tone = "tomorrow" }) {
  return (
    <article className={`dashboard-alertColumn dashboard-alertColumn--${tone}`}>
      <div className="dashboard-alertColumnHead">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <p className="dashboard-alertEmpty" style={{ minHeight: 58, marginTop: 0 }}>{detail}</p>
      {to ? (
        <div className="dashboard-alertActions" style={{ marginTop: 10 }}>
          <Link className="dashboard-alertLink" to={to}>Abrir</Link>
        </div>
      ) : null}
    </article>
  );
}

export default function Dashboard() {
  const userRole = getUserRole();
  const [turnero, setTurnero] = useState(null);
  const [isLoadingTurnero, setIsLoadingTurnero] = useState(true);
  const [isTakingTurno, setIsTakingTurno] = useState(false);
  const [turneroError, setTurneroError] = useState("");
  const [todayEvents, setTodayEvents] = useState([]);
  const [deliveryAlerts, setDeliveryAlerts] = useState({ overdue: [], today: [], tomorrow: [] });
  const [deliveryAlertsError, setDeliveryAlertsError] = useState("");
  const [waStats, setWaStats] = useState(null);
  const [dailyOps, setDailyOps] = useState(null);
  const [dailyOpsError, setDailyOpsError] = useState("");

  const today = new Date();
  const todayKey = ymd(today);
  const tomorrowKey = ymd(addDays(today, 1));
  const todayNumber = today.getDate();
  const cards = userRole === "ventas" ? VENTAS_CARDS : CARDS;
  const canOpenNote = userRole !== "ventas";

  useEffect(() => {
    let cancelled = false;

    async function loadTurnero({ silent = false } = {}) {
      if (!silent && !cancelled) {
        setIsLoadingTurnero(true);
      }

      try {
        const data = await getTurnero();
        if (cancelled) {
          return;
        }

        setTurnero(data);
        setTurneroError("");
      } catch (error) {
        if (!cancelled) {
          setTurneroError(error.message || "No se pudo cargar el turnero");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTurnero(false);
        }
      }
    }

    loadTurnero();
    const intervalId = window.setInterval(() => {
      loadTurnero({ silent: true });
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOperationalCalendar() {
      try {
        const [todayData, alertData] = await Promise.all([
          obtenerCalendario({ fecha: todayKey }),
          obtenerCalendario({ desde: "2000-01-01", hasta: tomorrowKey }),
        ]);
        if (!cancelled) {
          setTodayEvents(Array.isArray(todayData?.byDay?.[todayKey]) ? todayData.byDay[todayKey] : []);
          setDeliveryAlerts(buildDeliveryAlerts(alertData?.eventos || [], todayKey, tomorrowKey));
          setDeliveryAlertsError("");
        }
      } catch (error) {
        if (!cancelled) {
          setTodayEvents([]);
          setDeliveryAlerts({ overdue: [], today: [], tomorrow: [] });
          setDeliveryAlertsError(error.message || "No se pudieron cargar las alertas operativas");
        }
      }
    }

    loadOperationalCalendar();
    return () => {
      cancelled = true;
    };
  }, [todayKey, tomorrowKey]);

  useEffect(() => {
    getStats().then(({ data }) => setWaStats(data)).catch(() => setWaStats(null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDailyOperations() {
      try {
        const month = currentMonth();
        const [notasCaja, notasGuardadas, ventasData, transferData] = await Promise.all([
          listarNotasPedido({ guardada: false, page: 1, limit: 500 }),
          listarNotasPedido({ guardada: true, page: 1, limit: 500 }),
          getVentasMensuales(month),
          getVentasTransferencias(month),
        ]);

        const cajaItems = notasCaja.items || [];
        const guardadasItems = notasGuardadas.items || [];
        const drafts = listPresupuestoDrafts();
        const salesToday = (ventasData.items || []).filter((item) => ymd(new Date(item.date)) === todayKey);
        const salesTodayTotal = salesToday.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const pendingTransfers = (transferData.items || []).filter((item) => item.status === "pendiente");
        const providerJobs = guardadasItems.filter(
          (item) => item.estadoOperativo === "Enviado a proveedor" || (item.proveedores || []).length > 0
        );
        const workshopJobs = guardadasItems.filter((item) => item.estadoOperativo === "En taller");
        const cashAmount = cajaItems.reduce((sum, item) => sum + Number(item.total || item.totales?.total || 0), 0);

        if (!cancelled) {
          setDailyOps({
            cashCount: cajaItems.length,
            cashAmount,
            budgetDrafts: drafts.length,
            pendingTransfers: pendingTransfers.length,
            pendingTransferTotal: pendingTransfers.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            providerJobs: providerJobs.length,
            workshopJobs: workshopJobs.length,
            salesToday: salesToday.length,
            salesTodayTotal,
          });
          setDailyOpsError("");
        }
      } catch (error) {
        if (!cancelled) {
          setDailyOps(null);
          setDailyOpsError(error.message || "No se pudo cargar el panel operativo");
        }
      }
    }

    loadDailyOperations();
    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  async function handleTakeTurno() {
    try {
      setIsTakingTurno(true);
      const data = await takeTurno();
      setTurnero(data);
      setTurneroError("");
    } catch (error) {
      setTurneroError(error.message || "No se pudo tomar el turno");
    } finally {
      setIsTakingTurno(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div className="dashboard-heroLayout" style={heroTopStyle}>
          <aside style={turneroCardStyle}>
            <div style={turneroLabelStyle}>Turnero</div>
            <div style={turneroNumberStyle}>
              {isLoadingTurnero && !turnero ? "..." : turnero?.currentNumber ?? "--"}
            </div>
            <div style={turneroStatusStyle}>
              {turnero?.lastTakenNumber
                ? `Turno ${turnero.lastTakenNumber} tomado${turnero.lastTakenBy ? ` por ${turnero.lastTakenBy}` : ""}`
                : "Todavia no se tomo ningun turno"}
            </div>

            <button
              type="button"
              style={{
                ...turneroButtonStyle,
                opacity: isLoadingTurnero || isTakingTurno ? 0.78 : 1,
                cursor: isLoadingTurnero || isTakingTurno ? "wait" : "pointer",
              }}
              onClick={handleTakeTurno}
              disabled={isLoadingTurnero || isTakingTurno}
            >
              {isTakingTurno ? "Tomando..." : "Tomar turno"}
            </button>

            {turneroError ? <div style={turneroErrorStyle}>{turneroError}</div> : null}
          </aside>

          <div className="dashboard-heroCenter">
            <div className="dashboard-kicker">Sur Maderas</div>
            <h1 className="dashboard-title">Centro de gestion comercial</h1>
            <p className="dashboard-copy">
              Organiza ventas, pedidos, caja y seguimiento diario desde una sola base visual.
              La idea es que el vendedor cargue, caja confirme y la informacion quede ordenada para consultar o imprimir.
            </p>
          </div>

          <article className="dashboard-todayCard dashboard-todayCard--hero">
            <div className="dashboard-todayBox">
              <span className="dashboard-todayBadge">Hoy</span>
              <span className="dashboard-todayNumber">{todayNumber}</span>
              <div className="dashboard-todayEvents">
                {todayEvents.slice(0, 2).map((item) => (
                  <span
                    key={item.id}
                    className={`dashboard-todayEvent${item.type === "nota-pedido" ? " is-note" : ""}${item.completado ? " is-done" : ""}`}
                  >
                    {item.type === "nota-pedido" ? item.numero : item.titulo}
                  </span>
                ))}
              </div>
            </div>
            <p className="dashboard-todayCopy">
              {todayEvents.length > 0
                ? `${todayEvents.length} evento${todayEvents.length === 1 ? "" : "s"} para hoy.`
                : "No hay eventos para hoy."}
            </p>
            <Link className="dashboard-todayLink" to="/calendario">
              Ir a calendario
            </Link>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        {cards.map((card) => (
          <article key={card.to} className="dashboard-card">
            <span className="dashboard-cardLabel">{card.label}</span>
            <h2 className="dashboard-cardTitle">{card.title}</h2>
            <p className="dashboard-cardCopy">{card.copy}</p>
            <Link className="dashboard-cardLink" to={card.to}>
              Abrir modulo
            </Link>
          </article>
        ))}
      </section>

      {waStats && (
        <section className="dashboard-alertsPanel" style={{ marginBottom: "0" }}>
          <div className="dashboard-alertsHeader">
            <div>
              <div className="dashboard-kicker">WhatsApp</div>
              <h2>Actividad de hoy</h2>
            </div>
            <Link className="dashboard-alertCalendarLink" to="/whatsapp">
              Abrir panel
            </Link>
          </div>
          <div className="dashboard-alertsGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <article className="dashboard-alertColumn dashboard-alertColumn--tomorrow">
              <div className="dashboard-alertColumnHead">
                <span>Mensajes hoy</span>
                <strong>{waStats.byDay?.[todayKey] ?? 0}</strong>
              </div>
              <p className="dashboard-alertEmpty" style={{ marginTop: "8px" }}>Mensajes recibidos</p>
            </article>
            <article className="dashboard-alertColumn dashboard-alertColumn--today">
              <div className="dashboard-alertColumnHead">
                <span>Conversaciones activas</span>
                <strong>{(waStats.byStatus?.bot ?? 0) + (waStats.byStatus?.human ?? 0)}</strong>
              </div>
              <p className="dashboard-alertEmpty" style={{ marginTop: "8px" }}>
                {waStats.byStatus?.human ?? 0} esperando agente
              </p>
            </article>
            <article className="dashboard-alertColumn dashboard-alertColumn--danger">
              <div className="dashboard-alertColumnHead">
                <span>En mano humana</span>
                <strong>{waStats.byStatus?.human ?? 0}</strong>
              </div>
              <p className="dashboard-alertEmpty" style={{ marginTop: "8px" }}>Requieren respuesta</p>
            </article>
          </div>
        </section>
      )}

      <section className="dashboard-alertsPanel">
        <div className="dashboard-alertsHeader">
          <div>
            <div className="dashboard-kicker">Panel diario operativo</div>
            <h2>Hoy hay que mirar esto</h2>
          </div>
          <Link className="dashboard-alertCalendarLink" to="/ventas/estadisticas">
            Ver estadisticas
          </Link>
        </div>

        {dailyOpsError ? <div className="dashboard-alertError">{dailyOpsError}</div> : null}

        <div className="dashboard-alertsGrid dashboard-alertsGrid--wide">
          <OperationMetric
            title="Caja sin cerrar"
            value={dailyOps?.cashCount ?? "..."}
            detail={`${formatMoney(dailyOps?.cashAmount)} esperando pago o sena`}
            to="/notas-pedido/listado"
            tone={dailyOps?.cashCount > 0 ? "danger" : "today"}
          />
          <OperationMetric
            title="Entregas hoy"
            value={deliveryAlerts.today.length}
            detail={`${deliveryAlerts.overdue.length} atrasadas y ${deliveryAlerts.tomorrow.length} para manana`}
            to="/calendario"
            tone={deliveryAlerts.overdue.length > 0 ? "danger" : "today"}
          />
          <OperationMetric
            title="Presupuestos"
            value={dailyOps?.budgetDrafts ?? "..."}
            detail="Cargas pendientes para retomar o convertir en pedido"
            to="/presupuestos/guardadas"
            tone="tomorrow"
          />
          <OperationMetric
            title="Transferencias"
            value={dailyOps?.pendingTransfers ?? "..."}
            detail={`${formatMoney(dailyOps?.pendingTransferTotal)} sin conciliar`}
            to="/ventas/transferencias"
            tone={dailyOps?.pendingTransfers > 0 ? "danger" : "today"}
          />
          <OperationMetric
            title="Proveedor"
            value={dailyOps?.providerJobs ?? "..."}
            detail={`${dailyOps?.workshopJobs ?? 0} trabajos figuran en taller`}
            to="/proveedores"
            tone="tomorrow"
          />
          <OperationMetric
            title="Ventas hoy"
            value={dailyOps?.salesToday ?? "..."}
            detail={`${formatMoney(dailyOps?.salesTodayTotal)} cargado hoy`}
            to="/ventas/lista"
            tone="today"
          />
        </div>
      </section>

      <section className="dashboard-alertsPanel">
        <div className="dashboard-alertsHeader">
          <div>
            <div className="dashboard-kicker">Alertas operativas</div>
            <h2>Entregas de notas de pedido</h2>
          </div>
          <Link className="dashboard-alertCalendarLink" to="/calendario">
            Abrir calendario
          </Link>
        </div>

        {deliveryAlertsError ? <div className="dashboard-alertError">{deliveryAlertsError}</div> : null}

        <div className="dashboard-alertsGrid">
          <DeliveryAlertColumn
            title="Atrasadas"
            tone="danger"
            items={deliveryAlerts.overdue}
            emptyText="No hay notas atrasadas pendientes."
            canOpenNote={canOpenNote}
          />
          <DeliveryAlertColumn
            title="Entrega hoy"
            tone="today"
            items={deliveryAlerts.today}
            emptyText="No hay entregas de notas para hoy."
            canOpenNote={canOpenNote}
          />
          <DeliveryAlertColumn
            title="Entrega manana"
            tone="tomorrow"
            items={deliveryAlerts.tomorrow}
            emptyText="No hay entregas cargadas para manana."
            canOpenNote={canOpenNote}
          />
        </div>
      </section>
    </div>
  );
}
