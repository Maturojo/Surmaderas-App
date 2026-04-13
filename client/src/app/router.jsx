import { Navigate, createBrowserRouter } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AppLayout from "../layouts/AppLayout";
import CalendarOperativo from "../pages/CalendarOperativo";
import NotasPedido from "../pages/NotasPedido";
import NotasPedidoListado from "../pages/NotasPedidoListado";
import Productos from "../pages/Productos";
import ProductosInterno from "../pages/ProductosInterno";
import Proveedores from "../pages/Proveedores";
import PedidosProveedor from "../pages/PedidosProveedor";
import GeneradorMueble3D from "../pages/GeneradorMueble3D.jsx";
import CotizadorMarcos from "../pages/CotizadorMarcos.jsx";
import UserManagement from "../pages/UserManagement.jsx";
import TurneroSettings from "../pages/TurneroSettings.jsx";
import ChatInterno from "../pages/ChatInterno.jsx";

import NotasPedidoGuardadas from "../pages/NotasPedidoGuardadas";
import PresupuestosGenerar from "../pages/PresupuestosGenerar";
import PresupuestosEnviar from "../pages/PresupuestosEnviar";
import PresupuestosGuardadas from "../pages/PresupuestosGuardadas";
import ProtectedRoute from "./ProtectedRoute";
import { getDefaultHomeByRole, getUserRole } from "../services/auth";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
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
        path: "chat",
        element: (
          <ProtectedRoute allowedRoles={["admin", "taller"]}>
            <ChatInterno />
          </ProtectedRoute>
        ),
      },

      { path: "productos", element: <Productos /> },
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
