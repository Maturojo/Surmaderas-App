import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getStats } from '../services/api';

const COLORS = ['#25D366', '#f59e0b', '#9ca3af'];

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <div style={{ padding: 40, color: '#aaa' }}>Cargando estadísticas...</div>;

  const statusData = stats.byStatus.map(s => ({ name: { bot: 'Bot', human: 'Agente', closed: 'Cerrado' }[s._id] || s._id, value: s.count }));
  const msgData = stats.msgStats.map(m => ({ name: { customer: 'Clientes', bot: 'Bot', agent: 'Agentes' }[m._id] || m._id, mensajes: m.count }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: 'Total conversaciones', value: stats.total, color: '#25D366' },
          { label: 'Gestionadas por bot', value: stats.byStatus.find(s => s._id === 'bot')?.count || 0, color: '#3b82f6' },
          { label: 'Escaladas a agente', value: stats.byStatus.find(s => s._id === 'human')?.count || 0, color: '#f59e0b' },
          { label: 'Cerradas', value: stats.byStatus.find(s => s._id === 'closed')?.count || 0, color: '#9ca3af' },
        ].map(kpi => (
          <div key={kpi.label} style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Conversaciones por día */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700 }}>Conversaciones últimos 7 días</h4>
          {stats.byDay.length === 0 ? (
            <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byDay}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#25D366" radius={[4, 4, 0, 0]} name="Conversaciones" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Mensajes por origen */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h4 style={{ margin: '0 0 16px', fontWeight: 700 }}>Mensajes por origen</h4>
          {msgData.length === 0 ? (
            <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={msgData} dataKey="mensajes" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {msgData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Estado de conversaciones */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h4 style={{ margin: '0 0 16px', fontWeight: 700 }}>Mensajes totales por tipo</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={msgData} layout="vertical">
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="mensajes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
