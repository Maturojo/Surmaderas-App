import { API_URL } from "./http";

const KEY = "sm_auth";

export function login(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function logout() {
  localStorage.removeItem(KEY);
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const a = getAuth();
  return Boolean(a?.token);
}

export function getUserRole() {
  return getAuth()?.user?.role || "";
}

export function getDefaultHomeByRole(role = getUserRole()) {
  if (role === "ivan") return "/ivan/remitos";
  if (role === "caja") return "/notas-pedido/listado";
  return role === "ventas" ? "/dashboard" : "/dashboard";
}

const SUBMODULE_GROUPS = {
  pedidos: [
    "/notas-pedido",
    "/notas-pedido/listado",
    "/notas-pedido/guardadas",
    "/notas-pedido/pendientes",
    "/notas-pedido/deposito",
  ],
  presupuestos: [
    "/presupuestos/generar",
    "/presupuestos/cargar",
    "/presupuestos/guardadas",
    "/presupuestos/proveedores",
  ],
  ventas: ["/ventas/lista", "/ventas/nueva", "/ventas/objetivos", "/ventas/transferencias"],
  ivan: ["/ivan/remitos", "/ivan/productos"],
  proveedores: ["/proveedores", "/pedidos-proveedor"],
  "negocio-online": [
    "/whatsapp/control",
    "/whatsapp",
    "/whatsapp/presupuestos",
    "/whatsapp/broadcast",
    "/whatsapp/faqs",
    "/whatsapp/quick-replies",
    "/whatsapp/stats",
    "/whatsapp/settings",
    "/mercado-libre",
    "/mercado-libre/productos",
    "/mercado-libre/publicaciones",
    "/mercado-libre/pedidos",
    "/mercado-libre/preguntas",
    "/mercado-libre/pendientes",
    "/mercado-libre/precios",
  ],
};

function getPathGroup(pathname) {
  if (pathname.startsWith("/notas-pedido/editar/")) return "pedidos";
  return Object.entries(SUBMODULE_GROUPS).find(([, paths]) =>
    paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  )?.[0] || "";
}

export function canAccessCurrentPath(pathname) {
  const auth = getAuth();
  const role = auth?.user?.role || "";
  if (role === "admin") return true;
  if (role === "ivan") return pathname === "/ivan/remitos" || pathname === "/ivan/productos";

  const allowedSubmodules = auth?.user?.allowedSubmodules;
  if (!Array.isArray(allowedSubmodules) || allowedSubmodules.length === 0) return true;

  const pathGroup = getPathGroup(pathname);
  const groupPaths = SUBMODULE_GROUPS[pathGroup] || [];
  const hasRestrictionForGroup = groupPaths.some((path) => allowedSubmodules.includes(path));
  if (!hasRestrictionForGroup) return true;

  if (pathname.startsWith("/notas-pedido/editar/")) {
    return allowedSubmodules.includes("/notas-pedido") || allowedSubmodules.includes("/notas-pedido/listado");
  }

  return allowedSubmodules.includes(pathname);
}

export async function loginRequest({ username, password }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "No se pudo iniciar sesión");
  }

  return res.json(); // { token, user }
}
