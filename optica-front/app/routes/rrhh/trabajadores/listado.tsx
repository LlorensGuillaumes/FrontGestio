import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  fetchTrabajadores,
  createTrabajador,
  updateTrabajador,
  type Trabajador,
} from "~/lib/trabajadoresRest";
import { fetchConvenios, type Convenio } from "~/lib/conveniosRest";

type ModalMode = "new" | "edit" | null;

export default function TrabajadoresListado() {
  const { t } = useTranslation("trabajadores");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Nombre: "",
    Apellidos: "",
    DNI: "",
    Email: "",
    Telefono: "",
    Puesto: "",
    IdConvenio: "" as string | number,
    FechaAlta: new Date().toISOString().split("T")[0],
    Observaciones: "",
    Activo: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trabajadoresData, conveniosData] = await Promise.all([
        fetchTrabajadores(!showInactivos),
        fetchConvenios(true),
      ]);
      setTrabajadores(trabajadoresData);
      setConvenios(conveniosData);
    } catch (e: any) {
      setError(e.message ?? t("errorLoading", "Error cargando trabajadores"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactivos]);

  const openNewModal = () => {
    setFormData({
      Nombre: "",
      Apellidos: "",
      DNI: "",
      Email: "",
      Telefono: "",
      Puesto: "",
      IdConvenio: "",
      FechaAlta: new Date().toISOString().split("T")[0],
      Observaciones: "",
      Activo: 1,
    });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (t: Trabajador) => {
    setFormData({
      Nombre: t.Nombre,
      Apellidos: t.Apellidos,
      DNI: t.DNI ?? "",
      Email: t.Email ?? "",
      Telefono: t.Telefono ?? "",
      Puesto: t.Puesto ?? "",
      IdConvenio: t.IdConvenio ?? "",
      FechaAlta: t.FechaAlta?.split("T")[0] ?? "",
      Observaciones: t.Observaciones ?? "",
      Activo: t.Activo,
    });
    setEditingId(t.IdTrabajador);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.Nombre.trim() || !formData.Apellidos.trim()) {
      setFormError(t("nameRequired", "Nombre y Apellidos son obligatorios"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        ...formData,
        IdConvenio: formData.IdConvenio ? Number(formData.IdConvenio) : null,
      };

      if (modalMode === "new") {
        await createTrabajador(payload);
      } else if (modalMode === "edit" && editingId) {
        await updateTrabajador(editingId, payload);
      }
      closeModal();
      loadData();
    } catch (e: any) {
      setFormError(e.message ?? t("errorSaving", "Error guardando trabajador"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    const confirmed = window.confirm(t("confirmDeactivate", "¿Desactivar este trabajador?"));
    if (!confirmed) return;

    try {
      await updateTrabajador(id, { Activo: 0 });
      loadData();
    } catch (e: any) {
      alert(e.message ?? t("errorDeactivating", "Error al desactivar"));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title", "Trabajadores")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("loading", "Cargando...") : `${trabajadores.length} ${t("workers", "trabajadores")}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactivos}
              onChange={(e) => setShowInactivos(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("showInactive", "Mostrar inactivos")}
          </label>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + {t("newWorker", "Nuevo trabajador")}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("name", "Nombre")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("position", "Puesto")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("agreement", "Convenio")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("startDate", "Alta")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("status", "Estado")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("actions", "Acciones")}</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  {t("noWorkers", "No hay trabajadores registrados.")}
                </td>
              </tr>
            )}
            {trabajadores.map((tr) => (
              <tr key={tr.IdTrabajador} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{tr.Nombre} {tr.Apellidos}</div>
                  <div className="text-sm text-slate-500">{tr.Email ?? tr.DNI ?? ""}</div>
                </td>
                <td className="p-4 text-slate-600">{tr.Puesto ?? "—"}</td>
                <td className="p-4 text-slate-600">{tr.NombreConvenio ?? "—"}</td>
                <td className="p-4 text-slate-600">
                  {tr.FechaAlta ? new Date(tr.FechaAlta).toLocaleDateString("es-ES") : "—"}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tr.Activo
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tr.Activo ? t("active", "Activo") : t("inactive", "Inactivo")}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/rrhh/trabajadores/${tr.IdTrabajador}/horario`)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("schedule", "Horario")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/rrhh/trabajadores/${tr.IdTrabajador}/ausencias`)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("absences", "Ausencias")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(tr)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("edit", "Editar")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {tr.Activo ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(tr.IdTrabajador)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title={t("deactivate", "Desactivar")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? t("newWorker", "Nuevo trabajador") : t("editWorker", "Editar trabajador")}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("firstName", "Nombre")} *</label>
                    <input
                      type="text"
                      value={formData.Nombre}
                      onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("lastName", "Apellidos")} *</label>
                    <input
                      type="text"
                      value={formData.Apellidos}
                      onChange={(e) => setFormData({ ...formData, Apellidos: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">DNI</label>
                    <input
                      type="text"
                      value={formData.DNI}
                      onChange={(e) => setFormData({ ...formData, DNI: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("phone", "Teléfono")}</label>
                    <input
                      type="text"
                      value={formData.Telefono}
                      onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("position", "Puesto")}</label>
                    <input
                      type="text"
                      value={formData.Puesto}
                      onChange={(e) => setFormData({ ...formData, Puesto: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("agreement", "Convenio")}</label>
                    <select
                      value={formData.IdConvenio}
                      onChange={(e) => setFormData({ ...formData, IdConvenio: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">{t("selectAgreement", "Seleccionar...")}</option>
                      {convenios.map((c) => (
                        <option key={c.IdConvenio} value={c.IdConvenio}>
                          {c.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("startDate", "Fecha de alta")}</label>
                  <input
                    type="date"
                    value={formData.FechaAlta}
                    onChange={(e) => setFormData({ ...formData, FechaAlta: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("notes", "Observaciones")}</label>
                  <textarea
                    value={formData.Observaciones}
                    onChange={(e) => setFormData({ ...formData, Observaciones: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>

                {modalMode === "edit" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.Activo === 1}
                        onChange={(e) => setFormData({ ...formData, Activo: e.target.checked ? 1 : 0 })}
                        className="rounded border-slate-300"
                      />
                      {t("active", "Activo")}
                    </label>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  disabled={saving}
                >
                  {t("cancel", "Cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? t("saving", "Guardando...") : t("save", "Guardar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
