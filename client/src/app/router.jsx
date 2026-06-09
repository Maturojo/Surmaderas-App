import { lazy, Suspense } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import { getDefaultHomeByRole, getUserRole } from "../services/auth";

const WaConversations = lazy(() => import("../pages/WaConversations"));
const WaFAQs = lazy(() => import("../pages/WaFAQs"));
const WaStats = lazy(() => import("../pages/WaStats"));
const WaSettings = lazy(() => import("../pages/WaSettings"));
const WaQuickReplies = lazy(() => import("../pages/WaQuickReplies"));
const WaBroadcast = lazy(() => import("../pages/WaBroadcast"));
const WaBudgetRequests = lazy(() => import("../pages/WaBudgetRequests"));
const WaInbox = lazy(() => import("../pages/WaInbox"));

const Login = lazy(() => import("../pages/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const CalendarOperativo = lazy(() => import("../pages/CalendarOperativo"));
const NotasPedido = lazy(() => import("../pages/NotasPedido"));
const NotasPedidoListado = lazy(() => import("../pages/NotasPedidoListado"));
const Productos = lazy(() => import("../pages/Productos"));
const ProductosInterno = lazy(() => import("../pages/ProductosInterno"));
const ListaPlacas = lazy(() => import("../pages/ListaPlacas"));
const Proveedores = lazy(() => import("../pages/Proveedores"));
const PedidosProveedor = lazy(() => import("../pages/PedidosProveedor"));
const GeneradorMueble3D = lazy(() => import("../pages/GeneradorMueble3D.jsx"));
const CotizadorMarcos = lazy(() => import("../pages/CotizadorMarcos.jsx"));
const CotizadorCortes = lazy(() => import("../pages/CotizadorCortes.jsx"));
const CotizadorListones = lazy(() => import("../pages/CotizadorListones.jsx"));
const UserManagement = lazy(() => import("../pages/UserManagement.jsx"));
const TurneroSettings = lazy(() => import("../pages/TurneroSettings.jsx"));
const ChatInterno = lazy(() => import("../pages/ChatInterno.jsx"));
const FormularioClientes = lazy(() => import("../pages/FormularioClientes.jsx"));
const EncuestasCupones = lazy(() => import("../pages/EncuestasCupones.jsx"));
const VentasMensuales = lazy(() => import("../pages/VentasMensuales.jsx"));
const MercadoLibre = lazy(() => import("../pages/MercadoLibre.jsx"));
const Estadisticas = lazy(() => import("../pages/Estadisticas.jsx"));

const NotasPedidoGuardadas = lazy(() => import("../pages/NotasPedidoGuardadas"));
const NotasPedidoPendientes = lazy(() => import("../pages/NotasPedidoPendientes"));
const NotasPedidoDeposito = lazy(() => import("../pages/NotasPedidoDeposito"));
const PresupuestosGenerar = lazy(() => import("../pages/PresupuestosGenerar"));
const PresupuestosEnviar = lazy(() => import("../pages/PresupuestosEnviar"));
const PresupuestosGuardadas = lazy(() => import("../pages/PresupuestosGuardadas"));
const PresupuestosProveedorEspecial = lazy(() => import("../pages/PresupuestosProveedorEspecial"));

function lazyPage(element) {
  return <Suspense fallback={<div className="route-loading">Cargando modulo...</div>}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: lazyPage(<Login />) },
  { path: "/formulario", element: lazyPage(<FormularioClientes />) },
  { path: "/formulario/web", element: lazyPage(<FormularioClientes defaultOrigin="web" />) },
  { path: "/formularios", element: lazyPage(<FormularioClientes />) },
  { path: "/formularios/web", element: lazyPage(<FormularioClientes defaultOrigin="web" />) },
  { path: "/formulario-clientes", element: lazyPage(<FormularioClientes />) },
  { path: "/cupones-independencia", element: lazyPage(<FormularioClientes defaultBranch="independencia" />) },
  { path: "/cupones-luro", element: lazyPage(<FormularioClientes defaultBranch="luro" />) },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to={getDefaultHomeByRole(getUserRole())} replace /> },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "ventas"]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      { path: "calendario", element: <CalendarOperativo /> },
      {
        path: "estadisticas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <Estadisticas />
          </ProtectedRoute>
        ),
      },

      { path: "notas-pedido", element: <NotasPedido /> },
      { path: "notas-pedido/editar/:id", element: <NotasPedido /> },
      {
        path: "notas-pedido/listado",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "caja"]}>
            <NotasPedidoListado />
          </ProtectedRoute>
        ),
      },

      // NUEVA: Notas guardadas
      {
        path: "notas-pedido/guardadas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "caja"]}>
            <NotasPedidoGuardadas />
          </ProtectedRoute>
        ),
      },
      {
        path: "notas-pedido/pendientes",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "caja"]}>
            <NotasPedidoPendientes />
          </ProtectedRoute>
        ),
      },
      {
        path: "notas-pedido/deposito",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "caja"]}>
            <NotasPedidoDeposito />
          </ProtectedRoute>
        ),
      },

      {
        path: "presupuestos",
        element: <Navigate to={getUserRole() === "ventas" ? "/presupuestos/cargar" : "/presupuestos/generar"} replace />,
      },
      {
        path: "presupuestos/generar",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <PresupuestosGenerar />
          </ProtectedRoute>
        ),
      },
      { path: "presupuestos/cargar", element: <PresupuestosEnviar /> },
      {
        path: "presupuestos/guardadas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <PresupuestosGuardadas />
          </ProtectedRoute>
        ),
      },
      {
        path: "presupuestos/proveedores",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "ventas"]}>
            <PresupuestosProveedorEspecial />
          </ProtectedRoute>
        ),
      },
      {
        path: "chat",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <ChatInterno />
          </ProtectedRoute>
        ),
      },

      { path: "productos", element: <Productos /> },
      { path: "placas", element: <ListaPlacas /> },
      {
        path: "productos-interno",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <ProductosInterno />
          </ProtectedRoute>
        ),
      },
      {
        path: "proveedores",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <Proveedores />
          </ProtectedRoute>
        ),
      },
      {
        path: "pedidos-proveedor",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <PedidosProveedor />
          </ProtectedRoute>
        ),
      },
      { path: "generador-3d", element: <GeneradorMueble3D /> },
      { path: "marcos", element: <CotizadorMarcos /> },
      { path: "cotizador-cortes", element: <CotizadorCortes /> },
      { path: "cotizador-listones", element: <CotizadorListones /> },
      {
        path: "encuestas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "ventas"]}>
            <EncuestasCupones />
          </ProtectedRoute>
        ),
      },
      {
        path: "ventas-mensuales",
        element: <Navigate to="/ventas/lista" replace />,
      },
      {
        path: "ventas",
        element: <Navigate to="/ventas/lista" replace />,
      },
      {
        path: "ventas/lista",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <VentasMensuales section="lista" />
          </ProtectedRoute>
        ),
      },
      {
        path: "ventas/nueva",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <VentasMensuales section="nueva" />
          </ProtectedRoute>
        ),
      },
      {
        path: "ventas/objetivos",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <VentasMensuales section="objetivos" />
          </ProtectedRoute>
        ),
      },
      {
        path: "ventas/transferencias",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <VentasMensuales section="transferencias" />
          </ProtectedRoute>
        ),
      },
      {
        path: "ventas/estadisticas",
        element: <Navigate to="/estadisticas" replace />,
      },
      {
        path: "whatsapp",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <WaConversations />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/control",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <WaInbox />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/faqs",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <WaFAQs />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/stats",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <WaStats />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/settings",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <WaSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/quick-replies",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <WaQuickReplies />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/broadcast",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <WaBroadcast />
          </ProtectedRoute>
        ),
      },
      {
        path: "whatsapp/presupuestos",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <WaBudgetRequests />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre/productos",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre section="productos" />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre/publicaciones",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre section="publicaciones" />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre/pedidos",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre section="pedidos" />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre/preguntas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre section="preguntas" />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre/pendientes",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre section="pendientes" />
          </ProtectedRoute>
        ),
      },
      {
        path: "mercado-libre/precios",
        element: (
          <ProtectedRoute allowedRoles={["admin", "ventas"]}>
            <MercadoLibre section="precios" />
          </ProtectedRoute>
        ),
      },
      {
        path: "configuracion/usuarios",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "configuracion/turnero",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <TurneroSettings />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
