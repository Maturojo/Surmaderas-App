import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

const PRODUCT_STORAGE_KEY = "surmaderas-mercado-libre-productos";

const stats = [
  { label: "Ventas hoy", value: "12", detail: "$1.842.500" },
  { label: "Pedidos pendientes", value: "7", detail: "4 para preparar" },
  { label: "Preguntas", value: "9", detail: "6 sin responder" },
  { label: "Publicaciones activas", value: "38", detail: "5 con bajo stock" },
];

const alerts = [
  { title: "Preguntas sin responder", value: "6", tone: "warning" },
  { title: "Pedidos por preparar", value: "4", tone: "strong" },
  { title: "Publicaciones pausadas", value: "3", tone: "muted" },
  { title: "Reclamos abiertos", value: "1", tone: "danger" },
];

const defaultProducts = [
  {
    id: "ml-product-1",
    name: "Tablero melamina blanca 18 mm",
    category: "Tableros",
    cost: "46900",
    price: "72400",
    stock: "8",
    status: "Para publicar",
    notes: "Producto con buena rotacion y margen estable.",
  },
  {
    id: "ml-product-2",
    name: "Kit corredera telescopica 45 cm",
    category: "Herrajes",
    cost: "12500",
    price: "18950",
    stock: "2",
    status: "Revisar stock",
    notes: "Conviene ofrecer pack x par.",
  },
];

const publications = [
  {
    title: "Tablero melamina blanca 18 mm",
    sku: "ML-SM-001",
    price: "$72.400",
    stock: 8,
    status: "Activa",
    visits: 184,
    sales: 12,
    margin: "28%",
  },
  {
    title: "Kit corredera telescopica 45 cm",
    sku: "ML-SM-014",
    price: "$18.950",
    stock: 2,
    status: "Bajo stock",
    visits: 91,
    sales: 7,
    margin: "34%",
  },
  {
    title: "Placa MDF 3 mm 1.22 x 2.60",
    sku: "ML-SM-023",
    price: "$21.300",
    stock: 0,
    status: "Sin stock",
    visits: 65,
    sales: 4,
    margin: "22%",
  },
];

const orders = [
  {
    id: "ML-889201",
    client: "Marcelo Rivas",
    product: "Melamina blanca 18 mm",
    status: "Para preparar",
    shipping: "Flex",
    total: "$144.800",
  },
  {
    id: "ML-889188",
    client: "Carla Perez",
    product: "Corredera telescopica 45 cm",
    status: "Facturar",
    shipping: "Mercado Envios",
    total: "$37.900",
  },
  {
    id: "ML-889170",
    client: "Obra Las Lomas",
    product: "MDF 3 mm",
    status: "Listo",
    shipping: "Retiro",
    total: "$85.200",
  },
];

const questions = [
  {
    product: "Tablero melamina blanca 18 mm",
    client: "usuario_5821",
    question: "Hacen cortes a medida antes de entregar?",
    age: "Hace 12 min",
  },
  {
    product: "Kit corredera telescopica 45 cm",
    client: "carpinteria_sur",
    question: "Tenes 20 pares disponibles para retirar hoy?",
    age: "Hace 34 min",
  },
  {
    product: "Placa MDF 3 mm",
    client: "decoraciones_ma",
    question: "Sirve para fondo de cajon?",
    age: "Hace 1 h",
  },
];

const profitability = [
  { label: "Precio publicado", value: "$72.400" },
  { label: "Costo estimado", value: "$46.900" },
  { label: "Comision ML", value: "$8.688" },
  { label: "Ganancia", value: "$16.812" },
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
  status: "Idea",
  notes: "",
};

function money(value) {
  const numeric = Number(String(value || "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function getMargin(product) {
  const cost = Number(product.cost);
  const price = Number(product.price);
  if (!cost || !price || price <= cost) return "-";
  return `${Math.round(((price - cost) / price) * 100)}%`;
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
    const stored = window.localStorage.getItem(PRODUCT_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setProducts(parsed);
    } catch {
      setProducts(defaultProducts);
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

      <div className="ml-mainGrid">
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
              <p>Ideas cargadas manualmente para revisar y publicar.</p>
            </div>
          </div>
          <div className="ml-cardList">
            {products.map((product) => (
              <article className="ml-productCard" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <StatusBadge>{product.status}</StatusBadge>
                </div>
                <span>{product.category}</span>
                <div className="ml-productNumbers">
                  <small>Costo: {money(product.cost)}</small>
                  <small>Precio: {money(product.price)}</small>
                  <small>Margen: {getMargin(product)}</small>
                  <small>Stock: {product.stock || 0}</small>
                </div>
                {product.notes ? <p>{product.notes}</p> : null}
                <button type="button" className="ml-secondaryBtn" onClick={() => removeProduct(product.id)}>
                  Quitar
                </button>
              </article>
            ))}
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
