import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  createVentaMensual,
  createVentasTransferencia,
  deleteVentaMensual,
  deleteVentasTransferencia,
  getVentasMensuales,
  getVentasTransferencias,
  getVentasConfiguracion,
  updateVentaMensual,
  updateVentasConfiguracion,
  updateVentasObjetivos,
  updateVentasTransferencia,
} from "../services/ventasMensuales";

const CATEGORY_OPTIONS = [
  "PRODUCTOS A MEDIDA",
  "CORTES A MEDIDA",
  "PORTARRETRATOS",
  "MUEBLES ESTANDAR",
  "MOLDURAS",
  "OTROS",
];

const SUBCATEGORY_OPTIONS = ["", "CORTES RECTOS", "CORTES LASER", "CORTE ESPECIAL", "MARCOS", "MELAMINA"];

const PAYMENT_OPTIONS = [
  { value: "pagado", label: "Pagado" },
  { value: "senado", label: "Senado" },
  { value: "pendiente", label: "Pendiente" },
];

const SALE_TYPE_OPTIONS = [
  { value: "normal", label: "Normal 10%" },
  { value: "especial", label: "Cliente especial 5%" },
];

const SPECIAL_CLIENTS = ["ELVIA ROSSI", "MANOLO"];

const INITIAL_FORM = {
  id: "",
  date: new Date().toISOString().slice(0, 10),
  client: "CLIENTE FINAL",
  contact: "",
  category: "PRODUCTOS A MEDIDA",
  subcategory: "",
  description: "",
  total: "",
  commission: "",
  saleType: "normal",
  paymentStatus: "pagado",
};

const INITIAL_TRANSFER_FORM = {
  id: "",
  date: new Date().toISOString().slice(0, 10),
  number: "",
  origin: "",
  destination: "",
  detail: "",
  amount: "",
  status: "recibida",
};

