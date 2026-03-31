import { createBrowserRouter } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AppLayout from "../layouts/AppLayout";
import Calendar from "../pages/Calendar";
import NotasPedido from "../pages/NotasPedido";
import NotasPedidoListado from "../pages/NotasPedidoListado";
import Productos from "../pages/Productos";
import Proveedores from "../pages/Proveedores";
import GeneradorMueble3D from "../pages/GeneradorMueble3D.jsx";

import NotasPedidoGuardadas from "../pages/NotasPedidoGuardadas";
import GeneradorPresupuestos from "../pages/GeneradorPresupuestos";
import ProtectedRoute from "./ProtectedRoute";

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
      { index: true, element: <Dashboard /> },
      { path: "calendario", element: <Calendar /> },

      { path: "notas-pedido", element: <NotasPedido /> },
      { path: "notas-pedido/listado", element: <NotasPedidoListado /> },

      // NUEVA: Notas guardadas
      { path: "notas-pedido/guardadas", element: <NotasPedidoGuardadas /> },

      // NUEVA: Presupuestos
      { path: "presupuestos", element: <GeneradorPresupuestos /> },

      { path: "productos", element: <Productos /> },
      { path: "proveedores", element: <Proveedores /> },
      { path: "generador-3d", element: <GeneradorMueble3D /> },
    ],
  },
]);
