import { useEffect, useState } from 'react';
import { getConversations, sendBroadcast } from '../services/whatsappApi';

export default function WaBroadcast() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getConversations({ status: filterStatus, search })
      .then(({ data }) => {
        setConversations(data);
        setError('');
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar los contactos.'));
  }, [filterStatus, search]);

  const toggleSelect = (phone) => {
    setSelected(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
  };

  const selectAll = () => setSelected(conversations.map(c => c.phone));
  const clearAll = () => setSelected([]);

  const handleSend = async () => {
    if (!message.trim()) return alert('Escribí el mensaje antes de enviar');
    if (selected.length === 0) return alert('Seleccioná al menos un contacto');
    if (!confirm(`¿Enviar a ${selected.length} contacto${selected.length === 1 ? '' : 's'}?`)) return;

    setSending(true);
    setResult(null);
    try {
      const { data } = await sendBroadcast({ message, phones: selected });
      setResult(data);
      setMessage('');
      setSelected([]);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setSending(false);
    }
  };

  const STATUS_LABELS = { bot: '🤖 Bot', human: '👤 Agente', closed: '✅ Cerrado' };

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 100px)' }}>
      {error && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, maxWidth: 360, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 20 }}>
          {error}
        </div>
      )}

      {/* Selector de contactos */}
      <div style={{ width: 340, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📋 Seleccionar contactos</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box', marginBottom: 6 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, marginBottom: 8 }}>
            <option value="">Todos los estados</option>
            <option value="bot">🤖 Bot</option>
            <option value="human">👤 Agente</option>
            <option value="closed">✅ Cerrado</option>
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={selectAll} style={{ flex: 1, padding: '5px 0', fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', color: '#16a34a', fontWeight: 600 }}>
              Seleccionar todos ({conversations.length})
            </button>
            <button onClick={clearAll} style={{ padding: '5px 10px', fontSize: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626' }}>
              Limpiar
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {conversations.map(c => (
            <div key={c.phone} onClick={() => toggleSelect(c.phone)}
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                background: selected.includes(c.phone) ? '#f0fdf4' : '#fff', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected.includes(c.phone) ? '#16a34a' : '#ccc'}`,
                background: selected.includes(c.phone) ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected.includes(c.phone) && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{c.phone} · {STATUS_LABELS[c.status]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redactar y enviar */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>📢 Mensaje masivo</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Destinatarios seleccionados</div>
          <div style={{ padding: '10px 14px', background: selected.length > 0 ? '#f0fdf4' : '#f9fafb', borderRadius: 8, border: `1px solid ${selected.length > 0 ? '#bbf7d0' : '#e5e7eb'}`, fontSize: 14, fontWeight: 600, color: selected.length > 0 ? '#16a34a' : '#9ca3af' }}>
            {selected.length === 0 ? 'Ninguno seleccionado' : `${selected.length} contacto${selected.length === 1 ? '' : 's'}`}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>Mensaje</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Escribí el mensaje que van a recibir todos los contactos seleccionados..."
            style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'none', outline: 'none', minHeight: 180 }} />
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{message.length} caracteres</div>
        </div>

        <button onClick={handleSend} disabled={sending || selected.length === 0 || !message.trim()}
          style={{ padding: '13px 0', background: sending ? '#aaa' : '#25D366', color: '#fff', border: 'none', borderRadius: 8, cursor: sending ? 'wait' : 'pointer', fontWeight: 700, fontSize: 15 }}>
          {sending ? `Enviando... (${selected.length} mensajes)` : `📤 Enviar a ${selected.length} contacto${selected.length === 1 ? '' : 's'}`}
        </button>

        {result && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: result.error ? '#fef2f2' : '#f0fdf4', border: `1px solid ${result.error ? '#fecaca' : '#bbf7d0'}` }}>
            {result.error ? (
              <div style={{ color: '#dc2626', fontSize: 13 }}>❌ Error: {result.error}</div>
            ) : (
              <>
                <div style={{ color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>✅ Envío completado</div>
                <div style={{ fontSize: 13, color: '#555' }}>Enviados: {result.sent} · Fallidos: {result.failed}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
