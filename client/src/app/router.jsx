import { Navigate, createBrowserRouter } from "react-router-dom";

import WaConversations from "../pages/WaConversations";
import WaFAQs from "../pages/WaFAQs";
import WaStats from "../pages/WaStats";
import WaSettings from "../pages/WaSettings";
import WaQuickReplies from "../pages/WaQuickReplies";
import WaBroadcast from "../pages/WaBroadcast";
import WaBudgetRequests from "../pages/WaBudgetRequests";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AppLayout from "../layouts/AppLayout";
import CalendarOperativo from "../pages/CalendarOperativo";
import NotasPedido from "../pages/NotasPedido";
import NotasPedidoListado from "../pages/NotasPedidoListado";
import Productos from "../pages/Productos";
import ProductosInterno from "../pages/ProductosInterno";
import ListaPlacas from "../pages/ListaPlacas";
import Proveedores from "../pages/Proveedores";
import PedidosProveedor from "../pages/PedidosProveedor";
import GeneradorMueble3D from "../pages/GeneradorMueble3D.jsx";
import CotizadorMarcos from "../pages/CotizadorMarcos.jsx";
import CotizadorCortes from "../pages/CotizadorCortes.jsx";
import UserManagement from "../pages/UserManagement.jsx";
import TurneroSettings from "../pages/TurneroSettings.jsx";
import ChatInterno from "../pages/ChatInterno.jsx";
import FormularioClientes from "../pages/FormularioClientes.jsx";
import EncuestasCupones from "../pages/EncuestasCupones.jsx";

import NotasPedidoGuardadas from "../pages/NotasPedidoGuardadas";
import NotasPedidoPendientes from "../pages/NotasPedidoPendientes";
import NotasPedidoDeposito from "../pages/NotasPedidoDeposito";
import PresupuestosGenerar from "../pages/PresupuestosGenerar";
import PresupuestosEnviar from "../pages/PresupuestosEnviar";
import PresupuestosGuardadas from "../pages/PresupuestosGuardadas";
import PresupuestosProveedorEspecial from "../pages/PresupuestosProveedorEspecial";
import ProtectedRoute from "./ProtectedRoute";
import { getDefaultHomeByRole, getUserRole } from "../services/auth";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/formulario-clientes", element: <FormularioClientes /> },
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

      { path: "notas-pedido", element: <NotasPedido /> },
      {
        path: "notas-pedido/listado",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <NotasPedidoListado />
          </ProtectedRoute>
        ),
      },

      // NUEVA: Notas guardadas
      {
        path: "notas-pedido/guardadas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <NotasPedidoGuardadas />
          </ProtectedRoute>
        ),
      },
      {
        path: "notas-pedido/pendientes",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <NotasPedidoPendientes />
          </ProtectedRoute>
        ),
      },
      {
        path: "notas-pedido/deposito",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
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
      {
        path: "encuestas",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller", "ventas"]}>
            <EncuestasCupones />
          </ProtectedRoute>
        ),
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
