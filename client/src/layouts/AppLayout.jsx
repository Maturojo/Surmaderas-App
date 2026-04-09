import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getAuth, logout } from "../services/auth";
import { getChatOverview } from "../services/chat";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: "D" },
  { label: "Calendario", to: "/calendario", icon: "C" },
  {
    label: "Notas de pedido",
    icon: "N",
    children: [
      { label: "Generador", to: "/notas-pedido" },
      { label: "Listado de notas", to: "/notas-pedido/listado" },
      { label: "Notas guardadas", to: "/notas-pedido/guardadas" },
    ],
  },
  {
    label: "Presupuestos",
    icon: "$",
    children: [
      { label: "Generar presupuesto", to: "/presupuestos/generar" },
      { label: "Cargar", to: "/presupuestos/cargar" },
      { label: "Guardadas", to: "/presupuestos/guardadas" },
    ],
  },
  { label: "Chat interno", to: "/chat", icon: "M" },
  { label: "Productos", to: "/productos", icon: "P" },
  {
    label: "Proveedores",
    icon: "V",
    children: [
      { label: "Panel de proveedores", to: "/proveedores" },
      { label: "Pedidos", to: "/pedidos-proveedor" },
    ],
  },
  { label: "Generador 3D", to: "/generador-3d", icon: "3D" },
];

export default function AppLayout() {
  const location = useLocation();
  const auth = getAuth();
  const userName = auth?.user?.username || auth?.user?.name || "Equipo Sur Maderas";
  const userRole = auth?.user?.role;
  const [openGroups, setOpenGroups] = useState({});
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [hasUnlockedSound, setHasUnlockedSound] = useState(false);
  const previousUnreadRef = useRef(null);

  const navItems = [
    ...NAV_ITEMS,
    ...(userRole === "admin"
      ? [
          {
            label: "Configuracion",
            icon: "CFG",
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
    let cancelled = false;

    async function loadChatUnread() {
      try {
        const data = await getChatOverview();
        if (!cancelled) {
          setChatUnreadCount(data?.totalUnread || 0);
        }
      } catch {
        if (!cancelled) {
          setChatUnreadCount(0);
        }
      }
    }

    loadChatUnread();
    const intervalId = window.setInterval(loadChatUnread, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

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
                    <span className="app-linkIcon">{item.icon}</span>
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
                <span className="app-linkIcon">{item.icon}</span>
                <span className="app-linkText">
                  {item.label}
                  {item.to === "/chat" && chatUnreadCount > 0 ? (
                    <span className="app-linkBadge">{chatUnreadCount}</span>
                  ) : null}
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
    </div>
  );
}
