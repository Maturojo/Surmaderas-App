import { useEffect, useState } from 'react';
import { getConfig, saveConfig } from '../services/whatsappApi';

const DAYS = [
  { value: '1', label: 'Lun' }, { value: '2', label: 'Mar' }, { value: '3', label: 'Mié' },
  { value: '4', label: 'Jue' }, { value: '5', label: 'Vie' }, { value: '6', label: 'Sáb' }, { value: '0', label: 'Dom' },
];

export default function WaSettings() {
  const [form, setForm] = useState({
    bot_enabled: 'true',
    business_name: '', instagram: '',
    default_response: '',
    welcome_message: '', welcome_enabled: 'true',
    closed_message: '', schedule_enabled: 'false',
    schedule_open: '09:00', schedule_close: '18:00', schedule_days: '1,2,3,4,5',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getConfig()
      .then(({ data }) => {
        setForm(f => ({ ...f, ...data }));
        setError('');
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la configuracion.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleDay = (day) => {
    const days = form.schedule_days ? form.schedule_days.split(',').filter(Boolean) : [];
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    setForm({ ...form, schedule_days: newDays.join(',') });
  };

  const activeDays = form.schedule_days ? form.schedule_days.split(',') : [];

  if (loading) return <div style={{ padding: 40, color: '#aaa' }}>Cargando...</div>;

  const Section = ({ title, children }) => (
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 16px', fontWeight: 700, color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>{title}</h4>
      {children}
    </div>
  );

  const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>{label}</label>}
      {children}
      {hint && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{hint}</div>}
    </div>
  );

  const inputStyle = { width: '100%', padding: '9px 13px', borderRadius: 7, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' };
  const textareaStyle = { ...inputStyle, resize: 'vertical' };

  return (
    <div style={{ maxWidth: 680, padding: '24px 0' }}>
      <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>⚙️ Configuración del bot</h3>
      {error && <div style={{ marginBottom: 16, padding: 14, color: '#9a3412', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>{error}</div>}
      <form onSubmit={handleSave}>

        <Section title="🤖 Contestador automático">
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div onClick={() => setForm({ ...form, bot_enabled: form.bot_enabled === 'true' ? 'false' : 'true' })}
              style={{ width: 48, height: 26, borderRadius: 13, background: form.bot_enabled === 'true' ? '#25D366' : '#ccc',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: form.bot_enabled === 'true' ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: form.bot_enabled === 'true' ? '#16a34a' : '#888' }}>
              {form.bot_enabled === 'true' ? 'Bot activo — respondiendo automáticamente' : 'Bot desactivado — solo modo agente'}
            </span>
          </label>
          <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
            Cuando está desactivado, los mensajes llegan al panel pero el bot no responde nada.
          </div>
        </Section>

        <Section title="🏢 Negocio">
          <Field label="Nombre del negocio">
            <input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Instagram">
            <input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@surmaderas.mdp" style={inputStyle} />
          </Field>
        </Section>

        <Section title="👋 Mensaje de bienvenida">
          <Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.welcome_enabled === 'true'}
                onChange={e => setForm({ ...form, welcome_enabled: e.target.checked ? 'true' : 'false' })} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Activar mensaje de bienvenida</span>
            </label>
          </Field>
          <Field label="Mensaje para nuevos contactos" hint="Se envía automáticamente la primera vez que alguien te escribe.">
            <textarea value={form.welcome_message} onChange={e => setForm({ ...form, welcome_message: e.target.value })}
              rows={3} style={textareaStyle} disabled={form.welcome_enabled !== 'true'} />
          </Field>
        </Section>

        <Section title="🕐 Horario de atención">
          <Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.schedule_enabled === 'true'}
                onChange={e => setForm({ ...form, schedule_enabled: e.target.checked ? 'true' : 'false' })} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Activar respuesta fuera de horario</span>
            </label>
          </Field>
          <Field label="Días de atención">
            <div style={{ display: 'flex', gap: 8 }}>
              {DAYS.map(d => (
                <button type="button" key={d.value} onClick={() => toggleDay(d.value)}
                  disabled={form.schedule_enabled !== 'true'}
                  style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: activeDays.includes(d.value) ? '#25D366' : '#f0f0f0',
                    color: activeDays.includes(d.value) ? '#fff' : '#555',
                    opacity: form.schedule_enabled !== 'true' ? 0.5 : 1 }}>
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Apertura">
              <input type="time" value={form.schedule_open} onChange={e => setForm({ ...form, schedule_open: e.target.value })}
                disabled={form.schedule_enabled !== 'true'} style={{ ...inputStyle, width: 'auto' }} />
            </Field>
            <Field label="Cierre">
              <input type="time" value={form.schedule_close} onChange={e => setForm({ ...form, schedule_close: e.target.value })}
                disabled={form.schedule_enabled !== 'true'} style={{ ...inputStyle, width: 'auto' }} />
            </Field>
          </div>
          <Field label="Mensaje fuera de horario" hint="Se envía automáticamente cuando escriben fuera del horario configurado.">
            <textarea value={form.closed_message} onChange={e => setForm({ ...form, closed_message: e.target.value })}
              rows={3} style={textareaStyle} disabled={form.schedule_enabled !== 'true'} />
          </Field>
        </Section>

        <Section title="💬 Respuesta por defecto">
          <Field label="Mensaje cuando el bot no reconoce la consulta" hint="Luego de este mensaje la conversación pasa a modo Agente.">
            <textarea value={form.default_response} onChange={e => setForm({ ...form, default_response: e.target.value })}
              rows={4} style={textareaStyle} />
          </Field>
        </Section>

        <button type="submit"
          style={{ width: '100%', padding: 12, background: saved ? '#16a34a' : '#25D366', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
          {saved ? '✅ Guardado' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
