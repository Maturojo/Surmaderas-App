import { useState } from "react";
import { login, loginRequest } from "../services/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="login-shell">
      <div className="login-card">
        <section className="login-brandPane">
          <div className="login-brandTop">
            <img className="login-logo" src="/logo-sur-maderas.png" alt="Sur Maderas" />
            <div className="login-kicker">Sistema interno</div>
            <div className="login-title">Sur Maderas</div>
            <p className="login-copy">
              Un espacio pensado para ventas, caja y seguimiento de pedidos con una experiencia mas clara y prolija para el equipo.
            </p>
          </div>

          <div className="login-points">
            <div>Control de notas de pedido y guardado en caja.</div>
            <div>Consulta rapida de productos y notas ya cerradas.</div>
            <div>Impresion y seguimiento comercial desde una sola app.</div>
          </div>
        </section>

        <section className="login-formPane">
          <div className="login-formHeader">
            <h1 className="login-formTitle">Ingresar</h1>
            <p className="login-formSub">Accede al sistema de gestion de Sur Maderas.</p>
          </div>

          <label className="login-field">
            <span className="login-label">Usuario</span>
            <input
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="login-field">
            <span className="login-label">Clave</span>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button
            className="login-submit"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                const data = await loginRequest({ username, password });
                login({ token: data.token, role: data.user.role, user: data.user });
                window.location.href = "/dashboard";
              } catch (e) {
                const rawMessage = String(e?.message || "");
                const message =
                  rawMessage.includes("Credenciales") || rawMessage.includes("Faltan credenciales")
                    ? "Usuario o clave incorrectos."
                    : "No se pudo iniciar sesion. Intenta nuevamente en unos segundos.";
                alert(message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Ingresando..." : "Entrar al sistema"}
          </button>
        </section>
      </div>
    </div>
  );
}
