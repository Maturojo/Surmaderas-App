import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getAuth, logout } from "../services/auth";
import ChatInternoWidget from "../features/chat/components/ChatInternoWidget";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: "dashboard" },
  { label: "Calendario", to: "/calendario", icon: "calendar" },
  {
    label: "Notas de pedido",
    icon: "notes",
    children: [
      { label: "Generador", to: "/notas-pedido" },
      { label: "Listado de notas", to: "/notas-pedido/listado" },
      { label: "Notas guardadas", to: "/notas-pedido/guardadas" },
    ],
  },
  {
    label: "Presupuestos",
    icon: "budget",
    children: [
      { label: "Generar presupuesto", to: "/presupuestos/generar" },
      { label: "Cargar", to: "/presupuestos/cargar" },
      { label: "Guardadas", to: "/presupuestos/guardadas" },
      { label: "Proveedores especiales", to: "/presupuestos/proveedores" },
    ],
  },
  { label: "Cotizador de marcos", to: "/marcos", icon: "frame" },
  { label: "Productos", to: "/productos", icon: "products" },
  { label: "Placas", to: "/placas", icon: "layers" },
  {
    label: "Proveedores",
    icon: "suppliers",
    children: [
      { label: "Panel de proveedores", to: "/proveedores" },
      { label: "Pedidos", to: "/pedidos-proveedor" },
    ],
  },
  { label: "Generador 3D", to: "/generador-3d", icon: "cube" },
];

const VENTAS_ALLOWED_PATHS = new Set([
  "/dashboard",
  "/calendario",
  "/notas-pedido",
  "/presupuestos/cargar",
  "/presupuestos/proveedores",
  "/productos",
  "/placas",
  "/generador-3d",
  "/marcos",
]);

function SidebarIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "notes":
      return (
        <svg {...common}>
          <path d="M7 4.5h8l3 3V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
          <path d="M15 4.5V8h3" />
          <path d="M8 12h8M8 16h6" />
        </svg>
      );
    case "budget":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M17 7.5c0-2-2.24-3.5-5-3.5S7 5.3 7 7.1c0 4.2 10 2.3 10 7 0 2-2.24 3.9-5 3.9S7 16.6 7 14.5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M5 18.5 3.5 21l.9-3.6A8.5 8.5 0 1 1 20.5 12 8.5 8.5 0 0 1 5 18.5Z" />
          <path d="M8 12h8M8 9h5" />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" />
          <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
          <path d="M12 12v9" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 16 8 4 8-4" />
        </svg>
      );
    case "suppliers":
      return (
        <svg {...common}>
          <path d="M4 20V9l8-5 8 5v11" />
          <path d="M9 20v-5h6v5M9 10h.01M15 10h.01" />
        </svg>
      );
    case "cube":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M12 12 20 7.5M12 12 4 7.5M12 12v9" />
        </svg>
      );
    case "frame":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="8" y="8" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Z" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.4 1.9Z" />
        </svg>
      );
    default:
      return <span>{name}</span>;
  }
}

export default function AppLayout() {
  const location = useLocation();
  const auth = getAuth();
  const userName = auth?.user?.username || auth?.user?.name || "Equipo Sur Maderas";
  const userRole = auth?.user?.role;
  const [openGroups, setOpenGroups] = useState({});
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [hasUnlockedSound, setHasUnlockedSound] = useState(false);
  const previousUnreadRef = useRef(null);

  const baseNavItems =
    userRole === "ventas"
      ? NAV_ITEMS
          .map((item) => {
            if (item.children) {
              const children = item.children.filter((child) => VENTAS_ALLOWED_PATHS.has(child.to));
              return children.length > 0 ? { ...item, children } : null;
            }

            return VENTAS_ALLOWED_PATHS.has(item.to) ? item : null;
          })
          .filter(Boolean)
      : NAV_ITEMS;

  const navItems = [
    ...baseNavItems,
    ...(userRole === "admin"
      ? [
          {
            label: "Configuracion",
            icon: "settings",
            children: [
              { label: "Usuarios", to: "/configuracion/usuarios" },
              { label: "Turnero", to: "/configuracion/turnero" },
            ],
          },
        ]
      : []),
  ];

  function isChildActive(child) {
    return location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
  }

  function isGroupActive(item) {
    return item.children?.some(isChildActive);
  }

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  useEffect(() => {
    function unlockSound() {
      setHasUnlockedSound(true);
    }

    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);

  useEffect(() => {
    const baseTitle = "Sur Maderas";
    document.title = chatUnreadCount > 0 ? `(${chatUnreadCount}) ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [chatUnreadCount]);

  useEffect(() => {
    if (!hasUnlockedSound) {
      return;
    }

    if (previousUnreadRef.current === null) {
      previousUnreadRef.current = chatUnreadCount;
      return;
    }

    const previousUnread = previousUnreadRef.current;
    previousUnreadRef.current = chatUnreadCount;

    if (chatUnreadCount <= previousUnread) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, audioContext.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);

    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  }, [chatUnreadCount, hasUnlockedSound]);

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
          {navItems.map((item) => {
            if (item.children) {
              const isActive = isGroupActive(item);
              const isOpen = isActive || Boolean(openGroups[item.label]);

              return (
                <div key={item.label} className={`app-group${isOpen ? " open" : ""}`}>
                  <button
                    type="button"
                    className={`app-link app-link--group${isActive ? " active" : ""}`}
                    onClick={() => toggleGroup(item.label)}
                  >
                    <span className="app-linkIcon">
                      <SidebarIcon name={item.icon} />
                    </span>
                    <span className="app-linkText">{item.label}</span>
                    <span className="app-linkCaret" aria-hidden="true" />
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
                end={item.to === "/dashboard"}
                className={({ isActive }) => `app-link${isActive ? " active" : ""}`}
              >
                <span className="app-linkIcon">
                  <SidebarIcon name={item.icon} />
                </span>
                <span className="app-linkText">
                  {item.label}
                </span>
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

      {userRole !== "ventas" ? (
        <ChatInternoWidget unreadCount={chatUnreadCount} onUnreadChange={setChatUnreadCount} />
      ) : null}
    </div>
  );
}
