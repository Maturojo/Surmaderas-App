import { useEffect, useMemo, useState } from "react";
import { getAuth } from "../services/auth";
import { createUser, getUsers, updateUser } from "../services/users";

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "calendario", label: "Calendario" },
  { key: "estadisticas", label: "Estadisticas" },
  {
    key: "pedidos",
    label: "Pedidos",
    children: [
      { label: "Generador de pedidos", path: "/notas-pedido" },
      { label: "Pedidos en caja", path: "/notas-pedido/listado" },
      { label: "Pedidos para pasar", path: "/notas-pedido/guardadas" },
      { label: "Pedidos en taller", path: "/notas-pedido/pendientes" },
      { label: "Pedidos en depositos", path: "/notas-pedido/deposito" },
    ],
  },
  {
    key: "presupuestos",
    label: "Presupuestos",
    children: [
      { label: "Generar presupuesto", path: "/presupuestos/generar" },
      { label: "Cargar", path: "/presupuestos/cargar" },
      { label: "Guardadas", path: "/presupuestos/guardadas" },
      { label: "Proveedores especiales", path: "/presupuestos/proveedores" },
    ],
  },
  { key: "marcos", label: "Cotizador de marcos" },
  { key: "cotizador-cortes", label: "Cotizador de cortes" },
  { key: "productos", label: "Productos" },
  { key: "placas", label: "Placas" },
  { key: "encuestas", label: "Encuestas" },
  {
    key: "ventas",
    label: "Ventas",
    children: [
      { label: "Ventas del mes", path: "/ventas/lista" },
      { label: "Nueva venta", path: "/ventas/nueva" },
      { label: "Estadisticas", path: "/ventas/estadisticas" },
      { label: "Objetivos y configuracion", path: "/ventas/objetivos" },
      { label: "Transferencias", path: "/ventas/transferencias" },
    ],
  },
  {
    key: "proveedores",
    label: "Proveedores",
    children: [
      { label: "Panel de proveedores", path: "/proveedores" },
      { label: "Pedidos", path: "/pedidos-proveedor" },
    ],
  },
  { key: "generador-3d", label: "Generador 3D" },
  {
    key: "negocio-online",
    label: "Negocio Online",
    children: [
      { label: "WhatsApp - Control manual", path: "/whatsapp/control" },
      { label: "WhatsApp - Conversaciones", path: "/whatsapp" },
      { label: "WhatsApp - Presupuestos", path: "/whatsapp/presupuestos" },
      { label: "WhatsApp - Broadcast", path: "/whatsapp/broadcast" },
      { label: "WhatsApp - FAQs", path: "/whatsapp/faqs" },
      { label: "WhatsApp - Respuestas rapidas", path: "/whatsapp/quick-replies" },
      { label: "WhatsApp - Estadisticas", path: "/whatsapp/stats" },
      { label: "WhatsApp - Configuracion", path: "/whatsapp/settings" },
      { label: "Mercado Libre - Dashboard", path: "/mercado-libre" },
      { label: "Mercado Libre - Productos", path: "/mercado-libre/productos" },
      { label: "Mercado Libre - Publicaciones", path: "/mercado-libre/publicaciones" },
      { label: "Mercado Libre - Pedidos", path: "/mercado-libre/pedidos" },
      { label: "Mercado Libre - Preguntas", path: "/mercado-libre/preguntas" },
      { label: "Mercado Libre - Pendientes", path: "/mercado-libre/pendientes" },
      { label: "Mercado Libre - Precios", path: "/mercado-libre/precios" },
    ],
  },
];

const INITIAL_CREATE_FORM = {
  name: "",
  username: "",
  password: "",
  role: "ventas",
  isActive: true,
  allowedModules: [],
  allowedSubmodules: [],
};

const INITIAL_EDIT_FORM = {
  id: "",
  name: "",
  username: "",
  password: "",
  role: "ventas",
  isActive: true,
  allowedModules: [],
  allowedSubmodules: [],
};

const ROLES = [
  { value: "ventas", label: "Ventas" },
  { value: "caja", label: "Caja" },
  { value: "taller", label: "Taller" },
  { value: "admin", label: "Admin" },
];

function normalizeUserId(user) {
  return user?._id || user?.id || "";
}

function getRoleLabel(role) {
  return ROLES.find((item) => item.value === role)?.label || role || "-";
}

function getModuleChildren(key) {
  return ALL_MODULES.find((item) => item.key === key)?.children || [];
}

function cleanSubmodulesForModules(submodules, modules) {
  const allowedPaths = ALL_MODULES
    .filter((mod) => modules.includes(mod.key))
    .flatMap((mod) => mod.children || [])
    .map((child) => child.path);
  return submodules.filter((path) => allowedPaths.includes(path));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
}

