import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getAuth, logout } from "../services/auth";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: "◫" },
  { label: "Calendario", to: "/calendario", icon: "◷" },
  {
    label: "Notas de pedido",
    icon: "✎",
    children: [
      { label: "Generador", to: "/notas-pedido" },
      { label: "Listado de notas", to: "/notas-pedido/listado" },
      { label: "Notas guardadas", to: "/notas-pedido/guardadas" },
    ],
  },
  { label: "Presupuestos", to: "/presupuestos", icon: "$" },
  { label: "Productos", to: "/productos", icon: "▣" },
  { label: "Generador 3D", to: "/generador-3d", icon: "◇" },
];

export default function AppLayout() {
  const location = useLocation();
  const auth = getAuth();
  const userName = auth?.user?.username || auth?.user?.name || "Equipo Sur Maderas";
  const notasGroupActive = NAV_ITEMS.find((item) => item.children)?.children.some(
    (child) => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
  );
  const [notasOpen, setNotasOpen] = useState(false);

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
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              const isOpen = notasGroupActive || notasOpen;
              const isActive = item.children.some(
                (child) => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
              );

              return (
                <div key={item.label} className={`app-group${isOpen ? " open" : ""}`}>
                  <button
                    type="button"
                    className={`app-link app-link--group${isActive ? " active" : ""}`}
                    onClick={() => setNotasOpen((prev) => !prev)}
                  >
                    <span className="app-linkIcon">{item.icon}</span>
                    <span className="app-linkText">{item.label}</span>
                    <span className="app-linkCaret">⌄</span>
                  </button>

                  <div className="app-subnav" hidden={!isOpen}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.to === "/notas-pedido"}
                        className={({ isActive }) => `app-sublink${isActive ? " active" : ""}`}
                      >
                        <span className="app-sublinkDot" />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
              >
                <span className="app-linkIcon">{item.icon}</span>
                <span className="app-linkText">{item.label}</span>
              </NavLink>
            );
          })}
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
