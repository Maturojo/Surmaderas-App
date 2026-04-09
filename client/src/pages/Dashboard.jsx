import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { obtenerCalendario } from "../services/calendar";
import { getTurnero, takeTurno } from "../services/turnero";

const CARDS = [
  {
    label: "Caja",
    title: "Listado de notas en espera",
    copy: "Aca vive el circuito de espera hasta que el cliente paga o deja seña.",
    to: "/notas-pedido/listado",
  },
  {
    label: "Ventas",
    title: "Nueva nota de pedido",
    copy: "Genera pedidos en mostrador con cliente, entrega, detalle e importe.",
    to: "/notas-pedido",
  },
  {
    label: "Archivo",
    title: "Notas guardadas",
    copy: "Consulta, imprime o comparte pedidos ya cerrados en caja.",
    to: "/notas-pedido/guardadas",
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

export default function Dashboard() {
  const [turnero, setTurnero] = useState(null);
  const [isLoadingTurnero, setIsLoadingTurnero] = useState(true);
  const [isTakingTurno, setIsTakingTurno] = useState(false);
  const [turneroError, setTurneroError] = useState("");
  const [todayEvents, setTodayEvents] = useState([]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayNumber = today.getDate();

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

    async function loadTodayEvents() {
      try {
        const data = await obtenerCalendario({ fecha: todayKey });
        if (!cancelled) {
          setTodayEvents(Array.isArray(data?.byDay?.[todayKey]) ? data.byDay[todayKey] : []);
        }
      } catch {
        if (!cancelled) {
          setTodayEvents([]);
        }
      }
    }

    loadTodayEvents();
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
        {CARDS.map((card) => (
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
    </div>
  );
}
