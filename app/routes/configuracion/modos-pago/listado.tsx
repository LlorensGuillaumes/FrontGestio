import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchModosPago,
  createModoPago,
  updateModoPago,
  deleteModoPago,
  type ModoPago,
} from "~/lib/modosPagoRest";

type ModalMode = "new" | "edit" | null;

export default function ModosPagoListado() {
  const { t } = useTranslation(["configuracion", "common"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modosPago, setModosPago] = useState<ModoPago[]>([]);
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    descripcion: "",
    usaDatafono: false,
    orden: 0,
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadModosPago = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModosPago(!showInactivos);
      setModosPago(data);
    } catch (e: any) {
      setError(e.message ?? t("configuracion:modosPago.errors.loading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModosPago();
  }, [showInactivos]);

  const openNewModal = () => {
    const maxOrden = modosPago.length > 0 ? Math.max(...modosPago.map((m) => m.orden)) : 0;
    setFormData({
      descripcion: "",
      usaDatafono: false,
      orden: maxOrden + 1,
      activo: true,
    });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (m: ModoPago) => {
    setFormData({
      descripcion: m.descripcion,
      usaDatafono: m.usaDatafono,
      orden: m.orden,
      activo: m.activo,
    });
    setEditingId(m.id);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.descripcion.trim()) {
      setFormError(t("configuracion:modosPago.errors.descriptionRequired"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === "new") {
        await createModoPago({
          descripcion: formData.descripcion.trim(),
          usaDatafono: formData.usaDatafono,
          orden: formData.orden,
        });
      } else if (modalMode === "edit" && editingId) {
        await updateModoPago(editingId, {
          descripcion: formData.descripcion.trim(),
          usaDatafono: formData.usaDatafono,
          orden: formData.orden,
          activo: formData.activo,
        });
      }
      closeModal();
      loadModosPago();
    } catch (e: any) {
      setFormError(e.message ?? t("configuracion:modosPago.errors.saving"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(t("configuracion:modosPago.confirmDeactivate"));
    if (!confirmed) return;

    try {
      await deleteModoPago(id);
      loadModosPago();
    } catch (e: any) {
      alert(e.message ?? t("configuracion:modosPago.errors.deactivating"));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("configuracion:modosPago.title")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("configuracion:modosPago.loading") : t("configuracion:modosPago.count", { count: modosPago.length })}
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
            {t("configuracion:modosPago.showInactive")}
          </label>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {t("configuracion:modosPago.newPaymentMethod")}
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
              <th className="text-left p-4 text-sm font-semibold text-slate-600 w-16">{t("configuracion:modosPago.table.order")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("configuracion:modosPago.table.description")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("configuracion:modosPago.table.usesCardTerminal")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("configuracion:modosPago.table.status")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("configuracion:modosPago.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {modosPago.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {t("configuracion:modosPago.noPaymentMethods")}
                </td>
              </tr>
            )}
            {modosPago.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 text-slate-500 font-mono text-sm">{m.orden}</td>
                <td className="p-4">
                  <div className="font-medium text-slate-900">{m.descripcion}</div>
                </td>
                <td className="p-4 text-center">
                  {m.usaDatafono ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      {t("configuracion:modosPago.cardTerminal")}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">{t("configuracion:modosPago.no")}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      m.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.activo ? t("configuracion:modosPago.active") : t("configuracion:modosPago.inactive")}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(m)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title={t("configuracion:modosPago.edit")}
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {m.activo ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title={t("configuracion:modosPago.deactivate")}
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

      {/* Leyenda */}
      <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
        <p className="font-medium text-slate-700 mb-2">{t("configuracion:modosPago.info.title")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>{t("configuracion:modosPago.table.usesCardTerminal")}:</strong> {t("configuracion:modosPago.info.cardTerminal")}</li>
          <li><strong>{t("configuracion:modosPago.table.order")}:</strong> {t("configuracion:modosPago.info.order")}</li>
        </ul>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? t("configuracion:modosPago.modal.newTitle") : t("configuracion:modosPago.modal.editTitle")}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("configuracion:modosPago.form.description")}</label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("configuracion:modosPago.form.descriptionPlaceholder")}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("configuracion:modosPago.form.order")}</label>
                  <input
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {t("configuracion:modosPago.form.orderHelp")}
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.usaDatafono}
                      onChange={(e) => setFormData({ ...formData, usaDatafono: e.target.checked })}
                      className="rounded border-slate-300 w-5 h-5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700">{t("configuracion:modosPago.form.usesCardTerminal")}</span>
                      <p className="text-xs text-slate-500">
                        {t("configuracion:modosPago.form.usesCardTerminalHelp")}
                      </p>
                    </div>
                  </label>
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
                      {t("configuracion:modosPago.form.active")}
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
                  {t("configuracion:modosPago.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? t("configuracion:modosPago.saving") : t("configuracion:modosPago.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
