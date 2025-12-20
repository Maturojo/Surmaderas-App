import { useState } from "react";
import { login, loginRequest } from "../services/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm border rounded-xl p-6">
        <h1 className="text-xl font-bold">Ingresar</h1>
        <p className="text-sm opacity-70 mt-1">Sistema de gestión Sur Maderas</p>

        <label className="block text-sm mt-6">Usuario</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mt-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <label className="block text-sm mt-4">Clave</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mt-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button
          className="w-full mt-4 border rounded-lg py-2 font-semibold disabled:opacity-60"
          disabled={loading}
          onClick={async () => {
            try {
              setLoading(true);
              const data = await loginRequest({ username, password });
              // guardamos lo que usa tu app
              login({ token: data.token, role: data.user.role, user: data.user });
              window.location.href = "/";
            } catch (e) {
              alert(e.message || "Error al ingresar");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
