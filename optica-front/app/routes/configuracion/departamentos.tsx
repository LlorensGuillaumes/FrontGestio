// app/routes/configuracion/departamentos.tsx
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchDepartamentos,
  fetchUsuariosDepartamento,
  crearDepartamento,
  actualizarDepartamento,
  eliminarDepartamento,
  asignarUsuarios,
  fetchUsuariosConDepartamentos,
  type Departamento,
  type UsuarioDepartamento,
  type UsuarioConDepartamentos,
} from "~/lib/departamentosRest";

export default function DepartamentosPage() {
  const { t } = useTranslation(["comunicacion", "common", "configuracion"]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioConDepartamentos[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [deptUsuarios, setDeptUsuarios] = useState<UsuarioDepartamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Departamento | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [selectedUsuarios, setSelectedUsuarios] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, users] = await Promise.all([
        fetchDepartamentos(false),
        fetchUsuariosConDepartamentos(),
      ]);
      setDepartamentos(depts);
      setUsuarios(users);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch users of selected department
  useEffect(() => {
    if (selectedDept) {
      fetchUsuariosDepartamento(selectedDept)
        .then(setDeptUsuarios)
        .catch(console.error);
    } else {
      setDeptUsuarios([]);
    }
  }, [selectedDept]);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setFormNombre("");
    setFormDescripcion("");
    setShowModal(true);
    setError("");
  };

  const handleOpenEdit = (dept: Departamento) => {
    setEditingDept(dept);
    setFormNombre(dept.nombre);
    setFormDescripcion(dept.descripcion || "");
    setShowModal(true);
    setError("");
  };

  const handleSave = async () => {
    if (!formNombre.trim()) {
      setError(t("comunicacion:departments.errorNoName", "El nombre es obligatorio"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingDept) {
        await actualizarDepartamento(editingDept.id, {
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim() || undefined,
        });
      } else {
        await crearDepartamento(formNombre.trim(), formDescripcion.trim() || undefined);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Error saving department:", err);
      setError(t("comunicacion:departments.errorSaving", "Error al guardar"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (dept: Departamento) => {
    try {
      await actualizarDepartamento(dept.id, { activo: !dept.activo });
      fetchData();
    } catch (err) {
      console.error("Error toggling department:", err);
    }
  };

  const handleDelete = async (dept: Departamento) => {
    if (!confirm(t("comunicacion:departments.confirmDelete", "¿Eliminar este departamento?"))) return;

    try {
      await eliminarDepartamento(dept.id);
      if (selectedDept === dept.id) setSelectedDept(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting department:", err);
    }
  };

  const handleOpenAsignar = () => {
    if (!selectedDept) return;
    setSelectedUsuarios(deptUsuarios.map((u) => u.idUsuario));
    setShowAsignarModal(true);
    setError("");
  };

  const handleAsignar = async () => {
    if (!selectedDept) return;

    setSaving(true);
    setError("");

    try {
      await asignarUsuarios(selectedDept, selectedUsuarios);
      setShowAsignarModal(false);
      fetchData();
      const updatedUsers = await fetchUsuariosDepartamento(selectedDept);
      setDeptUsuarios(updatedUsers);
    } catch (err) {
      console.error("Error assigning users:", err);
      setError(t("comunicacion:departments.errorAssigning", "Error al asignar usuarios"));
    } finally {
      setSaving(false);
    }
  };

  const toggleUsuario = (id: number) => {
    setSelectedUsuarios((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("comunicacion:departments.title", "Departamentos")}
          </h1>
          <p className="text-slate-500 mt-1">
            {t("comunicacion:departments.subtitle", "Gestiona los departamentos y asigna usuarios")}
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t("comunicacion:departments.create", "Nuevo departamento")}
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-slate-800">
              {t("comunicacion:departments.list", "Lista de departamentos")}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : departamentos.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>{t("comunicacion:departments.empty", "No hay departamentos")}</p>
              </div>
            ) : (
              departamentos.map((dept) => (
                <div
                  key={dept.id}
                  className={`px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedDept === dept.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedDept(dept.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{dept.nombre}</p>
                        {!dept.activo && (
                          <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded">
                            {t("common:inactive", "Inactivo")}
                          </span>
                        )}
                      </div>
                      {dept.descripcion && (
                        <p className="text-sm text-slate-500 mt-0.5">{dept.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(dept); }}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        title={t("common:edit", "Editar")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(dept); }}
                        className={`p-2 rounded-lg ${dept.activo ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:bg-slate-100"}`}
                        title={dept.activo ? t("common:deactivate", "Desactivar") : t("common:activate", "Activar")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={dept.activo ? "M5 13l4 4L19 7" : "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"} />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(dept); }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title={t("common:delete", "Eliminar")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Users panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              {t("comunicacion:departments.users", "Usuarios")}
            </h2>
            {selectedDept && (
              <button
                onClick={handleOpenAsignar}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {t("comunicacion:departments.assignUsers", "Asignar")}
              </button>
            )}
          </div>
          <div className="p-4">
            {!selectedDept ? (
              <p className="text-sm text-slate-500 text-center py-4">
                {t("comunicacion:departments.selectToSeeUsers", "Selecciona un departamento")}
              </p>
            ) : deptUsuarios.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                {t("comunicacion:departments.noUsers", "Sin usuarios asignados")}
              </p>
            ) : (
              <div className="space-y-2">
                {deptUsuarios.map((u) => (
                  <div key={u.idUsuario} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-medium">
                      {(u.nombre || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{u.nombre || u.username}</p>
                      {u.nombre && <p className="text-xs text-slate-500">@{u.username}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-slate-800">
                {editingDept
                  ? t("comunicacion:departments.edit", "Editar departamento")
                  : t("comunicacion:departments.create", "Nuevo departamento")}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("comunicacion:departments.name", "Nombre")} *
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("comunicacion:departments.namePlaceholder", "Nombre del departamento")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("comunicacion:departments.description", "Descripción")}
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={t("comunicacion:departments.descriptionPlaceholder", "Descripción opcional")}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                {t("common:cancel", "Cancelar")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-slate-300"
              >
                {saving ? t("common:saving", "Guardando...") : t("common:save", "Guardar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAsignarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-slate-800">
                {t("comunicacion:departments.assignUsers", "Asignar usuarios")}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {usuarios.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleUsuario(u.id)}
                  className={`w-full px-6 py-3 text-left flex items-center gap-3 hover:bg-slate-50 border-b border-gray-100 ${
                    selectedUsuarios.includes(u.id) ? "bg-blue-50" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedUsuarios.includes(u.id)
                        ? "bg-blue-600 border-blue-600"
                        : "border-slate-300"
                    }`}
                  >
                    {selectedUsuarios.includes(u.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{u.nombre || u.username}</p>
                    {u.nombre && <p className="text-xs text-slate-500">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setShowAsignarModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                {t("common:cancel", "Cancelar")}
              </button>
              <button
                onClick={handleAsignar}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-slate-300"
              >
                {saving ? t("common:saving", "Guardando...") : t("common:save", "Guardar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
