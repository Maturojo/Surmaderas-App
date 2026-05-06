import { useEffect, useState } from 'react';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../services/whatsappApi';

const emptyForm = { question: '', answer: '', keywords: '' };

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await getFAQs();
      setFaqs(data);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las FAQs.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean) };
    if (editing) {
      await updateFAQ(editing, payload);
    } else {
      await createFAQ(payload);
    }
    setForm(emptyForm);
    setEditing(null);
    setLoading(false);
    load();
  };

  const startEdit = (faq) => {
    setEditing(faq._id);
    setForm({ question: faq.question, answer: faq.answer, keywords: faq.keywords.join(', ') });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta FAQ?')) return;
    await deleteFAQ(id);
    load();
  };

  const toggleActive = async (faq) => {
    await updateFAQ(faq._id, { active: !faq.active });
    load();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
      {error && <div style={{ gridColumn: '1 / -1', padding: 14, color: '#9a3412', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>{error}</div>}
      {/* Formulario */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', alignSelf: 'start' }}>
        <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>{editing ? 'Editar FAQ' : 'Nueva FAQ'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Pregunta de ejemplo</label>
            <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #ddd', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Keywords (separadas por coma)</label>
            <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} required
              placeholder="precio, valor, cuánto cuesta"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #ddd', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Respuesta del bot</label>
            <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} required rows={4}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #ddd', marginTop: 4, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '10px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar FAQ'}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}
                style={{ padding: '10px 16px', background: '#f0f0f0', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista FAQs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>FAQs configuradas ({faqs.length})</h3>
        {faqs.length === 0 && <div style={{ color: '#aaa', background: '#fff', padding: 24, borderRadius: 10 }}>No hay FAQs todavía. Creá la primera.</div>}
        {faqs.map(faq => (
          <div key={faq._id} style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', opacity: faq.active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{faq.question}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => toggleActive(faq)}
                  style={{ padding: '3px 10px', fontSize: 12, border: 'none', borderRadius: 5, cursor: 'pointer', background: faq.active ? '#dcfce7' : '#fee2e2', color: faq.active ? '#16a34a' : '#dc2626' }}>
                  {faq.active ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => startEdit(faq)}
                  style={{ padding: '3px 10px', fontSize: 12, border: 'none', borderRadius: 5, cursor: 'pointer', background: '#e0f2fe', color: '#0369a1' }}>
                  Editar
                </button>
                <button onClick={() => handleDelete(faq._id)}
                  style={{ padding: '3px 10px', fontSize: 12, border: 'none', borderRadius: 5, cursor: 'pointer', background: '#fee2e2', color: '#dc2626' }}>
                  Borrar
                </button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
              Keywords: {faq.keywords.map(k => <span key={k} style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, marginRight: 4 }}>{k}</span>)}
            </div>
            <div style={{ fontSize: 13, color: '#444', background: '#f9f9f9', padding: '8px 12px', borderRadius: 6 }}>{faq.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
