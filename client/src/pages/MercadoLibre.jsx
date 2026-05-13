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

function StatusBadge({ children }) {
  const normalized = String(children).toLowerCase();
  const tone = normalized.includes("stock")
    ? "danger"
    : normalized.includes("preparar") || normalized.includes("facturar")
      ? "warning"
      : "success";

  return <span className={`ml-status ml-status--${tone}`}>{children}</span>;
}

export default function MercadoLibre() {
  return (
    <section className="ml-shell">
      <div className="ml-hero">
        <div>
          <div className="dashboard-kicker">Negocio Online</div>
          <h1 className="dashboard-title">Mercado Libre</h1>
          <p className="dashboard-copy">
            Panel operativo para publicaciones, ventas, preguntas, stock y rentabilidad del canal.
          </p>
        </div>
        <div className="ml-heroActions">
          <button type="button" className="ml-primaryBtn">Importar venta</button>
          <button type="button" className="ml-secondaryBtn">Nueva publicacion</button>
        </div>
      </div>

      <div className="ml-statsGrid">
        {stats.map((item) => (
          <article className="ml-statCard" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>

      <div className="ml-mainGrid">
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
      </div>

      <section className="ml-panel">
        <div className="ml-panelHead">
          <div>
            <h2>Publicaciones</h2>
            <p>Precio, stock, estado, visitas, ventas y margen estimado.</p>
          </div>
          <button type="button" className="ml-secondaryBtn">Gestionar publicaciones</button>
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

      <div className="ml-mainGrid">
        <section className="ml-panel">
          <div className="ml-panelHead">
            <div>
              <h2>Pedidos</h2>
              <p>Ventas listas para transformar en pedido interno.</p>
            </div>
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

        <section className="ml-panel">
          <div className="ml-panelHead">
            <div>
              <h2>Preguntas</h2>
              <p>Consultas pendientes para responder rapido.</p>
            </div>
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
      </div>
    </section>
  );
}