const TABS = [
  { to: "/ventas/lista", label: "Ventas del mes", section: "lista" },
  { to: "/ventas/nueva", label: "Nueva venta", section: "nueva" },
  { to: "/ventas/objetivos", label: "Objetivos y configuracion", section: "objetivos" },
  { to: "/ventas/transferencias", label: "Transferencias", section: "transferencias" },
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatMoneyInput(value) {
  const amount = typeof value === "number" ? value : parseAmount(value);
  if (!amount) return "";
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return `$${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount)}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

function formatSheetDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" })
    .format(new Date(value))
    .replace(".", "");
}

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function isSameInputDate(value, inputDate) {
  return toInputDate(value) === inputDate;
}

function parseAmount(value) {
  return Number(String(value || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

function getCommissionRate(saleType) {
  return saleType === "especial" ? 0.05 : 0.1;
}

function calculateCommission(total, saleType) {
  return formatMoneyInput(Math.round(parseAmount(total) * getCommissionRate(saleType) * 100) / 100);
}

function inferSaleType(client) {
  return SPECIAL_CLIENTS.includes(String(client || "").trim().toUpperCase()) ? "especial" : "normal";
}

function getBusinessDaysLeft(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  const today = new Date();
  const end = new Date(year, monthIndex, 0);
  const start = today.toISOString().slice(0, 7) === month ? today : new Date(year, monthIndex - 1, 1);
  let count = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) count += 1;
  }

  return Math.max(1, count);
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekKey(dateValue, month) {
  const date = new Date(dateValue);
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  const monthStart = new Date(`${month}-01T12:00:00`);
  if (monday < monthStart) return toLocalDateKey(monthStart);
  return toLocalDateKey(monday);
}

function getWeeklyTotals(items, month) {
  const map = new Map();
  items.forEach((item) => {
    const key = getWeekKey(item.date, month);
    const current = map.get(key) || { key, total: 0, commission: 0, count: 0 };
    current.total += item.total || 0;
    current.commission += item.commission || 0;
    current.count += 1;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export default function VentasMensuales({ section = "lista" }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transferTotal, setTransferTotal] = useState(0);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [goal, setGoal] = useState({ salesGoal: "", commissionGoal: "" });
  const [config, setConfig] = useState({
    categories: CATEGORY_OPTIONS,
    subcategories: SUBCATEGORY_OPTIONS.filter(Boolean),
    clients: ["CLIENTE FINAL"],
  });
  const [configForm, setConfigForm] = useState({
    categories: CATEGORY_OPTIONS.join("\n"),
    subcategories: SUBCATEGORY_OPTIONS.filter(Boolean).join("\n"),
    clients: "CLIENTE FINAL",
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [transferForm, setTransferForm] = useState(INITIAL_TRANSFER_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const weeklyTotals = useMemo(() => getWeeklyTotals(items, month), [items, month]);
  const dailyTransfers = useMemo(
    () => transfers.filter((item) => isSameInputDate(item.date, transferDate)),
    [transfers, transferDate]
  );
  const dailyTransferTotal = useMemo(
    () => dailyTransfers.reduce((sum, item) => sum + (item.amount || 0), 0),
    [dailyTransfers]
  );
  const dailyGoal = (summary?.salesRemaining || 0) / getBusinessDaysLeft(month);

  const loadMonth = useCallback(async () => {
    try {
      setIsLoading(true);
      const [salesData, transferData] = await Promise.all([getVentasMensuales(month), getVentasTransferencias(month)]);
      setItems(salesData.items || []);
      setSummary(salesData.summary || null);
      setGoal({
        salesGoal: String(salesData.goal?.salesGoal || ""),
        commissionGoal: String(salesData.goal?.commissionGoal || ""),
      });
      setTransfers(transferData.items || []);
      setTransferTotal(transferData.total || 0);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los datos de ventas");
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  const loadSettings = useCallback(async () => {
    try {
      const configData = await getVentasConfiguracion();
      const nextConfig = {
        categories: configData.categories?.length ? configData.categories : CATEGORY_OPTIONS,
        subcategories: configData.subcategories?.length ? configData.subcategories : SUBCATEGORY_OPTIONS.filter(Boolean),
        clients: configData.clients?.length ? configData.clients : ["CLIENTE FINAL"],
      };
      setConfig(nextConfig);
      setConfigForm({
        categories: nextConfig.categories.join("\n"),
        subcategories: nextConfig.subcategories.join("\n"),
        clients: nextConfig.clients.join("\n"),
      });
    } catch (settingsError) {
      setError(settingsError.message || "No se pudieron cargar las configuraciones");
    }
  }, []);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (transferDate.slice(0, 7) !== month) {
      setTransferDate(`${month}-01`);
      setTransferForm((current) => ({ ...current, date: `${month}-01` }));
    }
  }, [month, transferDate]);

  function showMessage(message) {
    setSuccess(message);
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if ((name === "total" || name === "saleType") && !current.id) {
        next.commission = calculateCommission(next.total, next.saleType);
      }
      return next;
    });
  }

  function handleTransferChange(event) {
    const { name, value } = event.target;
    setTransferForm((current) => ({ ...current, [name]: value }));
  }

  function handleTransferDateChange(event) {
    const { value } = event.target;
    setTransferDate(value);
    setTransferForm((current) => ({ ...current, date: value || current.date }));
  }

  function handleClientPick(event) {
    const client = event.target.value;
    setForm((current) => {
      if (current.id) return { ...current, client };

      const inferred = inferSaleType(client);
      // Solo forzar "especial" si el cliente es especial; no resetear si el usuario eligió "especial" manualmente
      const saleType = inferred === "especial" ? "especial" : current.saleType;
      return {
        ...current,
        client,
        saleType,
        commission: calculateCommission(current.total, saleType),
      };
    });
  }

  function handleMoneyBlur(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: formatMoneyInput(value) };
      if (name === "total" && !current.id) {
        next.commission = calculateCommission(next.total, next.saleType);
      }
      return next;
    });
  }

  function editItem(item) {
    setForm({
      id: item._id,
      date: toInputDate(item.date),
      client: item.client || "",
      contact: item.contact || "",
      category: item.category || config.categories[0] || CATEGORY_OPTIONS[0],
      subcategory: item.subcategory || "",
      description: item.description || "",
      total: formatMoneyInput(item.total),
      commission: formatMoneyInput(item.commission),
      saleType: item.saleType || "normal",
      paymentStatus: item.paymentStatus || "pendiente",
    });
    setSuccess("");
    setError("");
    navigate("/ventas/nueva");
  }

  function editTransfer(item) {
    setTransferForm({
      id: item._id,
      date: toInputDate(item.date),
      number: item.number || item.client || "",
      origin: item.origin || item.contact || "",
      destination: item.destination || item.reference || "",
      detail: item.detail || item.notes || "",
      amount: String(item.amount || ""),
      status: item.status || "recibida",
    });
    setSuccess("");
    setError("");
  }

  function resetForm() {
    setForm((current) => ({
      ...INITIAL_FORM,
      date: current.date || INITIAL_FORM.date,
    }));
  }

  function resetTransferForm() {
    setTransferForm((current) => ({
      ...INITIAL_TRANSFER_FORM,
      date: transferDate || current.date || INITIAL_TRANSFER_FORM.date,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setIsSaving(true);
      if (form.id) {
        await updateVentaMensual(form.id, form);
        showMessage("Venta actualizada");
      } else {
        await createVentaMensual(form);
        showMessage("Venta cargada");
      }
      resetForm();
      await loadMonth();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la venta");
      setSuccess("");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTransferSubmit(event) {
    event.preventDefault();
    try {
      setIsSaving(true);
      if (transferForm.id) {
        await updateVentasTransferencia(transferForm.id, transferForm);
        showMessage("Transferencia actualizada");
      } else {
        await createVentasTransferencia(transferForm);
        showMessage("Transferencia cargada");
      }
      resetTransferForm();
      await loadMonth();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la transferencia");
      setSuccess("");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Eliminar esta venta?")) return;
    try {
      await deleteVentaMensual(id);
      await loadMonth();
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la venta");
    }
  }

  async function handleTransferDelete(id) {
    if (!window.confirm("Eliminar esta transferencia?")) return;
    try {
      await deleteVentasTransferencia(id);
      await loadMonth();
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la transferencia");
    }
  }

  async function handleGoalSubmit(event) {
    event.preventDefault();
    try {
      await updateVentasObjetivos(month, goal);
      showMessage("Objetivos guardados");
      await loadMonth();
    } catch (goalError) {
      setError(goalError.message || "No se pudieron guardar los objetivos");
      setSuccess("");
    }
  }

  async function handleConfigSubmit(event) {
    event.preventDefault();
    try {
      const data = await updateVentasConfiguracion(configForm);
      const nextConfig = {
        categories: data.config?.categories?.length ? data.config.categories : CATEGORY_OPTIONS,
        subcategories: data.config?.subcategories?.length ? data.config.subcategories : SUBCATEGORY_OPTIONS.filter(Boolean),
        clients: data.config?.clients?.length ? data.config.clients : ["CLIENTE FINAL"],
      };
      setConfig(nextConfig);
      setConfigForm({
        categories: nextConfig.categories.join("\n"),
        subcategories: nextConfig.subcategories.join("\n"),
        clients: nextConfig.clients.join("\n"),
      });
      showMessage("Configuracion guardada");
    } catch (configError) {
      setError(configError.message || "No se pudo guardar la configuracion");
      setSuccess("");
    }
  }

  function renderStats() {
    const stats = [
      { label: "Objetivo mensual", value: summary?.salesGoal },
      { label: "Actual", value: summary?.salesTotal, tone: "strong" },
      { label: "Faltante", value: summary?.salesRemaining },
      { label: "Objetivo diario", value: dailyGoal },
      { label: "Comision mensual", value: summary?.commissionTotal, tone: "accent" },
      { label: "Transferencias", value: transferTotal },
    ];

    return (
      <div className="monthly-salesStats">
        {stats.map((stat) => (
          <article key={stat.label} className={stat.tone ? `monthly-salesStat--${stat.tone}` : ""}>
            <span>{stat.label}</span>
            <strong>{formatMoney(stat.value)}</strong>
          </article>
        ))}
      </div>
    );
  }

  function renderSaleForm() {
    return (
      <form className="config-usersCard monthly-salesPanel" onSubmit={handleSubmit}>
        <div className="config-usersCardTitle">{form.id ? "Editar venta" : "Nueva venta"}</div>
        <label className="config-usersField"><span>Fecha</span><input type="date" name="date" value={form.date} onChange={handleChange} required /></label>
        <label className="config-usersField"><span>Cliente</span><input name="client" list="ventas-clientes" value={form.client} onChange={handleClientPick} required /></label>
        <datalist id="ventas-clientes">
          {config.clients.map((client) => <option key={client} value={client} />)}
        </datalist>
        <label className="config-usersField"><span>Contacto</span><input name="contact" value={form.contact} onChange={handleChange} /></label>
        <label className="config-usersField"><span>Categoria</span><select name="category" value={form.category} onChange={handleChange}>{config.categories.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="config-usersField"><span>Subcategoria</span><select name="subcategory" value={form.subcategory} onChange={handleChange}><option value="">Sin subcategoria</option>{config.subcategories.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="config-usersField"><span>Descripcion</span><textarea name="description" value={form.description} onChange={handleChange} rows="3" /></label>
        <label className="config-usersField"><span>Tipo de venta</span><select name="saleType" value={form.saleType} onChange={handleChange}>{SALE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="config-usersField"><span>Total</span><input name="total" value={form.total} onChange={handleChange} onBlur={handleMoneyBlur} inputMode="decimal" placeholder="$50.000" required /></label>
        <label className="config-usersField"><span>Comision</span><input name="commission" value={form.commission} readOnly inputMode="decimal" placeholder="$5.000" /></label>
        <label className="config-usersField"><span>Pago</span><select name="paymentStatus" value={form.paymentStatus} onChange={handleChange}>{PAYMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button className="config-usersSubmit" disabled={isSaving}>{isSaving ? "Guardando..." : form.id ? "Guardar cambios" : "Cargar venta"}</button>
        {form.id ? <button className="config-usersSecondaryButton monthly-salesCancel" type="button" onClick={resetForm}>Cancelar edicion</button> : null}
      </form>
    );
  }

  function renderSalesTable() {
    return (
      <div className="config-usersCard monthly-salesTableCard">
        <div className="config-usersCardTitle">Ventas cargadas</div>
        {isLoading ? <div className="config-usersEmpty">Cargando ventas...</div> : null}
        {!isLoading && items.length === 0 ? <div className="config-usersEmpty">Todavia no hay ventas para este mes.</div> : null}
        {!isLoading && items.length > 0 ? (
          <div className="survey-tableWrap">
            <table className="survey-table monthly-salesTable">
              <thead>
                <tr>
                  <th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Contacto</th><th>Categoria</th><th>Subcategoria</th><th>Descripcion</th><th>Total</th><th>Comision</th><th>Pago</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.client}</td>
                    <td>
                      <span className={`monthly-salesType ${item.saleType === "especial" ? "especial" : "normal"}`}>
                        {item.saleType === "especial" ? "5%" : "10%"}
                      </span>
                    </td>
                    <td>{item.contact}</td>
                    <td>{item.category}</td>
                    <td>{item.subcategory}</td>
                    <td>{item.description}</td>
                    <td>{formatMoney(item.total)}</td>
                    <td>{formatMoney(item.commission)}</td>
                    <td><span className={`monthly-salesStatus ${item.paymentStatus}`}>{PAYMENT_OPTIONS.find((option) => option.value === item.paymentStatus)?.label}</span></td>
                    <td className="monthly-salesActions">
                      <button type="button" onClick={() => editItem(item)}>Editar</button>
                      <button type="button" onClick={() => handleDelete(item._id)}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  function renderWeeks() {
    return (
      <div className="config-usersCard">
        <div className="config-usersCardTitle">Semanas</div>
        <div className="monthly-salesWeeks">
          {weeklyTotals.length === 0 ? <div className="config-usersEmpty">Sin ventas cargadas.</div> : null}
          {weeklyTotals.map((week) => (
            <article key={week.key}>
              <span>Semana del {formatDate(week.key)}</span>
              <strong>{formatMoney(week.total)}</strong>
              <small>{week.count} ventas - comision {formatMoney(week.commission)}</small>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderObjectives() {
    return (
      <div className="monthly-salesTwoCol">
        <form className="config-usersCard" onSubmit={handleGoalSubmit}>
          <div className="config-usersCardTitle">Objetivos del mes</div>
          <label className="config-usersField"><span>Objetivo mensual</span><input value={goal.salesGoal} onChange={(event) => setGoal((current) => ({ ...current, salesGoal: event.target.value }))} inputMode="decimal" /></label>
          <label className="config-usersField"><span>Objetivo comision</span><input value={goal.commissionGoal} onChange={(event) => setGoal((current) => ({ ...current, commissionGoal: event.target.value }))} inputMode="decimal" /></label>
          <button className="config-usersSubmit">Guardar objetivos</button>
        </form>
        <form className="config-usersCard" onSubmit={handleConfigSubmit}>
          <div className="config-usersCardTitle">Configuraciones</div>
          <label className="config-usersField">
            <span>Categorias</span>
            <textarea value={configForm.categories} onChange={(event) => setConfigForm((current) => ({ ...current, categories: event.target.value }))} rows="7" />
          </label>
          <label className="config-usersField">
            <span>Subcategorias</span>
            <textarea value={configForm.subcategories} onChange={(event) => setConfigForm((current) => ({ ...current, subcategories: event.target.value }))} rows="7" />
          </label>
          <label className="config-usersField">
            <span>Clientes</span>
            <textarea value={configForm.clients} onChange={(event) => setConfigForm((current) => ({ ...current, clients: event.target.value }))} rows="7" />
          </label>
          <button className="config-usersSubmit">Guardar configuracion</button>
        </form>
      </div>
    );
  }

  function renderTransfers() {
    return (
      <>
        <div className="monthly-salesGrid">
          <form className="config-usersCard monthly-salesNoPrint" onSubmit={handleTransferSubmit}>
            <div className="config-usersCardTitle">{transferForm.id ? "Editar transferencia" : "Nueva transferencia"}</div>
            <label className="config-usersField"><span>Fecha</span><input type="date" name="date" value={transferForm.date} onChange={handleTransferChange} required /></label>
            <label className="config-usersField"><span>Numero</span><input name="number" value={transferForm.number} onChange={handleTransferChange} required /></label>
            <label className="config-usersField"><span>Origen</span><input name="origin" value={transferForm.origin} onChange={handleTransferChange} required /></label>
            <label className="config-usersField"><span>Destino</span><input name="destination" value={transferForm.destination} onChange={handleTransferChange} required /></label>
            <label className="config-usersField"><span>Detalle</span><input name="detail" value={transferForm.detail} onChange={handleTransferChange} /></label>
            <label className="config-usersField"><span>Monto</span><input name="amount" value={transferForm.amount} onChange={handleTransferChange} inputMode="decimal" required /></label>
            <button className="config-usersSubmit" disabled={isSaving}>{isSaving ? "Guardando..." : transferForm.id ? "Guardar cambios" : "Cargar transferencia"}</button>
            {transferForm.id ? <button className="config-usersSecondaryButton monthly-salesCancel" type="button" onClick={resetTransferForm}>Cancelar edicion</button> : null}
          </form>

          <div className="config-usersCard monthly-salesTableCard monthly-salesPrintArea">
            <div className="monthly-salesTransferHead">
              <div>
                <div className="config-usersCardTitle">Control diario de transferencias</div>
                <div className="monthly-salesTransferTotal">
                  {formatSheetDate(`${transferDate}T12:00:00.000Z`)} - Total: {formatMoney(dailyTransferTotal)}
                </div>
              </div>
              <div className="monthly-salesTransferControls monthly-salesNoPrint">
                <label className="config-usersField monthly-salesTransferDate">
                  <span>Dia a imprimir</span>
                  <input type="date" value={transferDate} onChange={handleTransferDateChange} />
                </label>
                <button className="config-usersSecondaryButton" type="button" onClick={() => window.print()}>
                  Imprimir control diario
                </button>
              </div>
            </div>
            {isLoading ? <div className="config-usersEmpty">Cargando transferencias...</div> : null}
            {!isLoading && dailyTransfers.length === 0 ? <div className="config-usersEmpty">Todavia no hay transferencias para este dia.</div> : null}
            {!isLoading && dailyTransfers.length > 0 ? (
              <div className="survey-tableWrap">
                <table className="survey-table monthly-salesTransferSheet">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Numero</th><th>Origen</th><th>Destino</th><th>Detalle</th><th>Monto</th><th className="monthly-salesNoPrint"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTransfers.map((item) => (
                      <tr key={item._id}>
                        <td>{formatSheetDate(item.date)}</td>
                        <td>{item.number || item.client}</td>
                        <td>{item.origin || item.contact}</td>
                        <td>{item.destination || item.reference}</td>
                        <td>{item.detail || item.notes}</td>
                        <td>{formatMoney(item.amount)}</td>
                        <td className="monthly-salesActions monthly-salesNoPrint">
                          <button type="button" onClick={() => editTransfer(item)}>Editar</button>
                          <button type="button" onClick={() => handleTransferDelete(item._id)}>Borrar</button>
                        </td>
                      </tr>
                    ))}
                    <tr className="monthly-salesTransferTotalRow">
                      <td colSpan="5">Total</td>
                      <td>{formatMoney(dailyTransferTotal)}</td>
                      <td className="monthly-salesNoPrint"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        <div className="config-usersCard monthly-salesTableCard monthly-salesNoPrint">
          <div className="monthly-salesTransferHead">
            <div>
              <div className="config-usersCardTitle">Transferencias del mes</div>
              <div className="monthly-salesTransferTotal">
                {transfers.length} transferencias - Total: {formatMoney(transferTotal)}
              </div>
            </div>
          </div>
          {isLoading ? <div className="config-usersEmpty">Cargando transferencias...</div> : null}
          {!isLoading && transfers.length === 0 ? <div className="config-usersEmpty">Todavia no hay transferencias para este mes.</div> : null}
          {!isLoading && transfers.length > 0 ? (
            <div className="survey-tableWrap">
              <table className="survey-table monthly-salesTransfersList">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Numero</th><th>Origen</th><th>Destino</th><th>Detalle</th><th>Monto</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((item) => (
                    <tr key={item._id}>
                      <td>{formatSheetDate(item.date)}</td>
                      <td>{item.number || item.client}</td>
                      <td>{item.origin || item.contact}</td>
                      <td>{item.destination || item.reference}</td>
                      <td>{item.detail || item.notes}</td>
                      <td>{formatMoney(item.amount)}</td>
                      <td><span className={`monthly-salesStatus ${item.status || "recibida"}`}>{item.status || "recibida"}</span></td>
                      <td className="monthly-salesActions">
                        <button type="button" onClick={() => editTransfer(item)}>Editar</button>
                        <button type="button" onClick={() => handleTransferDelete(item._id)}>Borrar</button>
                      </td>
                    </tr>
                  ))}
                  <tr className="monthly-salesTransferTotalRow">
                    <td colSpan="5">Total</td>
                    <td>{formatMoney(transferTotal)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <section className="monthly-sales">
      <div className="config-usersHero monthly-salesHero">
        <div>
          <div className="dashboard-kicker">Modulo</div>
          <h1 className="dashboard-title">Ventas</h1>
        </div>
        <p className="dashboard-copy">Ventas mensuales, comisiones, objetivos y transferencias.</p>
      </div>

      <div className="monthly-salesToolbar">
        <nav className="monthly-salesTabs" aria-label="Secciones de ventas">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `monthly-salesTab${isActive || section === tab.section ? " active" : ""}`}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <label className="config-usersField monthly-salesMonth">
          <span>Mes</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </div>

      {error ? <div className="config-usersMessage error">{error}</div> : null}
      {success ? <div className="config-usersMessage success">{success}</div> : null}

      {section === "lista" ? (
        <>
          {renderStats()}
          <div className="monthly-salesGrid monthly-salesGrid--list">
            {renderSalesTable()}
            {renderWeeks()}
          </div>
        </>
      ) : null}
      {section === "nueva" ? renderSaleForm() : null}
      {section === "objetivos" ? (
        <>
          {renderStats()}
          {renderObjectives()}
        </>
      ) : null}
      {section === "transferencias" ? renderTransfers() : null}
    </section>
  );
}
