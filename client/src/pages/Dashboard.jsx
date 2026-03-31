import { Link } from "react-router-dom";

const CARDS = [
  {
    label: "Caja",
    title: "Listado de notas en espera",
    copy: "Aca vive el circuito de espera hasta que el cliente paga o deja seña.",
    to: "/notas-pedido/listado",
  },
  {
    label: "Ventas",
    title: "Nueva nota de pedido",
    copy: "Genera pedidos en mostrador con cliente, entrega, detalle e importe.",
    to: "/notas-pedido",
  },
  {
    label: "Archivo",
    title: "Notas guardadas",
    copy: "Consulta, imprime o comparte pedidos ya cerrados en caja.",
    to: "/notas-pedido/guardadas",
  },
];

export default function Dashboard() {
  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div className="dashboard-kicker">Sur Maderas</div>
        <h1 className="dashboard-title">Centro de gestion comercial</h1>
        <p className="dashboard-copy">
          Organiza ventas, pedidos, caja y seguimiento diario desde una sola base visual.
          La idea es que el vendedor cargue, caja confirme y la informacion quede ordenada para consultar o imprimir.
        </p>
      </section>

      <section className="dashboard-grid">
        {CARDS.map((card) => (
          <article key={card.to} className="dashboard-card">
            <span className="dashboard-cardLabel">{card.label}</span>
            <h2 className="dashboard-cardTitle">{card.title}</h2>
            <p className="dashboard-cardCopy">{card.copy}</p>
            <Link className="dashboard-cardLink" to={card.to}>
              Abrir modulo
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
