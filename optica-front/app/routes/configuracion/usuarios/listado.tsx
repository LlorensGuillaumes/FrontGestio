// app/routes/configuracion/usuarios/listado.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";
import { MasterOnly } from "~/components/PermissionGate";
import { PasswordInput } from "~/components/PasswordInput";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserPermissions,
  setUserPermissions,
  resetUserPassword,
  getAvailableDatabases,
  type Usuario,
  type Menu,
  type MenuPermission,
  type CreateUserInput,
  type PermissionInput,
  type BaseDatos,
  type DatabaseAssignment,
} from "~/lib/authRest";

export default function UsuariosListado() {
  const { t } = useTranslation(["users", "configuracion", "common"]);
  const { isAdmin, isMaster } = useAuth();

  const [users, setUsers] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDatabase, setFilterDatabase] = useState<string>(""); // db_name o "" para todos
  const [allDatabases, setAllDatabases] = useState<BaseDatos[]>([]);

  // Estados para modales
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  // Estado para formulario de usuario
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    nombre: "",
    email: "",
  });

  // Estado para bases de datos
  const [availableDatabases, setAvailableDatabases] = useState<BaseDatos[]>([]);
  const [selectedDatabases, setSelectedDatabases] = useState<DatabaseAssignment[]>([]);

  // Estado para permisos
  const [menus, setMenus] = useState<Menu[]>([]);
  const [permissions, setPermissions] = useState<PermissionInput[]>([]);

  // Estado para reset password
  const [newPassword, setNewPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Cargar usuarios y bases de datos
  useEffect(() => {
    loadUsers();
    if (isMaster) {
      loadAllDatabases();
    }
  }, [isMaster]);

  const loadAllDatabases = async () => {
    try {
      const dbs = await getAvailableDatabases();
      setAllDatabases(dbs);
    } catch (err) {
      console.error("Error al cargar bases de datos:", err);
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    // Filtro por texto
    const matchesSearch =
      searchTerm === "" ||
      user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por base de datos (solo para Master)
    const matchesDatabase =
      filterDatabase === "" ||
      (user as unknown as { databases?: Array<{ db_name: string }> }).databases?.some(
        (db) => db.db_name === filterDatabase
      );

    return matchesSearch && matchesDatabase;
  });

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(t("configuracion:usuarios.errors.loading"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir modal de crear usuario
  const handleCreate = async () => {
    setSelectedUser(null);
    setUserForm({
      username: "",
      password: "",
      nombre: "",
      email: "",
    });
    setSelectedDatabases([]);

    // Cargar bases de datos disponibles
    try {
      const dbs = await getAvailableDatabases();
      setAvailableDatabases(dbs);
      // Si solo hay una, seleccionarla por defecto
      if (dbs.length === 1) {
        setSelectedDatabases([{ id: dbs[0].id, rol: "user" }]);
      }
    } catch (err) {
      console.error("Error al cargar bases de datos:", err);
    }

    setShowUserModal(true);
  };

  // Abrir modal de editar usuario
  const handleEdit = (user: Usuario) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username || "",
      password: "",
      nombre: user.nombre || "",
      email: user.email || "",
    });
    setShowUserModal(true);
  };

  // Funciones para manejar selección de bases de datos
  const toggleDatabase = (dbId: number) => {
    setSelectedDatabases((prev) => {
      const exists = prev.find((d) => d.id === dbId);
      if (exists) {
        return prev.filter((d) => d.id !== dbId);
      } else {
        return [...prev, { id: dbId, rol: "user" as const }];
      }
    });
  };

  const setDatabaseRole = (dbId: number, rol: "admin" | "user") => {
    setSelectedDatabases((prev) =>
      prev.map((d) => (d.id === dbId ? { ...d, rol } : d))
    );
  };

  // Guardar usuario
  const handleSaveUser = async () => {
    setIsSaving(true);
    try {
      if (selectedUser) {
        // Editar
        await updateUser(selectedUser.id, {
          username: userForm.username,
          nombre: userForm.nombre,
          email: userForm.email || undefined,
        });
      } else {
        // Crear - validar que haya al menos una base de datos seleccionada
        if (selectedDatabases.length === 0) {
          setError(t("configuracion:usuarios.errors.selectDatabase"));
          setIsSaving(false);
          return;
        }
        await createUser({
          ...userForm,
          databases: selectedDatabases,
        });
      }
      setShowUserModal(false);
      loadUsers();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : t("configuracion:usuarios.errors.saving");
      setError(message || t("configuracion:usuarios.errors.saving"));
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar usuario
  const handleDelete = async (user: Usuario) => {
    if (!confirm(t("configuracion:usuarios.confirmDelete", { name: user.nombre }))) {
      return;
    }
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch (err) {
      setError(t("configuracion:usuarios.errors.deleting"));
      console.error(err);
    }
  };

  // Abrir modal de permisos
  const handleOpenPermissions = async (user: Usuario) => {
    setSelectedUser(user);
    try {
      const { menus: menuList, permisos } = await getUserPermissions(user.id);
      setMenus(menuList);

      // Convertir permisos existentes al formato del formulario
      const permInputs: PermissionInput[] = menuList.map((menu) => {
        const existing = permisos.find((p) => p.menuId === menu.id);
        return {
          idMenu: menu.id,
          puedeVer: existing?.puedeVer ?? false,
          puedeCrear: existing?.puedeCrear ?? false,
          puedeEditar: existing?.puedeEditar ?? false,
          puedeEliminar: existing?.puedeEliminar ?? false,
        };
      });
      setPermissions(permInputs);
      setShowPermissionsModal(true);
    } catch (err) {
      setError(t("configuracion:usuarios.errors.loadingPermissions"));
      console.error(err);
    }
  };

  // Guardar permisos
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await setUserPermissions(selectedUser.id, permissions);
      setShowPermissionsModal(false);
    } catch (err) {
      setError(t("configuracion:usuarios.errors.savingPermissions"));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Actualizar permiso individual
  const updatePermission = (menuId: number, field: keyof PermissionInput, value: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.idMenu === menuId ? { ...p, [field]: value } : p))
    );
  };

  // Toggle todos los permisos de un menu
  const toggleAllPermissions = (menuId: number, value: boolean) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.idMenu === menuId
          ? { ...p, puedeVer: value, puedeCrear: value, puedeEditar: value, puedeEliminar: value }
          : p
      )
    );
  };

  // Abrir modal de reset password
  const handleOpenResetPassword = (user: Usuario) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetPasswordModal(true);
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    setIsSaving(true);
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      setShowResetPasswordModal(false);
    } catch (err) {
      setError(t("configuracion:usuarios.errors.resettingPassword"));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Agrupar menus por grupo
  const groupedMenus = menus.reduce((acc, menu) => {
    if (!acc[menu.grupo]) {
      acc[menu.grupo] = [];
    }
    acc[menu.grupo].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">{t("configuracion:usuarios.noAccess")}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("title", "Gestion de Usuarios")}</h1>
          <p className="text-gray-500">{t("subtitle", "Administra los usuarios y sus permisos")}</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t("create", "Nuevo Usuario")}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t("searchPlaceholder", "Buscar por nombre, usuario o email...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {isMaster && allDatabases.length > 0 && (
          <div className="min-w-[200px]">
            <select
              value={filterDatabase}
              onChange={(e) => setFilterDatabase(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t("allDatabases", "Todas las bases de datos")}</option>
              {allDatabases.map((db) => (
                <option key={db.id} value={db.db_name}>
                  {db.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        /* Tabla de usuarios */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("user", "Usuario")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("name", "Nombre")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("email", "Email")}
                </th>
                {isMaster && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("databases", "Bases de datos")}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("role", "Rol")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("status", "Estado")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("actions", "Acciones")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {(user.nombre || user.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="ml-3 font-medium text-gray-900">{user.username || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.nombre || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email || "-"}</td>
                  {isMaster && (
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(user as unknown as { databases?: Array<{ nombre: string; rol: string }> }).databases?.map((db, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 text-xs rounded ${
                              db.rol === "admin"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                            title={db.rol}
                          >
                            {db.nombre}
                          </span>
                        )) || <span className="text-gray-400 text-xs">-</span>}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.rol === "admin"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {user.rol === "admin" ? t("configuracion:usuarios.roleAdmin") : t("configuracion:usuarios.roleUser")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.activo ? t("configuracion:usuarios.statusActive") : t("configuracion:usuarios.statusInactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t("edit", "Editar")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenPermissions(user)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={t("permissions", "Permisos")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenResetPassword(user)}
                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={t("resetPassword", "Restablecer contrasena")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t("delete", "Eliminar")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={isMaster ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterDatabase
                      ? t("noResults", "No se encontraron usuarios con los filtros aplicados")
                      : t("noUsers", "No hay usuarios registrados")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedUser ? t("editUser", "Editar Usuario") : t("createUser", "Nuevo Usuario")}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("username", "Usuario")} *
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {!selectedUser && (
                <PasswordInput
                  id="new-user-password"
                  label={`${t("password", "Contrasena")} *`}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("name", "Nombre")} *
                </label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("email", "Email")}
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {!selectedUser && availableDatabases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("databases", "Bases de datos")} *
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {availableDatabases.map((db) => {
                      const isSelected = selectedDatabases.some((d) => d.id === db.id);
                      const selectedDb = selectedDatabases.find((d) => d.id === db.id);
                      return (
                        <div
                          key={db.id}
                          className={`px-3 py-2 flex items-center justify-between border-b border-gray-100 last:border-b-0 ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDatabase(db.id)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm text-gray-700">{db.nombre}</span>
                            <span className="text-xs text-gray-400">({db.db_name})</span>
                          </label>
                          {isSelected && (
                            <select
                              value={selectedDb?.rol || "user"}
                              onChange={(e) => setDatabaseRole(db.id, e.target.value as "admin" | "user")}
                              className="text-xs px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="user">{t("configuracion:usuarios.roleUser")}</option>
                              <option value="admin">{t("configuracion:usuarios.roleAdmin")}</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedDatabases.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      {t("selectAtLeastOne", "Selecciona al menos una base de datos")}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {isSaving ? t("saving", "Guardando...") : t("save", "Guardar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Permisos */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {t("permissionsFor", "Permisos de")} {selectedUser.nombre}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {Object.entries(groupedMenus).map(([grupo, menuList]) => {
                // Verificar si el usuario tiene algún permiso en este grupo
                const hasAnyPermissionInGroup = menuList.some(menu => {
                  const perm = permissions.find(p => p.idMenu === menu.id);
                  return perm && (perm.puedeVer || perm.puedeCrear || perm.puedeEditar || perm.puedeEliminar);
                });

                // Si TODOS los menus son solo_master Y el usuario NO tiene permisos → "No contratado"
                const isGroupNoContratado = !isMaster &&
                  menuList.every(m => m.solo_master === true) &&
                  !hasAnyPermissionInGroup;

                // Si el grupo entero es "no contratado", mostrar solo el título colapsado
                if (isGroupNoContratado) {
                  return (
                    <div key={grupo} className="mb-6">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border border-gray-200 opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600 uppercase">{grupo}</p>
                            <p className="text-xs text-gray-400">{t("configuracion:usuarios.contactToActivate")}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-xs font-medium bg-gray-300 text-gray-600 rounded-full">
                          {t("configuracion:usuarios.notContracted")}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Grupo normal con items
                return (
                  <div key={grupo} className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {grupo}
                    </h3>
                    <div className="space-y-2">
                      {menuList.map((menu) => {
                        const perm = permissions.find((p) => p.idMenu === menu.id);
                        if (!perm) return null;

                        const allChecked = perm.puedeVer && perm.puedeCrear && perm.puedeEditar && perm.puedeEliminar;

                        return (
                          <div
                            key={menu.id}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1 min-w-[200px]">
                              <p className="font-medium text-gray-800">{menu.nombre_es}</p>
                              <p className="text-xs text-gray-500">{menu.codigo}</p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) => toggleAllPermissions(menu.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-600">{t("configuracion:usuarios.permissions.all")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perm.puedeVer}
                                onChange={(e) => updatePermission(menu.id, "puedeVer", e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-600">{t("configuracion:usuarios.permissions.view")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perm.puedeCrear}
                                onChange={(e) => updatePermission(menu.id, "puedeCrear", e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-600">{t("configuracion:usuarios.permissions.create")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perm.puedeEditar}
                                onChange={(e) => updatePermission(menu.id, "puedeEditar", e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-600">{t("configuracion:usuarios.permissions.edit")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perm.puedeEliminar}
                                onChange={(e) => updatePermission(menu.id, "puedeEliminar", e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-600">{t("configuracion:usuarios.permissions.delete")}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {isSaving ? t("saving", "Guardando...") : t("savePermissions", "Guardar Permisos")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reset Password */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {t("resetPasswordFor", "Restablecer contrasena de")} {selectedUser.nombre}
              </h2>
            </div>
            <div className="p-6">
              <PasswordInput
                id="reset-password"
                label={`${t("newPassword", "Nueva contrasena")} *`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("minChars", "Minimo 6 caracteres")}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isSaving || newPassword.length < 6}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-amber-400 transition-colors"
              >
                {isSaving ? t("resetting", "Restableciendo...") : t("reset", "Restablecer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
