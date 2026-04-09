import { useEffect, useMemo, useState } from "react";
import { getAuth } from "../services/auth";
import { createUser, getUsers, updateUser } from "../services/users";

const INITIAL_CREATE_FORM = {
  name: "",
  username: "",
  password: "",
  role: "ventas",
  isActive: true,
};

const INITIAL_EDIT_FORM = {
  id: "",
  name: "",
  username: "",
  password: "",
  role: "ventas",
  isActive: true,
};

export default function UserManagement() {
  const auth = getAuth();
  const currentRole = auth?.user?.role;
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (currentRole !== "admin") {
      setIsLoading(false);
      return;
    }

    loadUsers();
  }, [currentRole]);

  const selectedUser = useMemo(
    () => users.find((user) => (user._id || user.id) === editForm.id) || null,
    [users, editForm.id]
  );

  async function loadUsers() {
    try {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar la lista de usuarios");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreateChange(event) {
    const { name, value, type, checked } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleEditChange(event) {
    const { name, value, type, checked } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(user) {
    setEditForm({
      id: user._id || user.id,
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "ventas",
      isActive: user.isActive !== false,
    });
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditForm(INITIAL_EDIT_FORM);
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    try {
      setIsCreating(true);
      const response = await createUser(createForm);
      setUsers((current) => [response.user, ...current]);
      setCreateForm(INITIAL_CREATE_FORM);
      setSuccess("Usuario creado correctamente");
      setError("");
    } catch (submitError) {
      setError(submitError.message || "No se pudo crear el usuario");
      setSuccess("");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault();

    try {
      setIsUpdating(true);
      const response = await updateUser(editForm.id, {
        name: editForm.name,
        username: editForm.username,
        password: editForm.password,
        role: editForm.role,
        isActive: editForm.isActive,
      });

      setUsers((current) =>
        current.map((user) => ((user._id || user.id) === editForm.id ? response.user : user))
      );
      setEditForm((current) => ({ ...current, password: "" }));
      setSuccess("Usuario actualizado correctamente");
      setError("");
    } catch (submitError) {
      setError(submitError.message || "No se pudo actualizar el usuario");
      setSuccess("");
    } finally {
      setIsUpdating(false);
    }
  }

  if (currentRole !== "admin") {
    return (
      <section className="config-usersShell">
        <div className="config-usersHero">
          <div className="dashboard-kicker">Configuracion</div>
          <h1 className="dashboard-title">Usuarios</h1>
          <p className="dashboard-copy">Solo un administrador puede modificar usuarios desde esta seccion.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="config-usersShell">
      <div className="config-usersHero">
        <div className="dashboard-kicker">Configuracion</div>
        <h1 className="dashboard-title">Usuarios</h1>
        <p className="dashboard-copy">
          Desde aca podes crear usuarios nuevos, editar los existentes, cambiar roles y actualizar claves.
        </p>
      </div>

      <div className="config-usersGrid config-usersGrid--triple">
        <form className="config-usersCard" onSubmit={handleCreateSubmit}>
          <div className="config-usersCardTitle">Nuevo usuario</div>

          <label className="config-usersField">
            <span>Nombre</span>
            <input
              name="name"
              value={createForm.name}
              onChange={handleCreateChange}
              placeholder="Ej: Juan Perez"
              required
            />
          </label>

          <label className="config-usersField">
            <span>Usuario</span>
            <input
              name="username"
              value={createForm.username}
              onChange={handleCreateChange}
              placeholder="Ej: juan"
              required
            />
          </label>

          <label className="config-usersField">
            <span>Clave</span>
            <input
              type="password"
              name="password"
              value={createForm.password}
              onChange={handleCreateChange}
              placeholder="Clave inicial"
              required
            />
          </label>

          <label className="config-usersField">
            <span>Rol</span>
            <select name="role" value={createForm.role} onChange={handleCreateChange}>
              <option value="ventas">Ventas</option>
              <option value="taller">Taller</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="config-usersCheckbox">
            <input
              type="checkbox"
              name="isActive"
              checked={createForm.isActive}
              onChange={handleCreateChange}
            />
            <span>Usuario activo</span>
          </label>

          {error ? <div className="config-usersMessage error">{error}</div> : null}
          {success ? <div className="config-usersMessage success">{success}</div> : null}

          <button className="config-usersSubmit" type="submit" disabled={isCreating}>
            {isCreating ? "Guardando..." : "Crear usuario"}
          </button>
        </form>

        <div className="config-usersCard">
          <div className="config-usersCardTitle">Usuarios existentes</div>

          {isLoading ? <div className="config-usersEmpty">Cargando usuarios...</div> : null}

          {!isLoading && users.length === 0 ? (
            <div className="config-usersEmpty">Todavia no hay usuarios cargados.</div>
          ) : null}

          {!isLoading && users.length > 0 ? (
            <div className="config-usersList">
              {users.map((user) => {
                const userId = user._id || user.id;
                const isSelected = selectedUser && (selectedUser._id || selectedUser.id) === userId;

                return (
                  <article key={userId} className={`config-usersItem${isSelected ? " selected" : ""}`}>
                    <div>
                      <div className="config-usersName">{user.name}</div>
                      <div className="config-usersMeta">
                        @{user.username} · {user.role}
                      </div>
                    </div>

                    <div className="config-usersActions">
                      <span className={`config-usersBadge${user.isActive ? " active" : ""}`}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>
                      <button type="button" className="config-usersEditButton" onClick={() => startEdit(user)}>
                        Editar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>

        <form className="config-usersCard" onSubmit={handleEditSubmit}>
          <div className="config-usersCardTitle">Editar usuario</div>

          {!selectedUser ? (
            <div className="config-usersEmpty">Elegi un usuario de la lista para modificarlo.</div>
          ) : (
            <>
              <label className="config-usersField">
                <span>Nombre</span>
                <input name="name" value={editForm.name} onChange={handleEditChange} required />
              </label>

              <label className="config-usersField">
                <span>Usuario</span>
                <input name="username" value={editForm.username} onChange={handleEditChange} required />
              </label>

              <label className="config-usersField">
                <span>Nueva clave</span>
                <input
                  type="password"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditChange}
                  placeholder="Dejar vacio para no cambiarla"
                />
              </label>

              <label className="config-usersField">
                <span>Rol</span>
                <select name="role" value={editForm.role} onChange={handleEditChange}>
                  <option value="ventas">Ventas</option>
                  <option value="taller">Taller</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="config-usersCheckbox">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={editForm.isActive}
                  onChange={handleEditChange}
                />
                <span>Usuario activo</span>
              </label>

              <div className="config-usersEditRow">
                <button className="config-usersSubmit" type="submit" disabled={isUpdating}>
                  {isUpdating ? "Actualizando..." : "Guardar cambios"}
                </button>
                <button type="button" className="config-usersSecondaryButton" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
