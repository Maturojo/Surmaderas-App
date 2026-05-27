import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "sm_wa_manual_inbox";

// ─── Motivos rápidos ─── Agregar/quitar opciones aquí:
const QUICK_REASONS = [
  "Presupuesto placard",
  "Consulta entrega",
  "Reclamo",
  "Consulta precio",
  "Seguimiento pedido",
];

const INACTIVITY_MS = 24 * 60 * 60 * 1000; // 24 horas

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

const KANBAN_COLS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "seguimiento", label: "En proceso" },
  { value: "esperando", label: "Esperando" },
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

function isInactive(item) {
  const ref = item.updatedAt || item.createdAt;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > INACTIVITY_MS;
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
  const [viewMode, setViewMode] = useState("lista"); // "lista" | "kanban"
  const [inactiveOnly, setInactiveOnly] = useState(false);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const stats = useMemo(() => {
    const open = items.filter((item) => item.status !== "resuelto").length;
    const high = items.filter((item) => item.status !== "resuelto" && item.priority === "alta").length;
    const follow = items.filter((item) => item.status === "seguimiento").length;
    const inactive = items.filter((item) => item.status !== "resuelto" && isInactive(item)).length;
    return { total: items.length, open, high, follow, inactive };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusFilter === "abiertos" && item.status === "resuelto") return false;
        if (statusFilter && statusFilter !== "abiertos" && item.status !== statusFilter) return false;
        if (priorityFilter && item.priority !== priorityFilter) return false;
        if (inactiveOnly && !isInactive(item)) return false;
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
  }, [items, priorityFilter, query, statusFilter, inactiveOnly]);

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
        .waInbox-hero { display: flex; justify-content: space-between; gap: 18px; align-items: flex-end; padding: 22px; border-radius: 18px; background: #f2f2f0; border: 1px solid var(--sm-dashboard-line); }
        .waInbox-hero h1 { margin: 0; font-size: 30px; line-height: 1.05; }
        .waInbox-hero p { margin: 8px 0 0; max-width: 760px; color: #70665c; font-size: 14px; }
        .waInbox-stats { display: grid; grid-template-columns: repeat(5, minmax(100px, 1fr)); gap: 10px; }
        .waInbox-stat { padding: 12px 14px; border-radius: 14px; background: #fff; border: 1px solid rgba(73,58,38,.08); }
        .waInbox-stat span { display: block; color: #80766c; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .waInbox-stat strong { display: block; margin-top: 4px; font-size: 24px; }
        .waInbox-stat--alert strong { color: #a05c00; }
        .waInbox-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; align-items: start; }
        .waInbox-panel { padding: 18px; border-radius: 18px; background: #fff; border: 1px solid var(--sm-dashboard-line); box-shadow: 0 14px 34px rgba(53,41,27,.06); }
        .waInbox-panel h2 { margin: 0 0 14px; font-size: 18px; }
        .waInbox-form { display: grid; gap: 10px; }
        .waInbox-input, .waInbox-select, .waInbox-textarea { width: 100%; border: 1px solid var(--sm-dashboard-line); border-radius: 12px; background: #fcfaf7; color: #261f18; font: inherit; box-sizing: border-box; }
        .waInbox-input, .waInbox-select { min-height: 42px; padding: 0 12px; }
        .waInbox-textarea { min-height: 86px; padding: 10px 12px; resize: vertical; }
        .waInbox-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        /* Motivos rápidos */
        .waInbox-quickLabel { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #80766c; margin-bottom: 6px; }
        .waInbox-quickBtns { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 2px; }
        .waInbox-quickBtn { padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(96,96,96,.24); background: #f2f2f0; color: var(--sm-navy); font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s; white-space: nowrap; }
        .waInbox-quickBtn:hover { background: var(--sm-navy); color: var(--sm-dashboard-soft); }

        /* Toolbar */
        .waInbox-toolbar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .waInbox-toolbarRow { display: flex; gap: 8px; align-items: center; }
        .waInbox-toolbarRow:first-child { flex-wrap: wrap; }
        .waInbox-toolbarRow .waInbox-input { flex: 1 1 160px; min-width: 0; }
        .waInbox-toolbarRow .waInbox-select { flex: 0 0 150px; min-width: 0; }
        .waInbox-viewToggle { display: flex; border: 1px solid rgba(96,96,96,.24); border-radius: 12px; overflow: hidden; margin-left: auto; }
        .waInbox-viewBtn { min-height: 36px; padding: 0 14px; border: none; background: transparent; color: #5c5247; font-weight: 800; font-size: 13px; cursor: pointer; transition: background .15s, color .15s; white-space: nowrap; }
        .waInbox-viewBtn--active { background: var(--sm-navy); color: var(--sm-dashboard-soft); }
        .waInbox-filterInactive { min-height: 36px; padding: 0 14px; border-radius: 12px; border: 1px solid rgba(96,96,96,.24); background: #fff; color: #5c5247; font-weight: 800; font-size: 13px; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
        .waInbox-filterInactive--active { background: #fff7e6; color: #a05c00; border-color: #e8c07a; }

        /* Lista */
        .waInbox-actions { display: flex; gap: 8px; }
        .waInbox-btn { min-height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--sm-dashboard-line); background: #fff; color: #2e261f; font-weight: 800; cursor: pointer; }
        .waInbox-btn--primary { background: var(--sm-navy); color: var(--sm-dashboard-soft); border-color: var(--sm-navy); }
        .waInbox-btn--danger { background: #fff4f4; color: #953333; border-color: #f1c5c5; }
        .waInbox-list { display: grid; gap: 10px; max-height: calc(100dvh - 300px); overflow: auto; padding-right: 4px; }
        .waInbox-card { display: grid; gap: 10px; padding: 14px; border-radius: 16px; border: 1px solid var(--sm-dashboard-line); background: #fffdf9; }
        .waInbox-card--inactive { border-color: #e8a800; background: #fffcf0; box-shadow: 0 0 0 1px #e8a800; }
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

        /* Badge inactividad */
        .waInbox-inactiveBadge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; background: #fff3cd; color: #a05c00; font-size: 11px; font-weight: 900; border: 1px solid #e8c07a; }

        /* Kanban */
        .waInbox-kanban { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px; align-items: start; }
        .waInbox-kCol { flex: 0 0 260px; border-radius: 16px; background: #f5f0e8; border: 1px solid var(--sm-dashboard-line); display: flex; flex-direction: column; gap: 0; overflow: hidden; }
        .waInbox-kColHead { padding: 12px 14px 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--sm-dashboard-line); }
        .waInbox-kColTitle { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; color: var(--sm-navy); }
        .waInbox-kColCount { font-size: 12px; font-weight: 900; background: rgba(73,58,38,.12); color: var(--sm-navy); padding: 2px 8px; border-radius: 999px; }
        .waInbox-kCards { display: flex; flex-direction: column; gap: 10px; padding: 12px; min-height: 80px; }
        .waInbox-kCard { padding: 12px; border-radius: 14px; background: #fff; border: 1px solid var(--sm-dashboard-line); display: grid; gap: 8px; cursor: pointer; transition: box-shadow .15s; }
        .waInbox-kCard:hover { box-shadow: 0 4px 14px rgba(53,41,27,.1); }
        .waInbox-kCard--inactive { border-color: #e8a800; background: #fffcf0; box-shadow: 0 0 0 1px #e8a800; }
        .waInbox-kName { font-weight: 900; font-size: 14px; }
        .waInbox-kNeed { font-size: 13px; color: #5f554b; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .waInbox-kMeta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .waInbox-kActions { display: flex; gap: 6px; }
        .waInbox-kBtn { font-size: 12px; min-height: 32px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--sm-dashboard-line); background: #fff; color: #2e261f; font-weight: 800; cursor: pointer; }
        .waInbox-kBtn--wa { background: var(--sm-navy); color: var(--sm-dashboard-soft); border-color: var(--sm-navy); }

        @media (max-width: 980px) {
          .waInbox-layout { grid-template-columns: 1fr; }
          .waInbox-hero { align-items: stretch; flex-direction: column; }
          .waInbox-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .waInbox-toolbarRow { flex-wrap: wrap; }
          .waInbox-toolbarRow .waInbox-select { flex: 1 1 120px; }
          .waInbox-list { max-height: none; overflow: visible; }
          .waInbox-kanban { flex-direction: column; }
          .waInbox-kCol { flex: 0 0 auto; }
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
          <div className={`waInbox-stat${stats.inactive > 0 ? " waInbox-stat--alert" : ""}`}>
            <span>Sin actividad +24h</span><strong>{stats.inactive}</strong>
          </div>
          <div className="waInbox-stat"><span>Total</span><strong>{stats.total}</strong></div>
        </div>
      </section>

      <div className="waInbox-layout">
        {/* ── Panel de carga ── */}
        <section className="waInbox-panel">
          <h2>{editingId ? "Editar registro" : "Agregar chat"}</h2>
          <form className="waInbox-form" onSubmit={submit}>
            <input className="waInbox-input" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} placeholder="Nombre o referencia" />
            <input className="waInbox-input" value={form.phone} onChange={(e) => patchForm({ phone: e.target.value })} placeholder="Telefono WhatsApp" />

            {/* Motivos rápidos */}
            <div>
              <div className="waInbox-quickLabel">Motivo rapido</div>
              <div className="waInbox-quickBtns">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className="waInbox-quickBtn"
                    onClick={() => patchForm({ need: reason })}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

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

        {/* ── Panel de lista / kanban ── */}
        <section className="waInbox-panel">
          <div className="waInbox-toolbar">
            <div className="waInbox-toolbarRow">
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
            <div className="waInbox-toolbarRow">
              {/* Toggle inactivos */}
              <button
                type="button"
                className={`waInbox-filterInactive${inactiveOnly ? " waInbox-filterInactive--active" : ""}`}
                onClick={() => setInactiveOnly((v) => !v)}
                title="Mostrar solo chats sin actividad en más de 24 horas"
              >
                {inactiveOnly ? "⚠ Solo +24h sin actividad" : "⚠ Mostrar inactivos +24h"}
              </button>
              {/* Toggle vista */}
              <div className="waInbox-viewToggle">
                <button type="button" className={`waInbox-viewBtn${viewMode === "lista" ? " waInbox-viewBtn--active" : ""}`} onClick={() => setViewMode("lista")}>Lista</button>
                <button type="button" className={`waInbox-viewBtn${viewMode === "kanban" ? " waInbox-viewBtn--active" : ""}`} onClick={() => setViewMode("kanban")}>Kanban</button>
              </div>
            </div>
          </div>

          {/* ── Vista Lista ── */}
          {viewMode === "lista" && (
            <div className="waInbox-list">
              {filtered.length === 0 ? (
                <div className="waInbox-empty">No hay chats con esos filtros.</div>
              ) : (
                filtered.map((item) => {
                  const inactive = isInactive(item);
                  return (
                    <article className={`waInbox-card${inactive ? " waInbox-card--inactive" : ""}`} key={item.id}>
                      <div className="waInbox-cardHead">
                        <div>
                          <div className="waInbox-name">{item.name || "Sin nombre"}</div>
                          <div className="waInbox-phone">{item.phone || "Sin telefono"}</div>
                        </div>
                        <div className="waInbox-meta">
                          {inactive && <span className="waInbox-inactiveBadge">⚠ +24h sin actividad</span>}
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
                  );
                })
              )}
            </div>
          )}

          {/* ── Vista Kanban ── */}
          {viewMode === "kanban" && (
            <div className="waInbox-kanban">
              {KANBAN_COLS.map((col) => {
                const colItems = filtered.filter((item) => item.status === col.value);
                return (
                  <div className="waInbox-kCol" key={col.value}>
                    <div className="waInbox-kColHead">
                      <span className="waInbox-kColTitle">{col.label}</span>
                      <span className="waInbox-kColCount">{colItems.length}</span>
                    </div>
                    <div className="waInbox-kCards">
                      {colItems.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#a09488", textAlign: "center", padding: "12px 0" }}>Sin chats</div>
                      ) : (
                        colItems.map((item) => {
                          const inactive = isInactive(item);
                          return (
                            <div
                              className={`waInbox-kCard${inactive ? " waInbox-kCard--inactive" : ""}`}
                              key={item.id}
                              onClick={() => editItem(item)}
                              title="Click para editar"
                            >
                              <div className="waInbox-kName">{item.name || "Sin nombre"}</div>
                              <div className="waInbox-kNeed">{item.need || "Sin detalle."}</div>
                              <div className="waInbox-kMeta">
                                <span className={priorityClass(item.priority)} style={{ fontSize: 11, minHeight: 22 }}>{priorityLabel(item.priority)}</span>
                                {inactive && <span className="waInbox-inactiveBadge">⚠ +24h</span>}
                              </div>
                              {waLink(item.phone) ? (
                                <div className="waInbox-kActions" onClick={(e) => e.stopPropagation()}>
                                  <a className="waInbox-kBtn waInbox-kBtn--wa" href={waLink(item.phone)} target="_blank" rel="noreferrer">Abrir WA</a>
                                  <button className="waInbox-kBtn" type="button" onClick={() => updateItem(item.id, { status: "resuelto" })}>Resolver</button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
