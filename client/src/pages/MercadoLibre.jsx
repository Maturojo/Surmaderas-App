import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const LEGACY_PRODUCT_STORAGE_KEY = "surmaderas-mercado-libre-productos";
const PRODUCT_STORAGE_KEY = "surmaderas-mercado-libre-productos-reales";

const stats = [
  { label: "Ventas hoy", value: "0", detail: "$0" },
  { label: "Pedidos pendientes", value: "0", detail: "0 para preparar" },
  { label: "Preguntas", value: "0", detail: "0 sin responder" },
  { label: "Publicaciones activas", value: "0", detail: "0 con bajo stock" },
];

const alerts = [
  { title: "Preguntas sin responder", value: "0", tone: "warning" },
  { title: "Pedidos por preparar", value: "0", tone: "strong" },
  { title: "Publicaciones pausadas", value: "0", tone: "muted" },
  { title: "Reclamos abiertos", value: "0", tone: "danger" },
];

const defaultProducts = [];

const publications = [];

const orders = [];

const questions = [];

const profitability = [
  { label: "Precio publicado", value: "$0" },
  { label: "Costo estimado", value: "$0" },
  { label: "Comision ML", value: "$0" },
  { label: "Ganancia", value: "$0" },
];

const sections = [
  { to: "/mercado-libre", label: "Dashboard", end: true },
  { to: "/mercado-libre/productos", label: "Productos" },
  { to: "/mercado-libre/publicaciones", label: "Publicaciones" },
  { to: "/mercado-libre/pedidos", label: "Pedidos" },
  { to: "/mercado-libre/preguntas", label: "Preguntas" },
  { to: "/mercado-libre/pendientes", label: "Pendientes" },
  { to: "/mercado-libre/precios", label: "Precios" },
];

const initialForm = {
  name: "",
  category: "",
  cost: "",
  price: "",
  stock: "",
  mercadoEnvios: true,
  shippingCost: "",
  commissionPercent: "13",
  status: "Idea",
  notes: "",
};

