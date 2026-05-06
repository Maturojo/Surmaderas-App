import { useEffect, useState } from 'react';
import { getBudgetRequests, updateBudgetRequest } from '../services/whatsappApi';

const STATUS_OPTIONS = [
  { value: 'pendiente', label: '🕐 Pendiente', color: '#f59e0b' },
  { value: 'en_proceso', label: '🔧 En proceso', color: '#3b82f6' },
  { value: 'enviado', label: '✅ Enviado', color: '#16a34a' },
  { value: 'descartado', label: '❌ Descartado', color: '#9ca3af' },
];

function statusLabel(s) {
  return STATUS_OPTIONS.find(o => o.value === s)?.label || s;
}
function statusColor(s) {
  return STATUS_OPTIONS.find(o => o.value === s)?.color || '#aaa';
}

export default function WaBudgetRequests() {
  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [filterStatus]);

  const load = async () => {
    const params = filterStatus ? { status: filterStatus } : {};
    try {
      const { data } = await getBudgetRequests(params);
      setItems(data);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las solicitudes.');
    }
  };

  const select = (item) => {
    setSelected(item);
    setNotes(item.notes || '');
  };

  const changeStatus = async (id, status) => {
    await updateBudgetRequest(id, { status });
    setItems(prev => prev.map(i => i._id === id ? { ...i, status } : i));
    if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await updateBudgetRequest(selected._id, { notes });
      setItems(prev => prev.map(i => i._id === selected._id ? { ...i, notes } : i));
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron guardar las notas.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 100px)' }}>
      {error && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, maxWidth: 360, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 20 }}>
          {error}
        </div>
      )}

      {/* Lista */}
      <div style={{ width: 360, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📋 Solicitudes de presupuesto</div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13 }}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No hay solicitudes</div>
          )}
          {items.map(item => (
            <div key={item._id} onClick={() => select(item)}
              style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', background: selected?._id === item._id ? '#f0fdf4' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: statusColor(item.status), color: '#fff' }}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>🪵 {item.mueble}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{item.phone} · {formatDate(item.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24, display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
            Seleccioná una solicitud para ver el detalle
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{selected.phone} · {formatDate(selected.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {STATUS_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => changeStatus(selected._id, o.value)}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: selected.status === o.value ? o.color : '#f0f0f0',
                      color: selected.status === o.value ? '#fff' : '#555' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: '🪵 Mueble', value: selected.mueble },
                { label: '📐 Medidas', value: selected.medidas },
                { label: '🎨 Estilo / Material', value: selected.estilo },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, color: '#333' }}>{value || '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Notas internas</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Anotá observaciones, precio estimado, materiales sugeridos..."
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'none', outline: 'none', minHeight: 120 }} />
            </div>

            <button onClick={saveNotes} disabled={saving}
              style={{ marginTop: 12, padding: '10px 0', background: saving ? '#aaa' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              {saving ? 'Guardando...' : '💾 Guardar notas'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
