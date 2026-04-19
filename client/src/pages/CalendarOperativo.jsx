import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  obtenerCalendario,
} from "../services/calendar";

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(date) {
  return ymd(date).slice(0, 7);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function addDays(date, n) {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

function buildMonthCells(cursor) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstWeekday = start.getDay();
  const firstCell = new Date(start);
  firstCell.setDate(start.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(firstCell);
    cell.setDate(firstCell.getDate() + index);
    return cell;
  });
}

function buildWeekCells(cursor) {
  const start = new Date(cursor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function formatRangeLabel(start, end) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.getDate()} al ${end.getDate()} de ${end.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    })}`;
  }

  return `${start.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  })} al ${end.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

function formatDayLabel(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function priorityLabel(value) {
  if (value === "alta") return "Alta";
  if (value === "baja") return "Baja";
  return "Media";
}

function summaryByType(items = []) {
  return items.reduce(
    (acc, item) => {
      if (item.type === "recordatorio") acc.recordatorios += 1;
      if (item.type === "nota-pedido") acc.notas += 1;
      return acc;
    },
    { recordatorios: 0, notas: 0 }
  );
}

const emptyForm = {
  titulo: "",
  descripcion: "",
  fecha: "",
  prioridad: "media",
};

export default function CalendarOperativo() {
  const today = ymd(new Date());
  const [cursor, setCursor] = useState(() => new Date());
  const [viewMode, setViewMode] = useState("month");
  const [selectedDay, setSelectedDay] = useState(today);
  const [calendarData, setCalendarData] = useState({ byDay: {}, eventos: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(() => ({ ...emptyForm, fecha: today }));
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [draggingReminderId, setDraggingReminderId] = useState("");
  const [dropTargetDay, setDropTargetDay] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setLoading(true);
      try {
        const data =
          viewMode === "week"
            ? await obtenerCalendario({
                desde: ymd(buildWeekCells(cursor)[0]),
                hasta: ymd(buildWeekCells(cursor)[6]),
              })
            : await obtenerCalendario({ month: monthKey(cursor) });
        if (cancelled) return;
        setCalendarData(data || { byDay: {}, eventos: [] });
        setError("");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "No se pudo cargar el calendario");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [cursor, viewMode]);

  const weekDays = useMemo(() => buildWeekCells(cursor), [cursor]);
  const gridDays = useMemo(
    () => (viewMode === "week" ? weekDays : buildMonthCells(cursor)),
    [cursor, viewMode, weekDays]
  );
  const monthLabel = useMemo(
    () => cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    [cursor]
  );
  const weekLabel = useMemo(() => formatRangeLabel(weekDays[0], weekDays[6]), [weekDays]);
  const currentLabel = viewMode === "week" ? weekLabel : monthLabel;
  const selectedItems = calendarData?.byDay?.[selectedDay] || [];
  const monthSummary = useMemo(() => summaryByType(calendarData?.eventos || []), [calendarData]);

  function openReminderModal(date = selectedDay, item = null) {
    if (item) {
      setEditingId(item._id);
      setForm({
        titulo: item.titulo || "",
        descripcion: item.descripcion || "",
        fecha: item.fecha || date,
        prioridad: item.prioridad || "media",
      });
    } else {
      setEditingId("");
      setForm({ ...emptyForm, fecha: date });
    }
    setReminderModalOpen(true);
  }

  function closeReminderModal() {
    setReminderModalOpen(false);
    setEditingId("");
    setForm({ ...emptyForm, fecha: selectedDay });
  }

  async function refreshCalendar(nextCursor = cursor, nextViewMode = viewMode) {
    const data =
      nextViewMode === "week"
        ? await obtenerCalendario({
            desde: ymd(buildWeekCells(nextCursor)[0]),
            hasta: ymd(buildWeekCells(nextCursor)[6]),
          })
        : await obtenerCalendario({ month: monthKey(nextCursor) });
    setCalendarData(data || { byDay: {}, eventos: [] });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    try {
      setSaving(true);

      if (!form.titulo.trim()) {
        throw new Error("Escribí un título para el recordatorio");
      }

      if (!form.fecha) {
        throw new Error("Elegí una fecha para el recordatorio");
      }

      const current = selectedItems.find((item) => item._id === editingId);
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
        prioridad: form.prioridad,
        completado: Boolean(current?.completado),
      };

      if (editingId) {
        await actualizarRecordatorio(editingId, payload);
      } else {
        await crearRecordatorio({ ...payload, completado: false });
      }

      const nextCursor = new Date(`${form.fecha}T00:00:00`);
      const shouldMoveCursor =
        viewMode === "week"
          ? !gridDays.some((day) => ymd(day) === form.fecha)
          : form.fecha.slice(0, 7) !== monthKey(cursor);

      if (shouldMoveCursor) {
        setCursor(nextCursor);
        await refreshCalendar(nextCursor);
      } else {
        await refreshCalendar();
      }

      setSelectedDay(form.fecha);
      setAgendaOpen(true);
      closeReminderModal();
      setError("");
    } catch (submitError) {
      setError(submitError.message || "No se pudo guardar el recordatorio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar recordatorio",
      text: `Se va a borrar "${item.titulo}".`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await eliminarRecordatorio(item._id);
      await refreshCalendar();
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo eliminar el recordatorio");
    }
  }

  async function handleToggleCompleted(item) {
    try {
      await actualizarRecordatorio(item._id, {
        titulo: item.titulo,
        descripcion: item.descripcion,
        fecha: item.fecha,
        prioridad: item.prioridad,
        completado: !item.completado,
      });
      await refreshCalendar();
    } catch (toggleError) {
      setError(toggleError.message || "No se pudo actualizar el recordatorio");
    }
  }

  async function moveReminderToDate(item, nextDate) {
    if (!item?._id || item.type !== "recordatorio" || !nextDate || item.fecha === nextDate) {
      return;
    }

    try {
      setSaving(true);
      await actualizarRecordatorio(item._id, {
        titulo: item.titulo,
        descripcion: item.descripcion,
        fecha: nextDate,
        prioridad: item.prioridad,
        completado: Boolean(item.completado),
      });

      const nextCursor = new Date(`${nextDate}T00:00:00`);
      const shouldMoveCursor =
        viewMode === "week"
          ? !gridDays.some((day) => ymd(day) === nextDate)
          : nextDate.slice(0, 7) !== monthKey(cursor);

      if (shouldMoveCursor) {
        setCursor(nextCursor);
        await refreshCalendar(nextCursor);
      } else {
        await refreshCalendar();
      }

      setSelectedDay(nextDate);
      setError("");
    } catch (moveError) {
      setError(moveError.message || "No se pudo mover el recordatorio");
    } finally {
      setSaving(false);
      setDraggingReminderId("");
      setDropTargetDay("");
    }
  }

  function moveCursor(step) {
    setCursor((prev) => (viewMode === "week" ? addDays(prev, step * 7) : addMonths(prev, step)));
  }

  return (
    <div className="calendar-shell">
      <section className="calendar-hero">
        <div>
          <div className="dashboard-kicker">Operacion diaria</div>
          <h1 className="dashboard-title">Calendario operativo</h1>
          <p className="dashboard-copy">
            Tocá cualquier día para abrir la agenda con el detalle completo de las notas y
            recordatorios. El botón de recordatorio ahora abre una ventana aparte.
          </p>
        </div>

        <div className="calendar-heroActions">
          <div className="calendar-heroStats">
            <div className="calendar-statCard">
              <span>{viewMode === "week" ? "Notas de la semana" : "Notas del mes"}</span>
              <strong>{monthSummary.notas}</strong>
            </div>
            <div className="calendar-statCard">
              <span>Recordatorios</span>
              <strong>{monthSummary.recordatorios}</strong>
            </div>
            <div className="calendar-statCard">
              <span>Hoy</span>
              <strong>{(calendarData?.byDay?.[today] || []).length}</strong>
            </div>
          </div>
          <button type="button" className="calendar-primaryBtn calendar-createBtn" onClick={() => openReminderModal(selectedDay)}>
            Crear recordatorio
          </button>
        </div>
      </section>

      <section className="calendar-board calendar-board--full">
        <div className="calendar-toolbar">
          <div>
            <h2 className="calendar-monthLabel">{currentLabel}</h2>
            <p className="calendar-muted">
              {viewMode === "week" ? "Vista semanal para seguir entregas y pendientes día por día" : "Vista mensual con agenda operativa real"}
            </p>
          </div>

          <div className="calendar-toolbarActions">
            <div className="calendar-viewSwitch" role="tablist" aria-label="Elegir vista del calendario">
              <button
                type="button"
                className={`calendar-viewBtn${viewMode === "month" ? " is-active" : ""}`}
                onClick={() => setViewMode("month")}
              >
                Mensual
              </button>
              <button
                type="button"
                className={`calendar-viewBtn${viewMode === "week" ? " is-active" : ""}`}
                onClick={() => setViewMode("week")}
              >
                Semanal
              </button>
            </div>
            <button type="button" className="calendar-ghostBtn" onClick={() => moveCursor(-1)}>
              ←
            </button>
            <button
              type="button"
              className="calendar-ghostBtn"
              onClick={() => {
                const now = new Date();
                setCursor(now);
                setSelectedDay(ymd(now));
              }}
            >
              Hoy
            </button>
            <button type="button" className="calendar-ghostBtn" onClick={() => moveCursor(1)}>
              →
            </button>
          </div>
        </div>

        {error ? <div className="calendar-error">{error}</div> : null}

        {viewMode === "month" ? (
          <div className="calendar-weekdays">
            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
        ) : null}

        <div className={`calendar-grid${viewMode === "week" ? " calendar-grid--week" : ""}`}>
          {gridDays.map((day) => {
            const key = ymd(day);
            const items = calendarData?.byDay?.[key] || [];
            const isSelected = key === selectedDay;
            const isCurrentMonth = day.getMonth() === cursor.getMonth();
            const isToday = key === today;

            return (
              <button
                key={key}
                type="button"
                className={`calendar-cell${isSelected ? " is-selected" : ""}${!isCurrentMonth ? " is-muted" : ""}${isToday ? " is-today" : ""}${dropTargetDay === key ? " is-dropTarget" : ""}`}
                onClick={() => {
                  setSelectedDay(key);
                  setAgendaOpen(true);
                }}
                onDragOver={(event) => {
                  if (!draggingReminderId) return;
                  event.preventDefault();
                  if (dropTargetDay !== key) {
                    setDropTargetDay(key);
                  }
                }}
                onDragLeave={() => {
                  if (dropTargetDay === key) {
                    setDropTargetDay("");
                  }
                }}
                onDrop={async (event) => {
                  if (!draggingReminderId) return;
                  event.preventDefault();
                  const reminderId = event.dataTransfer.getData("text/plain");
                  const reminder = (calendarData?.eventos || []).find(
                    (item) => item._id === reminderId && item.type === "recordatorio"
                  );
                  await moveReminderToDate(reminder, key);
                }}
              >
                <div className="calendar-cellTop">
                  <div className="calendar-cellDate">
                    {viewMode === "week" ? <span className="calendar-cellWeekday">{day.toLocaleDateString("es-AR", { weekday: "short" })}</span> : null}
                    <span className="calendar-cellDay">{day.getDate()}</span>
                  </div>
                  {items.length > 0 ? <span className="calendar-pill">{items.length}</span> : null}
                </div>

                <div className="calendar-cellList">
                  {items.slice(0, viewMode === "week" ? 5 : 3).map((item) => (
                    <span
                      key={item.id}
                      className={`calendar-miniEvent${item.type === "nota-pedido" ? " is-note" : ""}${item.completado ? " is-done" : ""}`}
                      draggable={item.type === "recordatorio"}
                      onDragStart={(event) => {
                        if (item.type !== "recordatorio") return;
                        event.dataTransfer.setData("text/plain", item._id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingReminderId(item._id);
                      }}
                      onDragEnd={() => {
                        setDraggingReminderId("");
                        setDropTargetDay("");
                      }}
                    >
                      {item.type === "nota-pedido" ? item.numero : item.titulo}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {agendaOpen ? (
        <div className="calendar-modalBackdrop" onClick={() => setAgendaOpen(false)}>
          <div className="calendar-modal" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-sectionHead">
              <div>
                <h3>Agenda del día</h3>
                <p>{formatDayLabel(selectedDay)}</p>
              </div>
              <div className="calendar-toolbarActions">
                <button type="button" className="calendar-ghostBtn" onClick={() => openReminderModal(selectedDay)}>
                  Crear recordatorio
                </button>
                <button type="button" className="calendar-ghostBtn" onClick={() => setAgendaOpen(false)}>
                  Cerrar
                </button>
              </div>
            </div>

            {loading ? <div className="calendar-empty">Cargando calendario...</div> : null}
            {!loading && selectedItems.length === 0 ? (
              <div className="calendar-empty">No hay tareas ni notas de pedido para esta fecha.</div>
            ) : null}

            <div className="calendar-eventList">
              {selectedItems.map((item) => (
                <article
                  key={item.id}
                  className={`calendar-eventCard${item.type === "nota-pedido" ? " is-note" : ""}${item.completado ? " is-done" : ""}`}
                >
                  <div className="calendar-eventTop">
                    <div>
                      <span className="calendar-eventType">
                        {item.type === "nota-pedido" ? "Nota de pedido" : `Recordatorio · ${priorityLabel(item.prioridad)}`}
                      </span>
                      <h4>{item.type === "nota-pedido" ? item.numero : item.titulo}</h4>
                    </div>
                    {item.type === "recordatorio" ? (
                      <button type="button" className="calendar-checkBtn" onClick={() => handleToggleCompleted(item)}>
                        {item.completado ? "Reabrir" : "Hecho"}
                      </button>
                    ) : null}
                  </div>

                  <p className="calendar-eventDescription">
                    {item.type === "nota-pedido"
                      ? `${item.cliente?.nombre || "Sin cliente"} · ${item.estadoOperativo || "Pendiente"}`
                      : item.descripcion || "Sin detalle adicional"}
                  </p>

                  {item.type === "nota-pedido" ? (
                    <div className="calendar-noteDetails">
                      <div className="calendar-noteMeta">
                        <span>Cliente: {item.cliente?.nombre || "Sin cliente"}</span>
                        <span>Teléfono: {item.cliente?.telefono || "Sin teléfono"}</span>
                      </div>
                      <div className="calendar-noteMeta">
                        <span>Vendedor: {item.vendedor || "Sin asignar"}</span>
                        <span>Estado: {item.estado || "pendiente"}</span>
                        <span>Operativo: {item.estadoOperativo || "Pendiente"}</span>
                      </div>
                      <div className="calendar-noteMeta">
                        <span>Entrega: {item.entrega || "Sin fecha"}</span>
                        <span>Total: ${Number(item.total || 0).toLocaleString("es-AR")}</span>
                      </div>
                      <div className="calendar-noteItems">
                        <strong>Detalle de compra</strong>
                        {Array.isArray(item.items) && item.items.length > 0 ? (
                          <ul className="calendar-noteItemsList">
                            {item.items.map((detalle, index) => (
                              <li key={`${item.id}-detalle-${index}`} className="calendar-noteItem">
                                <span className="calendar-noteItemInfo">
                                  <span>
                                    {Number(detalle?.cantidad || 0) > 0 ? `${detalle.cantidad} x ` : ""}
                                    {detalle?.descripcion || "Ítem sin descripción"}
                                  </span>
                                  {detalle?.imagen?.dataUrl || detalle?.data?.imagen?.dataUrl ? (
                                    <img
                                      className="calendar-noteItemImage"
                                      src={detalle?.imagen?.dataUrl || detalle?.data?.imagen?.dataUrl}
                                      alt={detalle?.descripcion || "Referencia del item"}
                                    />
                                  ) : null}
                                </span>
                                <span>
                                  ${Number(detalle?.precioUnit || 0).toLocaleString("es-AR")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="calendar-noteItemsEmpty">No hay detalle cargado en la nota.</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="calendar-reminderActions">
                      <button type="button" className="calendar-linkBtn" onClick={() => openReminderModal(item.fecha, item)}>
                        Editar
                      </button>
                      <button type="button" className="calendar-linkBtn" onClick={() => openReminderModal(item.fecha, item)}>
                        Mover
                      </button>
                      <button type="button" className="calendar-linkBtn danger" onClick={() => handleDelete(item)}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {reminderModalOpen ? (
        <div className="calendar-modalBackdrop" onClick={closeReminderModal}>
          <div className="calendar-modal calendar-modal--narrow" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-sectionHead">
              <div>
                <h3>{editingId ? "Editar recordatorio" : "Crear recordatorio"}</h3>
                <p>
                  {editingId
                    ? "Podés cambiar la fecha para moverlo a otro día."
                    : "Se guarda para todo el equipo en la fecha elegida."}
                </p>
              </div>
              <button type="button" className="calendar-ghostBtn" onClick={closeReminderModal}>
                Cerrar
              </button>
            </div>

            <form className="calendar-form" onSubmit={handleSubmit}>
              <label className="calendar-field">
                <span>Título</span>
                <input
                  value={form.titulo}
                  onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                  placeholder="Ej: llamar al cliente de cocina"
                />
              </label>

              <label className="calendar-field">
                <span>Fecha</span>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                />
              </label>

              <label className="calendar-field">
                <span>Prioridad</span>
                <select
                  value={form.prioridad}
                  onChange={(event) => setForm((prev) => ({ ...prev, prioridad: event.target.value }))}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </label>

              <label className="calendar-field">
                <span>Detalle</span>
                <textarea
                  rows="4"
                  value={form.descripcion}
                  onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                  placeholder="Información que querés ver ese día"
                />
              </label>

              <div className="calendar-formActions">
                <button type="button" className="calendar-ghostBtn" onClick={closeReminderModal}>
                  Cancelar
                </button>
                <button type="submit" className="calendar-primaryBtn" disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear recordatorio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
