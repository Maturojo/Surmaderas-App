import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  addNote,
  getConversations,
  getConversation,
  getQuickReplies,
  isWhatsAppConfigured,
  replyToConversation,
  updateStatus,
  updateTags,
  waSocket,
  whatsappConfigMessage,
} from '../services/whatsappApi';

const STATUS_COLORS = { bot: '#25D366', human: '#f59e0b', closed: '#9ca3af' };
const STATUS_LABELS = { bot: '🤖 Bot', human: '👤 Agente', closed: '✅ Cerrado' };
const ALL_TAGS = ['Presupuesto pendiente', 'Entrega', 'Consulta', 'Cliente nuevo', 'Seguimiento', 'Urgente'];

const playSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch {}
};

export default function WaConversations() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [chat, setChat] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState(isWhatsAppConfigured ? '' : whatsappConfigMessage);
  const bottomRef = useRef();

  useEffect(() => {
    if (!isWhatsAppConfigured) return;
    const socket = io(waSocket);

    loadList();
    if (Notification.permission === 'default') Notification.requestPermission();

    getQuickReplies().then(({ data }) => setQuickReplies(data)).catch(() => {});

    socket.on('new_message', ({ phone, name, message }) => {
      playSound();
      if (Notification.permission === 'granted') new Notification(`📱 ${name || phone}`, { body: message.body });
      loadList();
      setChat(prev => prev?.phone === phone ? { ...prev, messages: [...prev.messages, message] } : prev);
    });
    socket.on('bot_reply', ({ phone, message }) => {
      setChat(prev => prev?.phone === phone ? { ...prev, messages: [...prev.messages, message] } : prev);
    });
    socket.on('agent_reply', ({ phone, message }) => {
      setChat(prev => prev?.phone === phone ? { ...prev, messages: [...prev.messages, message] } : prev);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages]);
  useEffect(() => { loadList(); }, [search, filterStatus, filterTag]);

  const loadList = async () => {
    const params = {};
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    if (filterTag) params.tag = filterTag;
    try {
      const { data } = await getConversations(params);
      setList(data);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudo cargar WhatsApp.');
    }
  };

  const selectConv = async (phone) => {
    setSelected(phone);
    try {
      const { data } = await getConversation(phone);
      setChat(data);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudo cargar la conversacion.');
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    await replyToConversation(selected, reply);
    setReply('');
    const { data } = await getConversation(selected);
    setChat(data);
  };

  const changeStatus = async (status) => {
    await updateStatus(selected, status);
    setChat(prev => ({ ...prev, status }));
    loadList();
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;
    const { data } = await addNote(selected, newNote);
    setChat(prev => ({ ...prev, notes: [...(prev.notes || []), data] }));
    setNewNote('');
  };

  const toggleTag = async (tag) => {
    const current = chat.tags || [];
    const newTags = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    await updateTags(selected, newTags);
    setChat(prev => ({ ...prev, tags: newTags }));
    loadList();
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 100px)' }}>
      {error && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, maxWidth: 360, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 20 }}>
          {error}
        </div>
      )}
      {/* Lista */}
      <div style={{ width: 340, background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #eee' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}>
              <option value="">Todos</option>
              <option value="bot">🤖 Bot</option>
              <option value="human">👤 Agente</option>
              <option value="closed">✅ Cerrado</option>
            </select>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}>
              <option value="">Todas</option>
              {ALL_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '6px 12px', fontSize: 11, color: '#aaa' }}>{list.length} conversaciones</div>
          {list.map(c => (
            <div key={c.phone} onClick={() => selectConv(c.phone)}
              style={{ padding: '10px 12px', cursor: 'pointer', background: selected === c.phone ? '#f0fdf4' : '#fff', borderBottom: '1px solid #f3f3f3' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: STATUS_COLORS[c.status], color: '#fff' }}>{STATUS_LABELS[c.status]}</span>
              </div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{c.phone}</div>
              {c.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {c.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#e0f2fe', color: '#0369a1' }}>{t}</span>)}
                </div>
              )}
              {c.budgetFlow?.step === 4 && <div style={{ marginTop: 3, fontSize: 11, color: '#7c3aed' }}>📋 Presupuesto recibido</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
        {!chat ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>Seleccioná una conversación</div>
        ) : (
          <>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }} onClick={() => setShowTagMenu(false)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{chat.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{chat.phone}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['bot', 'human', 'closed'].map(s => (
                    <button key={s} onClick={() => changeStatus(s)}
                      style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                        background: chat.status === s ? STATUS_COLORS[s] : '#f0f0f0', color: chat.status === s ? '#fff' : '#555' }}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {(chat.tags || []).map(t => (
                  <span key={t} onClick={(e) => { e.stopPropagation(); toggleTag(t); }}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}>
                    {t} ✕
                  </span>
                ))}
                <div style={{ position: 'relative' }}>
                  <button onClick={(e) => { e.stopPropagation(); setShowTagMenu(!showTagMenu); }}
                    style={{ fontSize: 11, padding: '2px 10px', borderRadius: 8, border: '1px dashed #ccc', background: 'transparent', cursor: 'pointer', color: '#666' }}>
                    + Etiqueta
                  </button>
                  {showTagMenu && (
                    <div style={{ position: 'absolute', top: 26, left: 0, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 10, minWidth: 190 }}>
                      {ALL_TAGS.map(t => (
                        <div key={t} onClick={(e) => { e.stopPropagation(); toggleTag(t); setShowTagMenu(false); }}
                          style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                            background: (chat.tags || []).includes(t) ? '#f0fdf4' : '#fff',
                            color: (chat.tags || []).includes(t) ? '#16a34a' : '#333' }}>
                          {(chat.tags || []).includes(t) ? '✓ ' : ''}{t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {chat.budgetFlow?.step === 4 && (
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 8, background: '#f3e8ff', color: '#7c3aed' }}>
                    📋 {chat.budgetFlow.mueble} · {chat.budgetFlow.medidas}
                  </span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, background: '#ece5dd' }}
              onClick={() => setShowTagMenu(false)}>
              {chat.messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.from === 'customer' ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '70%', padding: '8px 14px', borderRadius: 10, fontSize: 14, whiteSpace: 'pre-wrap',
                    background: m.from === 'customer' ? '#fff' : m.from === 'bot' ? '#dcf8c6' : '#d1e8ff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {m.from !== 'customer' && <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{m.from === 'bot' ? '🤖 Bot' : '👤 Agente'}</div>}
                    {m.body}
                    <div style={{ fontSize: 10, color: '#aaa', textAlign: 'right', marginTop: 2 }}>
                      {new Date(m.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Notas internas */}
            <div style={{ borderTop: '1px solid #eee', background: '#fffbeb' }}>
              <button onClick={() => setShowNotes(!showNotes)}
                style={{ width: '100%', padding: '7px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#92400e', textAlign: 'left', fontWeight: 600 }}>
                📝 Notas internas {chat.notes?.length > 0 ? `(${chat.notes.length})` : ''} {showNotes ? '▲' : '▼'}
              </button>
              {showNotes && (
                <div style={{ padding: '0 16px 12px' }}>
                  {(chat.notes || []).map((n, i) => (
                    <div key={i} style={{ fontSize: 12, background: '#fef3c7', borderRadius: 6, padding: '6px 10px', marginBottom: 6, color: '#78350f' }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{n.author} · {new Date(n.timestamp).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      {n.body}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote()}
                      placeholder="Nueva nota interna..." style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #fcd34d', fontSize: 12 }} />
                    <button onClick={saveNote} style={{ padding: '6px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {chat.status !== 'closed' && (
              <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()}
                    placeholder="Escribir respuesta manual..."
                    style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                  {quickReplies.length > 0 && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button onClick={() => setShowQR(!showQR)}
                        style={{ position: 'absolute', right: 8, top: -30, padding: '4px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#555' }}>
                        ⚡ Respuestas rápidas
                      </button>
                      {showQR && (
                        <div style={{ position: 'absolute', bottom: 10, right: 0, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, minWidth: 260, maxHeight: 240, overflow: 'auto' }}>
                          {quickReplies.filter(q => q.active).map(q => (
                            <div key={q._id} onClick={() => { setReply(q.body); setShowQR(false); }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{q.title}</div>
                              <div style={{ fontSize: 11, color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.body}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={sendReply}
                  style={{ padding: '8px 20px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  Enviar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
