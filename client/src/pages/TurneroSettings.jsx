import { useEffect, useState } from "react";
import { getAuth } from "../services/auth";
import { getTurnero, updateTurnero } from "../services/turnero";

export default function TurneroSettings() {
  const auth = getAuth();
  const currentRole = auth?.user?.role;
  const [currentNumber, setCurrentNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (currentRole !== "admin") {
      setIsLoading(false);
      return;
    }

    loadTurnero();
  }, [currentRole]);

  async function loadTurnero() {
    try {
      setIsLoading(true);
      const data = await getTurnero();
      setCurrentNumber(String(data?.currentNumber ?? ""));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar el turnero");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSaving(true);
      const data = await updateTurnero(Number(currentNumber));
      setCurrentNumber(String(data?.currentNumber ?? ""));
      setSuccess(`Turnero actualizado al numero ${data?.currentNumber ?? currentNumber}`);
      setError("");
    } catch (submitError) {
      setError(submitError.message || "No se pudo actualizar el turnero");
      setSuccess("");
    } finally {
      setIsSaving(false);
    }
  }

  if (currentRole !== "admin") {
    return (
      <section className="config-usersShell">
        <div className="config-usersHero">
          <div className="dashboard-kicker">Configuracion</div>
          <h1 className="dashboard-title">Turnero</h1>
          <p className="dashboard-copy">Solo un administrador puede modificar el numero del turnero.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="config-usersShell">
      <div className="config-usersHero">
        <div className="dashboard-kicker">Configuracion</div>
        <h1 className="dashboard-title">Turnero</h1>
        <p className="dashboard-copy">
          Desde aca podes definir manualmente el proximo numero que va a mostrarse en el turnero.
        </p>
      </div>

      <div className="config-turneroGrid">
        <form className="config-usersCard" onSubmit={handleSubmit}>
          <div className="config-usersCardTitle">Numero actual</div>

          <label className="config-usersField">
            <span>Proximo turno visible</span>
            <input
              type="number"
              min="1"
              step="1"
              value={currentNumber}
              onChange={(event) => setCurrentNumber(event.target.value)}
              placeholder="Ej: 45"
              required
            />
          </label>

          {error ? <div className="config-usersMessage error">{error}</div> : null}
          {success ? <div className="config-usersMessage success">{success}</div> : null}

          <button className="config-usersSubmit" type="submit" disabled={isLoading || isSaving}>
            {isSaving ? "Guardando..." : "Actualizar turnero"}
          </button>
        </form>

        <div className="config-usersCard">
          <div className="config-usersCardTitle">Referencia</div>
          {isLoading ? (
            <div className="config-usersEmpty">Cargando numero actual...</div>
          ) : (
            <div className="config-turneroPreview">
              <div className="config-turneroLabel">Numero configurado</div>
              <div className="config-turneroValue">{currentNumber || "--"}</div>
              <p className="config-usersMeta">
                Cuando guardes, ese va a ser el numero que veran todos en el dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
