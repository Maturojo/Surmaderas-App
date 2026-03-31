import { NavLink, Outlet } from "react-router-dom";
import { getAuth, logout } from "../services/auth";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: "◫" },
  { label: "Calendario", to: "/calendario", icon: "◷" },
  { label: "Notas de pedido", to: "/notas-pedido", icon: "✎" },
  { label: "Listado de notas", to: "/notas-pedido/listado", icon: "☰" },
  { label: "Notas guardadas", to: "/notas-pedido/guardadas", icon: "✓" },
  { label: "Presupuestos", to: "/presupuestos", icon: "$" },
  { label: "Productos", to: "/productos", icon: "▣" },
  { label: "Generador 3D", to: "/generador-3d", icon: "◇" },
];

export default function AppLayout() {
  const auth = getAuth();
  const userName = auth?.user?.username || auth?.user?.name || "Equipo Sur Maderas";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <div className="app-brandRow">
            <img className="app-brandLogo" src="/logo-sur-maderas.png" alt="Sur Maderas" />
            <div>
              <div className="app-brandTitle">Sur Maderas</div>
              <div className="app-brandSub">Sistema comercial y operativo</div>
            </div>
          </div>
        </div>

        <div className="app-meta">
          <div>
            <div className="app-metaLabel">Sesion activa</div>
            <div className="app-metaValue">{userName}</div>
          </div>
          <div>
            <div className="app-metaLabel">Flujo actual</div>
            <div className="app-metaValue">Ventas, caja y seguimiento</div>
          </div>
        </div>

        <nav className="app-nav">
          <div className="app-navLabel">Modulos</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
            >
              <span className="app-linkIcon">{item.icon}</span>
              <span className="app-linkText">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebarFooter">
          <button
            className="app-logout"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-mainInner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
