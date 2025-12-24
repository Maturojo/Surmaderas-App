import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AppLayout from "../layouts/AppLayout";
import Calendar from "../pages/Calendar";
import NotasPedido from "../pages/NotasPedido";
import Productos from "../pages/Productos";
import { isAuthenticated } from "../services/auth";
import GeneradorMueble3D from "../pages/GeneradorMueble3D.jsx";


function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

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
      { path: "productos", element: <Productos /> },
      {path: "/generador-3d", element: <GeneradorMueble3D/>} ,

   // ✅
    ],
  },
]);
