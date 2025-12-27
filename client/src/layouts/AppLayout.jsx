import { Link, Outlet } from "react-router-dom";
import { logout } from "../services/auth";
import Productos from "../pages/Productos";






export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4">
        <div className="text-lg font-bold">Sur Maderas</div>

        <nav className="mt-6 flex flex-col gap-2">
          <Link className="hover:underline" to="/">Dashboard</Link>
          <Link className="hover:underline" to="/calendario">Calendario</Link>
          <Link className="hover:underline" to="/notas-pedido">Notas de pedido</Link>
          <Link className="hover:underline" to="/notas-pedido/listado">Listado de notas</Link>
          <Link className="hover:underline" to="/productos">Productos</Link>
          <Link to="/generador-3d">Generador 3D</Link>

        </nav>

        <button
          className="mt-6 text-sm underline"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