function validateUserForm(form, { requirePassword = false } = {}) {
  if (!String(form.name || "").trim()) return "Cargá el nombre del usuario";
  if (!String(form.username || "").trim()) return "Cargá el usuario de acceso";
  if (!ROLES.some((item) => item.value === form.role)) return "Seleccioná un rol válido";
  if (requirePassword && !String(form.password || "").trim()) return "Cargá una clave inicial";
  if (String(form.password || "").trim() && String(form.password).length < 6) {
    return "La clave debe tener al menos 6 caracteres";
  }
  return "";
}

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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

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

  const stats = useMemo(() => {
    const active = users.filter((user) => user.isActive !== false).length;
    const inactive = users.length - active;
    const admins = users.filter((user) => user.role === "admin").length;
    return { total: users.length, active, inactive, admins };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        String(user.name || "").toLowerCase().includes(normalizedQuery) ||
        String(user.username || "").toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "todos" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activos" ? user.isActive !== false : user.isActive === false);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

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

  function toggleCreateModule(key) {
    setCreateForm((current) => {
      const has = current.allowedModules.includes(key);
      const nextModules = has
        ? current.allowedModules.filter((k) => k !== key)
        : [...current.allowedModules, key];
      return {
        ...current,
        allowedModules: nextModules,
        allowedSubmodules: cleanSubmodulesForModules(current.allowedSubmodules, nextModules),
      };
    });
  }

  function toggleEditModule(key) {
    setEditForm((current) => {
      const has = current.allowedModules.includes(key);
      const nextModules = has
        ? current.allowedModules.filter((k) => k !== key)
        : [...current.allowedModules, key];
      return {
        ...current,
        allowedModules: nextModules,
        allowedSubmodules: cleanSubmodulesForModules(current.allowedSubmodules, nextModules),
      };
    });
  }

  function toggleCreateSubmodule(moduleKey, path) {
    setCreateForm((current) => {
      const allowedModules = current.allowedModules.includes(moduleKey)
        ? current.allowedModules
        : [...current.allowedModules, moduleKey];
      const has = current.allowedSubmodules.includes(path);
      return {
        ...current,
        allowedModules,
        allowedSubmodules: has
          ? current.allowedSubmodules.filter((item) => item !== path)
          : [...current.allowedSubmodules, path],
      };
    });
  }

  function toggleEditSubmodule(moduleKey, path) {
    setEditForm((current) => {
      const allowedModules = current.allowedModules.includes(moduleKey)
        ? current.allowedModules
        : [...current.allowedModules, moduleKey];
      const has = current.allowedSubmodules.includes(path);
      return {
        ...current,
        allowedModules,
        allowedSubmodules: has
          ? current.allowedSubmodules.filter((item) => item !== path)
          : [...current.allowedSubmodules, path],
      };
    });
  }

  function startEdit(user) {
    setEditForm({
      id: user._id || user.id,
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "ventas",
      isActive: user.isActive !== false,
      allowedModules: user.allowedModules || [],
      allowedSubmodules: user.allowedSubmodules || [],
    });
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditForm(INITIAL_EDIT_FORM);
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const validationError = validateUserForm(createForm, { requirePassword: true });
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    try {
      setIsCreating(true);
      const response = await createUser({
        ...createForm,
        allowedModules: createForm.role === "admin" ? [] : createForm.allowedModules,
        allowedSubmodules: createForm.role === "admin" ? [] : createForm.allowedSubmodules,
      });
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
    const validationError = validateUserForm(editForm);
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await updateUser(editForm.id, {
        name: editForm.name,
        username: editForm.username,
        password: editForm.password,
        role: editForm.role,
        isActive: editForm.isActive,
        allowedModules: editForm.role === "admin" ? [] : editForm.allowedModules,
        allowedSubmodules: editForm.role === "admin" ? [] : editForm.allowedSubmodules,
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

  async function toggleUserActive(user) {
    const userId = normalizeUserId(user);
    if (!userId) return;

    const nextIsActive = user.isActive === false;
    try {
      setIsUpdating(true);
      const response = await updateUser(userId, {
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: nextIsActive,
        allowedModules: user.allowedModules || [],
        allowedSubmodules: user.allowedSubmodules || [],
      });

      setUsers((current) =>
        current.map((item) => (normalizeUserId(item) === userId ? response.user : item))
      );
      if (editForm.id === userId) {
        setEditForm((current) => ({ ...current, isActive: response.user.isActive }));
      }
      setSuccess(nextIsActive ? "Usuario activado correctamente" : "Usuario desactivado correctamente");
      setError("");
    } catch (toggleError) {
      setError(toggleError.message || "No se pudo cambiar el estado del usuario");
      setSuccess("");
    } finally {
      setIsUpdating(false);
    }
  }

  function renderModulePermissions(form, { onToggleModule, onToggleSubmodule, onReset }) {
    return (
      <div className="config-usersModules">
        <div className="config-usersModulesTitle">
          Modulos visibles
          {form.allowedModules.length === 0 ? (
            <span className="config-usersModulesHint"> (predeterminados del rol)</span>
          ) : null}
        </div>
        <div className="config-usersModulesGrid">
          {ALL_MODULES.map((mod) => {
            const isModuleChecked = form.allowedModules.includes(mod.key);
            const children = getModuleChildren(mod.key);

            return (
              <div key={mod.key} className="config-usersModuleBlock">
                <label className="config-usersModuleItem">
                  <input
                    type="checkbox"
                    checked={isModuleChecked}
                    onChange={() => onToggleModule(mod.key)}
                  />
                  <span>{mod.label}</span>
                </label>

                {isModuleChecked && children.length > 0 ? (
                  <div className="config-usersSubmodules">
                    <div className="config-usersSubmodulesHint">
                      Si no elegis ninguno, ve todo el modulo.
                    </div>
                    {children.map((child) => (
                      <label key={child.path} className="config-usersSubmoduleItem">
                        <input
                          type="checkbox"
                          checked={form.allowedSubmodules.includes(child.path)}
                          onChange={() => onToggleSubmodule(mod.key, child.path)}
                        />
                        <span>{child.label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {form.allowedModules.length > 0 || form.allowedSubmodules.length > 0 ? (
          <button type="button" className="config-usersSecondaryButton" onClick={onReset}>
            Resetear a predeterminados del rol
          </button>
        ) : null}
      </div>
    );
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
          Desde aca podes crear usuarios nuevos, editar accesos, cambiar roles, actualizar claves y pausar usuarios.
        </p>
      </div>

      <div className="config-usersStats">
        <div className="config-usersStat">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="config-usersStat">
          <span>Activos</span>
          <strong>{stats.active}</strong>
        </div>
        <div className="config-usersStat">
          <span>Inactivos</span>
          <strong>{stats.inactive}</strong>
        </div>
        <div className="config-usersStat">
          <span>Admins</span>
          <strong>{stats.admins}</strong>
        </div>
      </div>

      <div className="config-usersGrid config-usersGrid--triple">
        <form className="config-usersCard" onSubmit={handleCreateSubmit}>
          <div className="config-usersCardHead">
            <div className="config-usersCardTitle">Nuevo usuario</div>
            <p>Alta rapida con rol y permisos iniciales.</p>
          </div>

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
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          {createForm.role !== "admin" ? (
            renderModulePermissions(createForm, {
              onToggleModule: toggleCreateModule,
              onToggleSubmodule: toggleCreateSubmodule,
              onReset: () => setCreateForm((f) => ({ ...f, allowedModules: [], allowedSubmodules: [] })),
            })
          ) : null}

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
          <div className="config-usersCardHead">
            <div className="config-usersCardTitle">Usuarios existentes</div>
            <p>Busca, filtra y selecciona un usuario para editarlo.</p>
          </div>

          <div className="config-usersToolbar">
            <label className="config-usersSearch">
              <span>Buscar</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre o usuario"
              />
            </label>

            <div className="config-usersFilters">
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="todos">Todos los roles</option>
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </div>
          </div>

          {isLoading ? <div className="config-usersEmpty">Cargando usuarios...</div> : null}

          {!isLoading && users.length === 0 ? (
            <div className="config-usersEmpty">Todavia no hay usuarios cargados.</div>
          ) : null}

          {!isLoading && users.length > 0 && filteredUsers.length === 0 ? (
            <div className="config-usersEmpty">No hay usuarios que coincidan con los filtros.</div>
          ) : null}

          {!isLoading && filteredUsers.length > 0 ? (
            <div className="config-usersList">
              {filteredUsers.map((user) => {
                const userId = normalizeUserId(user);
                const isSelected = selectedUser && normalizeUserId(selectedUser) === userId;

                return (
                  <article key={userId} className={`config-usersItem${isSelected ? " selected" : ""}`}>
                    <div>
                      <div className="config-usersName">{user.name}</div>
                      <div className="config-usersMeta">
                        @{user.username} · {getRoleLabel(user.role)} · Alta {formatDate(user.createdAt)}
                      </div>
                    </div>

                    <div className="config-usersActions">
                      <span className={`config-usersBadge${user.isActive !== false ? " active" : ""}`}>
                        {user.isActive !== false ? "Activo" : "Inactivo"}
                      </span>
                      <button type="button" className="config-usersEditButton" onClick={() => startEdit(user)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="config-usersEditButton"
                        onClick={() => toggleUserActive(user)}
                        disabled={isUpdating}
                      >
                        {user.isActive === false ? "Activar" : "Pausar"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>

        <form className="config-usersCard" onSubmit={handleEditSubmit}>
          <div className="config-usersCardHead">
            <div className="config-usersCardTitle">Editar usuario</div>
            <p>{selectedUser ? `Editando a ${selectedUser.name}` : "Selecciona un usuario de la lista."}</p>
          </div>

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
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              {editForm.role !== "admin" ? (
                renderModulePermissions(editForm, {
                  onToggleModule: toggleEditModule,
                  onToggleSubmodule: toggleEditSubmodule,
                  onReset: () => setEditForm((f) => ({ ...f, allowedModules: [], allowedSubmodules: [] })),
                })
              ) : null}

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
