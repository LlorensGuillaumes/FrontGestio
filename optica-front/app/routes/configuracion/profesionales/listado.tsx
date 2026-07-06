import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchProfesionales,
  createProfesional,
  updateProfesional,
  deleteProfesional,
  type Profesional,
} from "~/lib/profesionalesRest";
import { fetchTrabajadores, type Trabajador } from "~/lib/trabajadoresRest";

type ModalMode = "new" | "edit" | null;

export default function ProfesionalesListado() {
  const { t } = useTranslation(["configuracion", "common"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    especialidad: "",
    numColegiado: "",
    idUsuario: "" as number | "",
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfesionales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfesionales(!showInactivos);
      setProfesionales(data);
    } catch (e: any) {
      setError(e.message ?? t("configuracion:profesionales.errors.loading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfesionales();
  }, [showInactivos]);

  useEffect(() => {
    fetchTrabajadores(true).then(setTrabajadores).catch(() => {});
  }, []);

  const openNewModal = () => {
    setFormData({ nombreCompleto: "", especialidad: "", numColegiado: "", idUsuario: "", activo: true });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (p: Profesional) => {
    setFormData({
      nombreCompleto: p.nombreCompleto,
      especialidad: p.especialidad ?? "",
      numColegiado: p.numColegiado ?? "",
      idUsuario: p.idUsuario ?? "",
      activo: p.activo,
    });
    setEditingId(p.id);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.nombreCompleto.trim()) {
      setFormError(t("configuracion:profesionales.errors.nameRequired"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        nombreCompleto: formData.nombreCompleto.trim(),
        especialidad: formData.especialidad.trim() || null,
        numColegiado: formData.numColegiado.trim() || null,
        idUsuario: formData.idUsuario === "" ? null : Number(formData.idUsuario),
        activo: formData.activo,
      };
      if (modalMode === "new") {
        await createProfesional(payload);
      } else if (modalMode === "edit" && editingId) {
        await updateProfesional(editingId, payload);
      }
      closeModal();
      loadProfesionales();
    } catch (e: any) {
      setFormError(e.message ?? t("configuracion:profesionales.errors.saving"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(t("configuracion:profesionales.confirmDeactivate"));
    if (!confirmed) return;

    try {
      await deleteProfesional(id);
      loadProfesionales();
    } catch (e: any) {
      alert(e.message ?? t("configuracion:profesionales.errors.deactivating"));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("configuracion:profesionales.title")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("configuracion:profesionales.loading") : t("configuracion:profesionales.count", { count: profesionales.length })}
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
            {t("configuracion:profesionales.showInactive")}
          </label>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {t("configuracion:profesionales.newProfessional")}
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
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("configuracion:profesionales.table.fullName")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("configuracion:profesionales.table.specialty")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("configuracion:profesionales.table.worker")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("configuracion:profesionales.table.status")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("configuracion:profesionales.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {profesionales.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {t("configuracion:profesionales.noProfessionals")}
                </td>
              </tr>
            )}
            {profesionales.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{p.nombreCompleto}</div>
                </td>
                <td className="p-4 text-slate-600">{p.especialidad ?? "—"}</td>
                <td className="p-4 text-slate-600 text-sm">
                  {p.idUsuario ? (
                    <span className="inline-flex items-center gap-2">
                      {p.nombreTrabajador ?? t("configuracion:profesionales.linked")}
                      {p.tipoRelacion && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.tipoRelacion === "AUTONOMO" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {p.tipoRelacion === "AUTONOMO" ? t("configuracion:profesionales.freelance") : t("configuracion:profesionales.payroll")}
                        </span>
                      )}
                    </span>
                  ) : <span className="text-amber-600 text-xs">{t("configuracion:profesionales.notLinked")}</span>}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      p.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.activo ? t("configuracion:profesionales.active") : t("configuracion:profesionales.inactive")}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("configuracion:profesionales.edit")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {p.activo ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title={t("configuracion:profesionales.deactivate")}
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
                  {modalMode === "new" ? t("configuracion:profesionales.modal.newTitle") : t("configuracion:profesionales.modal.editTitle")}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("configuracion:profesionales.form.fullName")}</label>
                  <input
                    type="text"
                    value={formData.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("configuracion:profesionales.form.fullNamePlaceholder")}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("configuracion:profesionales.form.specialty")}</label>
                  <input
                    type="text"
                    value={formData.especialidad}
                    onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("configuracion:profesionales.form.specialtyPlaceholder")}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("configuracion:profesionales.form.linkedWorker")}</label>
                  <select
                    value={formData.idUsuario}
                    onChange={(e) => setFormData({ ...formData, idUsuario: e.target.value ? Number(e.target.value) : "" })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">{t("configuracion:profesionales.form.unlinkedOption")}</option>
                    {trabajadores.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.nombre}{tr.tipo_relacion ? ` (${tr.tipo_relacion === "AUTONOMO" ? t("configuracion:profesionales.freelanceLower") : t("configuracion:profesionales.payrollLower")})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("configuracion:profesionales.form.linkedWorkerHelp")}
                  </p>
                </div>

                {modalMode === "edit" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      {t("configuracion:profesionales.form.active")}
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
                  {t("configuracion:profesionales.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? t("configuracion:profesionales.saving") : t("configuracion:profesionales.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
