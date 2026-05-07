import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "sm_wa_manual_inbox";

const EMPTY_FORM = {
  name: "",
  phone: "",
  need: "",
  note: "",
  priority: "media",
  status: "pendiente",
  source: "whatsapp",
  nextAction: "",
};

const STATUS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "esperando", label: "Esperando cliente" },
  { value: "resuelto", label: "Resuelto" },
];

const PRIORITIES = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

function nowIso() {
  return new Date().toISOString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function waLink(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  const withCountry = digits.startsWith("54") ? digits : `549${digits}`;
  return `https://wa.me/${withCountry}`;
}

function loadItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function statusLabel(value) {
  return STATUS.find((item) => item.value === value)?.label || value;
}

function priorityLabel(value) {
  return PRIORITIES.find((item) => item.value === value)?.label || value;
}

function statusClass(value) {
  return `waInbox-pill waInbox-pill--${value}`;
}

function priorityClass(value) {
  return `waInbox-priority waInbox-priority--${value}`;
}

export default function WaInbox() {
  const [items, setItems] = useState(() => loadItems());
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("abiertos");
  const [priorityFilter, setPriorityFilter] = useState("");

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const stats = useMemo(() => {
    const open = items.filter((item) => item.status !== "resuelto").length;
    const high = items.filter((item) => item.status !== "resuelto" && item.priority === "alta").length;
    const follow = items.filter((item) => item.status === "seguimiento").length;
    return { total: items.length, open, high, follow };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusFilter === "abiertos" && item.status === "resuelto") return false;
        if (statusFilter && statusFilter !== "abiertos" && item.status !== statusFilter) return false;
        if (priorityFilter && item.priority !== priorityFilter) return false;
        if (!q) return true;
        return [item.name, item.phone, item.need, item.note, item.nextAction]
          .some((value) => String(value || "").toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const priorityOrder = { alta: 0, media: 1, baja: 2 };
        const statusOrder = { pendiente: 0, seguimiento: 1, esperando: 2, resuelto: 3 };
        const byStatus = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (byStatus !== 0) return byStatus;
        const byPriority = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        if (byPriority !== 0) return byPriority;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [items, priorityFilter, query, statusFilter]);

  function patchForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId("");
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim() && !form.phone.trim()) return;

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...form, phone: normalizePhone(form.phone), updatedAt: nowIso() }
            : item
        )
      );
      resetForm();
      return;
    }

    const next = {
      id: crypto.randomUUID(),
      ...form,
      phone: normalizePhone(form.phone),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setItems((prev) => [next, ...prev]);
    resetForm();
  }

  function editItem(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      phone: item.phone || "",
      need: item.need || "",
      note: item.note || "",
      priority: item.priority || "media",
      status: item.status || "pendiente",
      source: item.source || "whatsapp",
      nextAction: item.nextAction || "",
    });
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item)));
  }

  function deleteItem(id) {
    const ok = window.confirm("Eliminar este registro?");
    if (!ok) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="waInbox-page">
      <style>{`
        .waInbox-page { display: grid; gap: 16px; color: #261f18; }
        .waInbox-hero { display: flex; justify-content: space-between; gap: 18px; align-items: flex-end; padding: 22px; border-radius: 18px; background: #f8f3ea; border: 1px solid rgba(73,58,38,.1); }
        .waInbox-hero h1 { margin: 0; font-size: 30px; line-height: 1.05; }
        .waInbox-hero p { margin: 8px 0 0; max-width: 760px; color: #70665c; font-size: 14px; }
        .waInbox-stats { display: grid; grid-template-columns: repeat(4, minmax(110px, 1fr)); gap: 10px; }
        .waInbox-stat { padding: 12px 14px; border-radius: 14px; background: #fff; border: 1px solid rgba(73,58,38,.08); }
        .waInbox-stat span { display: block; color: #80766c; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .waInbox-stat strong { display: block; margin-top: 4px; font-size: 24px; }
        .waInbox-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; align-items: start; }
        .waInbox-panel { padding: 18px; border-radius: 18px; background: #fff; border: 1px solid rgba(73,58,38,.1); box-shadow: 0 14px 34px rgba(53,41,27,.06); }
        .waInbox-panel h2 { margin: 0 0 14px; font-size: 18px; }
        .waInbox-form { display: grid; gap: 10px; }
        .waInbox-input, .waInbox-select, .waInbox-textarea { width: 100%; border: 1px solid rgba(73,58,38,.14); border-radius: 12px; background: #fcfaf7; color: #261f18; font: inherit; box-sizing: border-box; }
        .waInbox-input, .waInbox-select { min-height: 42px; padding: 0 12px; }
        .waInbox-textarea { min-height: 86px; padding: 10px 12px; resize: vertical; }
        .waInbox-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .waInbox-actions { display: flex; gap: 8px; }
        .waInbox-btn { min-height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid rgba(73,58,38,.14); background: #fff; color: #2e261f; font-weight: 800; cursor: pointer; }
        .waInbox-btn--primary { background: #2f261e; color: #fffaf4; border-color: #2f261e; }
        .waInbox-btn--danger { background: #fff4f4; color: #953333; border-color: #f1c5c5; }
        .waInbox-toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) 180px 140px; gap: 10px; margin-bottom: 14px; }
        .waInbox-list { display: grid; gap: 10px; max-height: calc(100dvh - 300px); overflow: auto; padding-right: 4px; }
        .waInbox-card { display: grid; gap: 10px; padding: 14px; border-radius: 16px; border: 1px solid rgba(73,58,38,.1); background: #fffdf9; }
        .waInbox-cardHead { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
        .waInbox-name { font-weight: 900; font-size: 16px; }
        .waInbox-phone { margin-top: 3px; color: #746a60; font-size: 13px; }
        .waInbox-need { color: #2f2821; line-height: 1.4; }
        .waInbox-note { padding: 10px 12px; border-radius: 12px; background: #f7f2ea; color: #5f554b; font-size: 13px; line-height: 1.4; white-space: pre-wrap; }
        .waInbox-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: #80766c; font-size: 12px; }
        .waInbox-pill, .waInbox-priority { display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 900; }
        .waInbox-pill--pendiente { background: #fff3de; color: #8a5b17; }
        .waInbox-pill--seguimiento { background: #eef6ff; color: #2f6592; }
        .waInbox-pill--esperando { background: #f2f3f5; color: #5c6571; }
        .waInbox-pill--resuelto { background: #eaf7ef; color: #236743; }
        .waInbox-priority--alta { background: #fff0f0; color: #9a3131; }
        .waInbox-priority--media { background: #f6f0e6; color: #67513d; }
        .waInbox-priority--baja { background: #eef7ee; color: #3b6f42; }
        .waInbox-cardActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .waInbox-empty { padding: 34px; border-radius: 16px; background: #fcfaf7; text-align: center; color: #7a7065; font-weight: 800; }
        @media (max-width: 980px) {
          .waInbox-layout { grid-template-columns: 1fr; }
          .waInbox-hero { align-items: stretch; flex-direction: column; }
          .waInbox-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .waInbox-toolbar { grid-template-columns: 1fr; }
          .waInbox-list { max-height: none; overflow: visible; }
        }
      `}</style>

      <section className="waInbox-hero">
        <div>
          <h1>Control manual de WhatsApp</h1>
          <p>
            Registro interno para anotar quien escribio, que necesita, prioridad y proxima accion. No responde mensajes
            ni activa bot: solo te ayuda a ordenar la bandeja cuando se satura.
          </p>
        </div>
        <div className="waInbox-stats">
          <div className="waInbox-stat"><span>Abiertos</span><strong>{stats.open}</strong></div>
          <div className="waInbox-stat"><span>Alta prioridad</span><strong>{stats.high}</strong></div>
          <div className="waInbox-stat"><span>Seguimiento</span><strong>{stats.follow}</strong></div>
          <div className="waInbox-stat"><span>Total</span><strong>{stats.total}</strong></div>
        </div>
      </section>

      <div className="waInbox-layout">
        <section className="waInbox-panel">
          <h2>{editingId ? "Editar registro" : "Agregar chat"}</h2>
          <form className="waInbox-form" onSubmit={submit}>
            <input className="waInbox-input" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} placeholder="Nombre o referencia" />
            <input className="waInbox-input" value={form.phone} onChange={(e) => patchForm({ phone: e.target.value })} placeholder="Telefono WhatsApp" />
            <textarea className="waInbox-textarea" value={form.need} onChange={(e) => patchForm({ need: e.target.value })} placeholder="Que quiere? Ej: presupuesto de placard, consulta de entrega, reclamo..." />
            <textarea className="waInbox-textarea" value={form.note} onChange={(e) => patchForm({ note: e.target.value })} placeholder="Notas internas / contexto" />
            <input className="waInbox-input" value={form.nextAction} onChange={(e) => patchForm({ nextAction: e.target.value })} placeholder="Proxima accion. Ej: llamar, cotizar, pedir medidas" />
            <div className="waInbox-grid2">
              <select className="waInbox-select" value={form.priority} onChange={(e) => patchForm({ priority: e.target.value })}>
                {PRIORITIES.map((item) => <option key={item.value} value={item.value}>Prioridad {item.label}</option>)}
              </select>
              <select className="waInbox-select" value={form.status} onChange={(e) => patchForm({ status: e.target.value })}>
                {STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="waInbox-actions">
              <button className="waInbox-btn waInbox-btn--primary" type="submit">
                {editingId ? "Guardar cambios" : "Agregar chat"}
              </button>
              {editingId ? <button className="waInbox-btn" type="button" onClick={resetForm}>Cancelar</button> : null}
            </div>
          </form>
        </section>

        <section className="waInbox-panel">
          <div className="waInbox-toolbar">
            <input className="waInbox-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, telefono o necesidad" />
            <select className="waInbox-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="abiertos">Abiertos</option>
              <option value="">Todos</option>
              {STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select className="waInbox-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">Prioridad</option>
              {PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="waInbox-list">
            {filtered.length === 0 ? (
              <div className="waInbox-empty">No hay chats con esos filtros.</div>
            ) : (
              filtered.map((item) => (
                <article className="waInbox-card" key={item.id}>
                  <div className="waInbox-cardHead">
                    <div>
                      <div className="waInbox-name">{item.name || "Sin nombre"}</div>
                      <div className="waInbox-phone">{item.phone || "Sin telefono"}</div>
                    </div>
                    <div className="waInbox-meta">
                      <span className={priorityClass(item.priority)}>{priorityLabel(item.priority)}</span>
                      <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                    </div>
                  </div>

                  <div className="waInbox-need">{item.need || "Sin detalle cargado."}</div>
                  {item.note ? <div className="waInbox-note">{item.note}</div> : null}
                  <div className="waInbox-meta">
                    <span>Actualizado: {formatDateTime(item.updatedAt)}</span>
                    {item.nextAction ? <span>Proxima accion: {item.nextAction}</span> : null}
                  </div>

                  <div className="waInbox-cardActions">
                    <button className="waInbox-btn" type="button" onClick={() => editItem(item)}>Editar</button>
                    <button className="waInbox-btn" type="button" onClick={() => updateItem(item.id, { status: "seguimiento" })}>Seguimiento</button>
                    <button className="waInbox-btn" type="button" onClick={() => updateItem(item.id, { status: "resuelto" })}>Resolver</button>
                    {waLink(item.phone) ? (
                      <a className="waInbox-btn waInbox-btn--primary" href={waLink(item.phone)} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
                    ) : null}
                    <button className="waInbox-btn waInbox-btn--danger" type="button" onClick={() => deleteItem(item.id)}>Borrar</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
