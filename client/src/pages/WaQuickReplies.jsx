import { useEffect, useState } from 'react';
import { getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply } from '../services/whatsappApi';

const empty = { title: '', body: '', active: true };

export default function WaQuickReplies() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await getQuickReplies();
      setItems(data);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las respuestas rapidas.');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateQuickReply(editing, form);
      } else {
        await createQuickReply(form);
      }
      setForm(empty);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la respuesta rapida.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item._id);
    setForm({ title: item.title, body: item.body, active: item.active });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta respuesta rápida?')) return;
    await deleteQuickReply(id);
    await load();
  };

  const toggleActive = async (item) => {
    await updateQuickReply(item._id, { active: !item.active });
    await load();
  };

  const inputStyle = { width: '100%', padding: '9px 13px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 720 }}>
      <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>⚡ Respuestas rápidas</h3>
      <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14 }}>
        Guardá frases frecuentes para enviarlas con un clic desde el panel de conversaciones.
      </p>

      {error && <div style={{ marginBottom: 16, padding: 14, color: '#9a3412', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>{error}</div>}

      {/* Formulario */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>{editing ? '✏️ Editar respuesta' : '➕ Nueva respuesta rápida'}</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Nombre (para identificarla)</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej: Saludo inicial, Presupuesto en proceso..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>Mensaje</label>
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
            placeholder="Escribí el texto que se va a insertar en el chat..." rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.body.trim()}
            style={{ padding: '9px 24px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(empty); }}
              style={{ padding: '9px 16px', background: '#f0f0f0', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No hay respuestas rápidas todavía</div>
      )}
      {items.map(item => (
        <div key={item._id} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 10, opacity: item.active ? 1 : 0.55 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>⚡ {item.title}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => toggleActive(item)}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600,
                  background: item.active ? '#d1fae5' : '#f3f4f6', color: item.active ? '#065f46' : '#6b7280' }}>
                {item.active ? 'Activa' : 'Inactiva'}
              </button>
              <button onClick={() => handleEdit(item)}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => handleDelete(item._id)}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>
                Eliminar
              </button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#555', whiteSpace: 'pre-wrap', background: '#f9fafb', borderRadius: 6, padding: '8px 12px' }}>{item.body}</div>
        </div>
      ))}
    </div>
  );
}
