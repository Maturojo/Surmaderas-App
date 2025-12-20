import { useEffect, useMemo, useState } from "react";

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

const STORAGE_KEY = "sm_calendar_events_v1";

function typeLabel(t) {
  if (t === "pedido") return "Pedido";
  if (t === "nota") return "Nota";
  return "Tarea";
}

export default function Calendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => ymd(new Date()));
  const [eventsByDay, setEventsByDay] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  });

  // Si ya tenías data guardada, la conserva. (No agrega nada nuevo.)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventsByDay));
  }, [eventsByDay]);

  const gridDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);

    const firstWeekday = start.getDay(); // domingo=0 ... sábado=6

    const cells = [];
    const firstCellDate = new Date(start);
    firstCellDate.setDate(start.getDate() - firstWeekday);

    for (let i = 0; i < 42; i++) {
      const d = new Date(firstCellDate);
      d.setDate(firstCellDate.getDate() + i);
      cells.push(d);
    }

    return { start, end, cells };
  }, [cursor]);

  const monthLabel = useMemo(() => {
    return cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  }, [cursor]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold capitalize">{monthLabel}</h2>
          <p className="text-sm opacity-70">Calendario (solo vista)</p>
        </div>

        <div className="flex gap-2">
          <button
            className="border rounded-lg px-3 py-2"
            onClick={() => setCursor(addMonths(cursor, -1))}
          >
            ←
          </button>
          <button className="border rounded-lg px-3 py-2" onClick={() => setCursor(new Date())}>
            Hoy
          </button>
          <button
            className="border rounded-lg px-3 py-2"
            onClick={() => setCursor(addMonths(cursor, 1))}
          >
            →
          </button>
        </div>
      </div>

      {/* SOLO CALENDARIO */}
      <div className="border rounded-xl p-4">
        <div className="grid grid-cols-7 text-sm font-semibold opacity-80 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((w) => (
            <div key={w} className="p-2">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {gridDays.cells.map((d) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSelected = key === selectedDay;
            const count = (eventsByDay[key] || []).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={[
                  "border rounded-lg p-2 text-left min-h-[74px]",
                  inMonth ? "" : "opacity-50",
                  isSelected ? "ring-2 ring-offset-2" : "",
                ].join(" ")}
                title={key}
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold">{d.getDate()}</div>
                  {count > 0 && (
                    <div className="text-xs border rounded-full px-2 py-[2px]">{count}</div>
                  )}
                </div>

                {/* mini preview (opcional) */}
                <div className="mt-2 space-y-1">
                  {(eventsByDay[key] || []).slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="text-[11px] truncate border rounded px-2 py-[2px]"
                    >
                      {typeLabel(e.type)}: {e.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
