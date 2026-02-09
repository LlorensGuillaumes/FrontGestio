import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchConvenios,
  createConvenio,
  updateConvenio,
  type Convenio,
} from "~/lib/conveniosRest";

type ModalMode = "new" | "edit" | null;

export default function ConveniosListado() {
  const { t } = useTranslation("controlHorario");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Nombre: "",
    HorasAnuales: 1800,
    DiasVacaciones: 22,
    DiasConvenio: 0,
    Descripcion: "",
    Activo: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConvenios(!showInactivos);
      setConvenios(data);
    } catch (e: any) {
      setError(e.message ?? "Error cargando convenios");
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
      HorasAnuales: 1800,
      DiasVacaciones: 22,
      DiasConvenio: 0,
      Descripcion: "",
      Activo: 1,
    });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (c: Convenio) => {
    setFormData({
      Nombre: c.Nombre,
      HorasAnuales: c.HorasAnuales,
      DiasVacaciones: c.DiasVacaciones,
      DiasConvenio: c.DiasConvenio,
      Descripcion: c.Descripcion ?? "",
      Activo: c.Activo,
    });
    setEditingId(c.IdConvenio);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.Nombre.trim()) {
      setFormError(t("nameRequired", "El nombre es obligatorio"));
      return;
    }
    if (!formData.HorasAnuales || formData.HorasAnuales <= 0) {
      setFormError(t("hoursRequired", "Las horas anuales deben ser mayores que 0"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === "new") {
        await createConvenio(formData);
      } else if (modalMode === "edit" && editingId) {
        await updateConvenio(editingId, formData);
      }
      closeModal();
      loadData();
    } catch (e: any) {
      setFormError(e.message ?? "Error guardando convenio");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    const confirmed = window.confirm(t("confirmDeactivate", "¿Desactivar este convenio?"));
    if (!confirmed) return;

    try {
      await updateConvenio(id, { Activo: 0 });
      loadData();
    } catch (e: any) {
      alert(e.message ?? "Error al desactivar");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("agreements", "Convenios")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("loading", "Cargando...") : `${convenios.length} ${t("agreementsRegistered", "convenios registrados")}`}
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
            + {t("newAgreement", "Nuevo convenio")}
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
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("annualHours", "Horas/año")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("vacationDays", "Vacaciones")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("agreementDays", "Días convenio")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("status", "Estado")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("actions", "Acciones")}</th>
            </tr>
          </thead>
          <tbody>
            {convenios.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  {t("noAgreements", "No hay convenios registrados.")}
                </td>
              </tr>
            )}
            {convenios.map((c) => (
              <tr key={c.IdConvenio} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{c.Nombre}</div>
                  {c.Descripcion && (
                    <div className="text-sm text-slate-500">{c.Descripcion}</div>
                  )}
                </td>
                <td className="p-4 text-right font-mono text-slate-900">
                  {c.HorasAnuales}h
                </td>
                <td className="p-4 text-right text-slate-600">
                  {c.DiasVacaciones} {t("days", "días")}
                </td>
                <td className="p-4 text-right text-slate-600">
                  {c.DiasConvenio} {t("days", "días")}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      c.Activo
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.Activo ? t("active", "Activo") : t("inactive", "Inactivo")}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("edit", "Editar")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {c.Activo ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(c.IdConvenio)}
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
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? t("newAgreement", "Nuevo convenio") : t("editAgreement", "Editar convenio")}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("name", "Nombre")} *</label>
                  <input
                    type="text"
                    value={formData.Nombre}
                    onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ej: Convenio Comercio, Convenio Optica..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("annualHours", "Horas anuales")} *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.HorasAnuales}
                    onChange={(e) => setFormData({ ...formData, HorasAnuales: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {t("hoursHelp", "Horas totales de trabajo según convenio (ej: 1800h)")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("vacationDays", "Días vacaciones")}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.DiasVacaciones}
                      onChange={(e) => setFormData({ ...formData, DiasVacaciones: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("agreementDays", "Días convenio")}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.DiasConvenio}
                      onChange={(e) => setFormData({ ...formData, DiasConvenio: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {t("agreementDaysHelp", "Días extra por convenio")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("description", "Descripción")}</label>
                  <textarea
                    value={formData.Descripcion}
                    onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
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