function money(value) {
  const numeric = Number(String(value || "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function getMargin(product) {
  const result = getProductResult(product);
  if (!Number.isFinite(result.margin)) return "-";
  return `${Math.round(result.margin)}%`;
}

function getProductResult(product) {
  const cost = Number(product.cost) || 0;
  const price = Number(product.price) || 0;
  const commissionPercent = Number(product.commissionPercent) || 0;
  const commission = price > 0 ? price * (commissionPercent / 100) : 0;
  const shippingCost = product.mercadoEnvios ? Number(product.shippingCost) || 0 : 0;
  const totalCost = cost + commission + shippingCost;
  const profit = price - totalCost;
  const margin = price > 0 ? (profit / price) * 100 : Number.NaN;

  return { commission, shippingCost, totalCost, profit, margin };
}

function StatusBadge({ children }) {
  const normalized = String(children).toLowerCase();
  const tone = normalized.includes("stock") || normalized.includes("reclamo")
    ? "danger"
    : normalized.includes("preparar") || normalized.includes("facturar") || normalized.includes("idea")
      ? "warning"
      : "success";

  return <span className={`ml-status ml-status--${tone}`}>{children}</span>;
}

function MercadoLibreHero({ section }) {
  const title = section === "dashboard" ? "Mercado Libre" : `Mercado Libre - ${section}`;
  return (
    <div className="ml-hero">
      <div>
        <div className="dashboard-kicker">Negocio Online</div>
        <h1 className="dashboard-title">{title}</h1>
        <p className="dashboard-copy">
          Panel operativo para publicaciones, ventas, preguntas, stock y rentabilidad del canal.
        </p>
      </div>
      <div className="ml-heroActions">
        <NavLink to="/mercado-libre/productos" className="ml-primaryBtn">Agregar producto</NavLink>
        <NavLink to="/mercado-libre/publicaciones" className="ml-secondaryBtn">Ver publicaciones</NavLink>
      </div>
    </div>
  );
}

function MercadoLibreTabs() {
  return (
    <nav className="ml-tabs" aria-label="Secciones de Mercado Libre">
      {sections.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function DashboardView() {
  return (
    <>
      <StatsGrid />
      <div className="ml-mainGrid">
        <PendingPanel />
        <PricesPanel />
      </div>
      <PublicationsPanel compact />
      <div className="ml-mainGrid">
        <OrdersPanel compact />
        <QuestionsPanel compact />
      </div>
    </>
  );
}

function StatsGrid() {
  return (
    <div className="ml-statsGrid">
      {stats.map((item) => (
        <article className="ml-statCard" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </article>
      ))}
    </div>
  );
}

function PendingPanel() {
  return (
    <section className="ml-panel">
      <div className="ml-panelHead">
        <div>
          <h2>Panel de pendientes</h2>
          <p>Lo que necesita atencion antes de seguir vendiendo.</p>
        </div>
      </div>
      <div className="ml-alertGrid">
        {alerts.map((item) => (
          <article className={`ml-alertCard ml-alertCard--${item.tone}`} key={item.title}>
            <span>{item.title}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function PricesPanel() {
  return (
    <section className="ml-panel">
      <div className="ml-panelHead">
        <div>
          <h2>Comparador de precios</h2>
          <p>Referencia rapida para no vender sin margen.</p>
        </div>
      </div>
      <div className="ml-profitGrid">
        {profitability.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductsView() {
  const [products, setProducts] = useState(defaultProducts);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_PRODUCT_STORAGE_KEY);

    const stored = window.localStorage.getItem(PRODUCT_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setProducts(parsed);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const totals = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        acc.count += 1;
        acc.stock += Number(product.stock) || 0;
        if (String(product.status).toLowerCase().includes("publicar")) acc.ready += 1;
        return acc;
      },
      { count: 0, stock: 0, ready: 0 },
    );
  }, [products]);

  const preview = useMemo(() => getProductResult(form), [form]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addProduct(event) {
    event.preventDefault();
    const nextProduct = {
      ...form,
      id: `ml-product-${Date.now()}`,
      name: form.name.trim(),
      category: form.category.trim() || "Sin categoria",
      stock: form.stock || "0",
      shippingCost: form.mercadoEnvios ? form.shippingCost || "0" : "0",
      commissionPercent: form.commissionPercent || "0",
    };

    if (!nextProduct.name) return;

    setProducts((current) => [nextProduct, ...current]);
    setForm(initialForm);
  }

  function removeProduct(id) {
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  return (
    <>
      <div className="ml-statsGrid ml-statsGrid--three">
        <article className="ml-statCard">
          <span>Ideas cargadas</span>
          <strong>{totals.count}</strong>
          <small>Productos para evaluar</small>
        </article>
        <article className="ml-statCard">
          <span>Listos</span>
          <strong>{totals.ready}</strong>
          <small>Marcados para publicar</small>
        </article>
        <article className="ml-statCard">
          <span>Stock estimado</span>
          <strong>{totals.stock}</strong>
          <small>Unidades cargadas</small>
        </article>
      </div>

      <div className="ml-productLayout">
        <form className="ml-panel ml-productForm" onSubmit={addProduct}>
          <div className="ml-panelHead">
            <div>
              <h2>Agregar producto</h2>
              <p>Carga ideas de productos que pueden vender bien en Mercado Libre.</p>
            </div>
          </div>

          <label>
            <span>Producto</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ej: Bisagra cazoleta 35 mm" required />
          </label>

          <div className="ml-formGrid">
            <label>
              <span>Categoria</span>
              <input value={form.category} onChange={(event) => updateField("category", event.target.value)} placeholder="Herrajes" />
            </label>
            <label>
              <span>Estado</span>
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option>Idea</option>
                <option>Para publicar</option>
                <option>Revisar stock</option>
                <option>Publicado</option>
              </select>
            </label>
          </div>

          <div className="ml-formGrid">
            <label>
              <span>Costo estimado</span>
              <input value={form.cost} onChange={(event) => updateField("cost", event.target.value)} inputMode="numeric" placeholder="46900" />
            </label>
            <label>
              <span>Precio sugerido</span>
              <input value={form.price} onChange={(event) => updateField("price", event.target.value)} inputMode="numeric" placeholder="72400" />
            </label>
            <label>
              <span>Stock</span>
              <input value={form.stock} onChange={(event) => updateField("stock", event.target.value)} inputMode="numeric" placeholder="8" />
            </label>
          </div>

          <div className="ml-formGrid">
            <label>
              <span>Comision Mercado Libre (%)</span>
              <input value={form.commissionPercent} onChange={(event) => updateField("commissionPercent", event.target.value)} inputMode="decimal" placeholder="13" />
            </label>
            <label>
              <span>Costo Mercado Envios</span>
              <input
                value={form.shippingCost}
                onChange={(event) => updateField("shippingCost", event.target.value)}
                inputMode="numeric"
                placeholder="4200"
                disabled={!form.mercadoEnvios}
              />
            </label>
            <label className="ml-checkField">
              <input
                type="checkbox"
                checked={form.mercadoEnvios}
                onChange={(event) => updateField("mercadoEnvios", event.target.checked)}
              />
              <span>Va por Mercado Envios</span>
            </label>
          </div>

          <div className="ml-productPreview">
            <div>
              <span>Comision</span>
              <strong>{money(preview.commission)}</strong>
            </div>
            <div>
              <span>Envio</span>
              <strong>{money(preview.shippingCost)}</strong>
            </div>
            <div>
              <span>Costo total</span>
              <strong>{money(preview.totalCost)}</strong>
            </div>
            <div>
              <span>Ganancia</span>
              <strong>{money(preview.profit)}</strong>
            </div>
          </div>

          <label>
            <span>Notas</span>
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Por que puede vender bien, medidas, variantes, proveedor..." rows={4} />
          </label>

          <button type="submit" className="ml-primaryBtn">Agregar a productos</button>
        </form>

        <section className="ml-panel">
          <div className="ml-panelHead">
            <div>
              <h2>Lista de productos</h2>
              <p>Registro de productos agregados, con comision, envio y margen estimado.</p>
            </div>
          </div>
          <div className="ml-tableWrap">
            <table className="ml-table ml-productsTable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Costo</th>
                  <th>Precio</th>
                  <th>Comision</th>
                  <th>Envio</th>
                  <th>Ganancia</th>
                  <th>Margen</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const result = getProductResult(product);
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <span>{product.category}</span>
                        {product.notes ? <span>{product.notes}</span> : null}
                      </td>
                      <td>{money(product.cost)}</td>
                      <td>{money(product.price)}</td>
                      <td>{money(result.commission)}</td>
                      <td>{product.mercadoEnvios ? money(result.shippingCost) : "Sin Mercado Envios"}</td>
                      <td>{money(result.profit)}</td>
                      <td>{getMargin(product)}</td>
                      <td>{product.stock || 0}</td>
                      <td><StatusBadge>{product.status}</StatusBadge></td>
                      <td>
                        <button type="button" className="ml-secondaryBtn" onClick={() => removeProduct(product.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function PublicationsPanel({ compact = false }) {
  return (
    <section className="ml-panel">
      <div className="ml-panelHead">
        <div>
          <h2>Publicaciones</h2>
          <p>Precio, stock, estado, visitas, ventas y margen estimado.</p>
        </div>
        {compact ? <NavLink to="/mercado-libre/publicaciones" className="ml-secondaryBtn">Abrir pagina</NavLink> : null}
      </div>
      <div className="ml-tableWrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Visitas</th>
              <th>Ventas</th>
              <th>Margen</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {publications.map((item) => (
              <tr key={item.sku}>
                <td>
                  <strong>{item.title}</strong>
                  <span>{item.sku}</span>
                </td>
                <td>{item.price}</td>
                <td>{item.stock}</td>
                <td><StatusBadge>{item.status}</StatusBadge></td>
                <td>{item.visits}</td>
                <td>{item.sales}</td>
                <td>{item.margin}</td>
                <td>
                  <div className="ml-rowActions">
                    <button type="button">Editar</button>
                    <button type="button">Pausar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrdersPanel({ compact = false }) {
  return (
    <section className="ml-panel">
      <div className="ml-panelHead">
        <div>
          <h2>Pedidos</h2>
          <p>Ventas listas para transformar en pedido interno.</p>
        </div>
        {compact ? <NavLink to="/mercado-libre/pedidos" className="ml-secondaryBtn">Abrir pagina</NavLink> : null}
      </div>
      <div className="ml-cardList">
        {orders.map((item) => (
          <article className="ml-orderCard" key={item.id}>
            <div>
              <strong>{item.id}</strong>
              <span>{item.client}</span>
            </div>
            <p>{item.product}</p>
            <div className="ml-orderMeta">
              <StatusBadge>{item.status}</StatusBadge>
              <span>{item.shipping}</span>
              <strong>{item.total}</strong>
            </div>
            <button type="button" className="ml-primaryBtn">Importar como pedido</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuestionsPanel({ compact = false }) {
  return (
    <section className="ml-panel">
      <div className="ml-panelHead">
        <div>
          <h2>Preguntas</h2>
          <p>Consultas pendientes para responder rapido.</p>
        </div>
        {compact ? <NavLink to="/mercado-libre/preguntas" className="ml-secondaryBtn">Abrir pagina</NavLink> : null}
      </div>
      <div className="ml-cardList">
        {questions.map((item) => (
          <article className="ml-questionCard" key={`${item.client}-${item.age}`}>
            <div>
              <strong>{item.client}</strong>
              <span>{item.age}</span>
            </div>
            <p>{item.question}</p>
            <small>{item.product}</small>
            <button type="button" className="ml-secondaryBtn">Responder</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MercadoLibreContent({ section }) {
  switch (section) {
    case "productos":
      return <ProductsView />;
    case "publicaciones":
      return <PublicationsPanel />;
    case "pedidos":
      return <OrdersPanel />;
    case "preguntas":
      return <QuestionsPanel />;
    case "pendientes":
      return <PendingPanel />;
    case "precios":
      return <PricesPanel />;
    default:
      return <DashboardView />;
  }
}

export default function MercadoLibre({ section = "dashboard" }) {
  return (
    <section className="ml-shell">
      <MercadoLibreHero section={section} />
      <MercadoLibreTabs />
      <MercadoLibreContent section={section} />
    </section>
  );
}
