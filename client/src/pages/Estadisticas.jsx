import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getEstadisticasGenerales } from "../services/estadisticas";

const COLORS = ["#5f7d6c", "#bb9658", "#2f5f74", "#9d5c45", "#6e7f55", "#8b6f47", "#7d6c90"];

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

function shortLabel(value) {
  const text = String(value || "Sin dato");
  return text.length > 28 ? `${text.slice(0, 25)}...` : text;
}

function goalPercent(value, goal) {
  const goalNumber = Number(goal || 0);
  if (!goalNumber) return 0;
  return Math.min(100, Math.round((Number(value || 0) / goalNumber) * 100));
}

function chartData(items = [], limit = 8) {
  return items.slice(0, limit).map((item) => ({ ...item, name: shortLabel(item.label) }));
}

function StatCard({ label, value, detail, tone = "" }) {
  return (
    <article className={`stats-card ${tone ? `stats-card--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

function RankingCard({ title, items = [], mode = "money" }) {
  return (
    <article className="stats-panel">
      <div className="stats-panelTitle">{title}</div>
      {items.length === 0 ? <div className="config-usersEmpty">Sin datos para este mes.</div> : null}
      <div className="stats-ranking">
        {items.slice(0, 8).map((item, index) => (
          <div key={`${title}-${item.label}`} className="stats-rankingItem">
            <div>
              <strong>{index + 1}. {item.label}</strong>
              <span>{item.count} {item.count === 1 ? "vez" : "veces"}</span>
            </div>
            <b>{mode === "count" ? item.count : formatMoney(item.total)}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function Estadisticas() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const nextData = await getEstadisticasGenerales(month);
      setData(nextData);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar las estadisticas");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const summary = data?.summary || {};
  const rankings = data?.rankings || {};
  const sellersChart = useMemo(() => chartData(rankings.sellers), [rankings.sellers]);
  const itemsChart = useMemo(() => chartData(rankings.soldItems, 7), [rankings.soldItems]);
  const modulesChart = useMemo(() => chartData(rankings.moduleUsage), [rankings.moduleUsage]);
  const categoriesChart = useMemo(() => chartData(rankings.categories), [rankings.categories]);
  const salesProgress = goalPercent(summary.salesTotal, summary.salesGoal);
  const commissionProgress = goalPercent(summary.commissionTotal, summary.commissionGoal);

  return (
    <section className="stats-shell">
      <div className="config-usersHero monthly-salesHero">
        <div>
          <div className="dashboard-kicker">Modulo</div>
          <h1 className="dashboard-title">Estadisticas</h1>
        </div>
        <p className="dashboard-copy">Ventas, vendedores, productos mas movidos y uso de herramientas.</p>
      </div>

      <div className="monthly-salesToolbar">
        <div className="monthly-salesTabs">
          <span className="monthly-salesTab active">Resumen general</span>
        </div>
        <label className="config-usersField monthly-salesMonth">
          <span>Mes</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </div>

      {error ? <div className="config-usersMessage error">{error}</div> : null}
      {isLoading ? <div className="config-usersEmpty">Cargando estadisticas...</div> : null}

      {!isLoading && data ? (
        <>
          <div className="stats-grid">
            <StatCard label="Ventas del mes" value={formatMoney(summary.salesTotal)} detail={`${data.totals?.salesCount || 0} ventas cargadas`} tone="strong" />
            <StatCard label="Comision estimada" value={formatMoney(summary.commissionTotal)} detail={`${commissionProgress}% del objetivo`} />
            <StatCard label="Objetivo mensual" value={`${salesProgress}%`} detail={`${formatMoney(summary.salesTotal)} de ${formatMoney(summary.salesGoal)}`} />
            <StatCard label="Pendiente de cobro" value={formatMoney(summary.pendingTotal)} detail="Ventas marcadas como pendientes" tone="danger" />
            <StatCard label="Notas de pedido" value={data.totals?.notesCount || 0} detail="Notas creadas en el mes" />
            <StatCard label="Uso de modulos" value={data.totals?.moduleEventsCount || 0} detail="Aperturas registradas este mes" />
          </div>

          <div className="stats-progressGrid">
            <article className="stats-progressCard">
              <span>Progreso de ventas</span>
              <strong>{salesProgress}%</strong>
              <div><i style={{ width: `${salesProgress}%` }} /></div>
            </article>
            <article className="stats-progressCard">
              <span>Progreso de comision</span>
              <strong>{commissionProgress}%</strong>
              <div><i style={{ width: `${commissionProgress}%` }} /></div>
            </article>
          </div>

          <div className="stats-chartGrid">
            <article className="stats-panel">
              <div className="stats-panelTitle">Cuanto vendio cada vendedor</div>
              <div className="stats-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sellersChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} width={58} />
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Legend />
                    <Bar dataKey="total" name="Ventas" fill="#5f7d6c" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="commission" name="Comision" fill="#bb9658" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="stats-panel">
              <div className="stats-panelTitle">Lo que mas se vendio</div>
              <div className="stats-chart stats-chart--horizontal">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemsChart} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value} unidades`, "Cantidad"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.label || "Producto"}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Cantidad" fill="#2f5f74" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="stats-panel">
              <div className="stats-panelTitle">Uso de cotizadores y herramientas</div>
              <div className="stats-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modulesChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Usos" fill="#bb9658" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="stats-panel">
              <div className="stats-panelTitle">Ventas por categoria</div>
              <div className="stats-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoriesChart} dataKey="total" nameKey="name" outerRadius={96} label>
                      {categoriesChart.map((entry, index) => (
                        <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          <div className="stats-rankGrid">
            <RankingCard title="Ranking de vendedores" items={rankings.sellers} />
            <RankingCard title="Productos o conceptos mas vendidos" items={rankings.soldItems} mode="count" />
            <RankingCard title="Uso de modulos" items={rankings.moduleUsage} mode="count" />
            <RankingCard title="Mejores clientes" items={rankings.clients} />
            <RankingCard title="Categorias" items={rankings.categories} />
            <RankingCard title="Subcategorias" items={rankings.subcategories} />
          </div>
        </>
      ) : null}
    </section>
  );
}
