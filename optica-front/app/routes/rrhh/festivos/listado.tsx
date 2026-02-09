import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFestivos,
  createFestivo,
  updateFestivo,
  TIPOS_FESTIVO,
  type FestivoEmpresa,
} from "~/lib/festivosRest";

type ModalMode = "new" | "edit" | null;

export default function FestivosListado() {
  const { t } = useTranslation("controlHorario");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [festivos, setFestivos] = useState<FestivoEmpresa[]>([]);
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    Nombre: string;
    TipoFestivo: "NACIONAL" | "AUTONOMICO" | "LOCAL" | "OTRO";
    FechaInicio: string;
    FechaFin: string;
    Anual: boolean;
    Observaciones: string;
    Activo: number;
  }>({
    Nombre: "",
    TipoFestivo: "NACIONAL",
    FechaInicio: "",
    FechaFin: "",
    Anual: false,
    Observaciones: "",
    Activo: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFestivos(anyo, !showInactivos);
      setFestivos(data);
    } catch (e: any) {
      setError(e.message ?? "Error cargando festivos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anyo, showInactivos]);

  const openNewModal = () => {
    setFormData({
      Nombre: "",
      TipoFestivo: "NACIONAL",
      FechaInicio: "",
      FechaFin: "",
      Anual: false,
      Observaciones: "",
      Activo: 1,
    });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (f: FestivoEmpresa) => {
    setFormData({
      Nombre: f.Nombre,
      TipoFestivo: f.TipoFestivo,
      FechaInicio: f.FechaInicio?.split("T")[0] ?? "",
      FechaFin: f.FechaFin?.split("T")[0] ?? "",
      Anual: f.Anual,
      Observaciones: f.Observaciones ?? "",
      Activo: f.Activo,
    });
    setEditingId(f.IdFestivo);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.Nombre.trim() || !formData.FechaInicio) {
      setFormError(t("nameAndDateRequired", "Nombre y fecha de inicio son obligatorios"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        ...formData,
        FechaFin: formData.FechaFin || null,
        Anyo: new Date(formData.FechaInicio).getFullYear(),
      };

      if (modalMode === "new") {
        await createFestivo(payload);
      } else if (modalMode === "edit" && editingId) {
        await updateFestivo(editingId, payload);
      }
      closeModal();
      loadData();
    } catch (e: any) {
      setFormError(e.message ?? "Error guardando festivo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    const confirmed = window.confirm(t("confirmDeactivate", "¿Desactivar este festivo?"));
    if (!confirmed) return;

    try {
      await updateFestivo(id, { Activo: 0 });
      loadData();
    } catch (e: any) {
      alert(e.message ?? "Error al desactivar");
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "NACIONAL":
        return "bg-red-100 text-red-700";
      case "AUTONOMICO":
        return "bg-orange-100 text-orange-700";
      case "LOCAL":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("holidays", "Festivos")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("loading", "Cargando...") : `${festivos.length} ${t("holidaysRegistered", "festivos registrados")}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={anyo}
            onChange={(e) => setAnyo(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 1 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactivos}
              onChange={(e) => setShowInactivos(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("showInactive", "Inactivos")}
          </label>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + {t("newHoliday", "Nuevo festivo")}
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
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("type", "Tipo")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("date", "Fecha")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("annual", "Anual")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("actions", "Acciones")}</th>
            </tr>
          </thead>
          <tbody>
            {festivos.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {t("noHolidays", "No hay festivos registrados.")}
                </td>
              </tr>
            )}
            {festivos.map((f) => (
              <tr key={f.IdFestivo} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{f.Nombre}</div>
                  {f.Observaciones && (
                    <div className="text-sm text-slate-500">{f.Observaciones}</div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(f.TipoFestivo)}`}>
                    {TIPOS_FESTIVO.find((t) => t.value === f.TipoFestivo)?.label ?? f.TipoFestivo}
                  </span>
                </td>
                <td className="p-4 text-slate-600">
                  {new Date(f.FechaInicio).toLocaleDateString("es-ES")}
                  {f.FechaFin && f.FechaFin !== f.FechaInicio && (
                    <> - {new Date(f.FechaFin).toLocaleDateString("es-ES")}</>
                  )}
                </td>
                <td className="p-4 text-center">
                  {f.Anual ? (
                    <span className="text-green-600">Si</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(f)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("edit", "Editar")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {f.Activo ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(f.IdFestivo)}
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
                  {modalMode === "new" ? t("newHoliday", "Nuevo festivo") : t("editHoliday", "Editar festivo")}
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
                    placeholder="Ej: Navidad, Sant Jordi..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("type", "Tipo")} *</label>
                  <select
                    value={formData.TipoFestivo}
                    onChange={(e) => setFormData({ ...formData, TipoFestivo: e.target.value as "NACIONAL" | "AUTONOMICO" | "LOCAL" | "OTRO" })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {TIPOS_FESTIVO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("startDate", "Fecha inicio")} *</label>
                    <input
                      type="date"
                      value={formData.FechaInicio}
                      onChange={(e) => setFormData({ ...formData, FechaInicio: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("endDate", "Fecha fin")}</label>
                    <input
                      type="date"
                      value={formData.FechaFin}
                      onChange={(e) => setFormData({ ...formData, FechaFin: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {t("leaveEmptyForSingleDay", "Dejar vacío para día suelto")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.Anual}
                      onChange={(e) => setFormData({ ...formData, Anual: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    {t("annualHoliday", "Festivo anual (se repite cada año)")}
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("notes", "Observaciones")}</label>
                  <textarea
                    value={formData.Observaciones}
                    onChange={(e) => setFormData({ ...formData, Observaciones: e.target.value })}
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
