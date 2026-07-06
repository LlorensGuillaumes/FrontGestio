import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getTrabajador,
  getTrabajadorAusencias,
  createTrabajadorAusencia,
  type Trabajador,
  type Ausencia,
} from "~/lib/trabajadoresRest";

const TIPOS_AUSENCIA = [
  { value: "VACACIONES", key: "ausencias.tipoVacaciones", label: "Vacaciones", computable: true },
  { value: "CONVENIO", key: "ausencias.tipoConvenio", label: "Días convenio", computable: true },
  { value: "BAJA_MEDICA", key: "ausencias.tipoBajaMedica", label: "Baja médica", computable: false },
  { value: "ASUNTOS_PROPIOS", key: "ausencias.tipoAsuntosPropios", label: "Asuntos propios", computable: true },
  { value: "OTRO", key: "ausencias.tipoOtro", label: "Otro", computable: true },
];

export default function TrabajadorAusencias() {
  const { t } = useTranslation(["trabajadores", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [anyo, setAnyo] = useState(new Date().getFullYear());

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    TipoAusencia: "VACACIONES",
    FechaInicio: "",
    FechaFin: "",
    Computable: true,
    Descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [trab, aus] = await Promise.all([
        getTrabajador(Number(id)),
        getTrabajadorAusencias(Number(id), anyo),
      ]);
      setTrabajador(trab);
      setAusencias(aus);
    } catch (e: any) {
      setError(e.message ?? t("ausencias.errorLoading", "Error cargando datos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, anyo]);

  const openModal = () => {
    setFormData({
      TipoAusencia: "VACACIONES",
      FechaInicio: "",
      FechaFin: "",
      Computable: true,
      Descripcion: "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleTipoChange = (tipo: string) => {
    const tipoInfo = TIPOS_AUSENCIA.find((ta) => ta.value === tipo);
    setFormData({
      ...formData,
      TipoAusencia: tipo,
      Computable: tipoInfo?.computable ?? true,
    });
  };

  const handleSave = async () => {
    if (!id) return;
    if (!formData.FechaInicio) {
      setFormError(t("ausencias.startDateRequired", "La fecha de inicio es obligatoria"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await createTrabajadorAusencia(Number(id), {
        TipoAusencia: formData.TipoAusencia,
        FechaInicio: formData.FechaInicio,
        FechaFin: formData.FechaFin || null,
        Computable: formData.Computable,
        Descripcion: formData.Descripcion || null,
      });
      closeModal();
      loadData();
    } catch (e: any) {
      setFormError(e.message ?? t("ausencias.errorSaving", "Error guardando ausencia"));
    } finally {
      setSaving(false);
    }
  };

  const calcularDias = (inicio: string, fin: string | null): number => {
    if (!inicio) return 0;
    const fechaInicio = new Date(inicio);
    const fechaFin = fin ? new Date(fin) : fechaInicio;
    const diff = fechaFin.getTime() - fechaInicio.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getTipoLabel = (tipo: string) => {
    const info = TIPOS_AUSENCIA.find((ta) => ta.value === tipo);
    return info ? t(info.key, info.label) : tipo;
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "VACACIONES":
        return "bg-blue-100 text-blue-700";
      case "CONVENIO":
        return "bg-purple-100 text-purple-700";
      case "BAJA_MEDICA":
        return "bg-red-100 text-red-700";
      case "ASUNTOS_PROPIOS":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Calcular totales por tipo
  const totalesPorTipo = ausencias.reduce((acc, a) => {
    const dias = calcularDias(a.FechaInicio, a.FechaFin);
    acc[a.TipoAusencia] = (acc[a.TipoAusencia] || 0) + dias;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-slate-500">{t("ausencias.loading", "Cargando...")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/rrhh/trabajadores")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("ausencias.title", "Ausencias")}
            </h1>
            <p className="text-slate-500 text-sm">
              {trabajador?.Nombre} {trabajador?.Apellidos}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={anyo}
            onChange={(e) => setAnyo(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={openModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + {t("ausencias.newAbsence", "Nueva ausencia")}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TIPOS_AUSENCIA.slice(0, 4).map((tipo) => (
          <div key={tipo.value} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">{t(tipo.key, tipo.label)}</div>
            <div className="text-2xl font-bold text-slate-900">
              {totalesPorTipo[tipo.value] || 0} {t("ausencias.days", "días")}
            </div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("ausencias.type", "Tipo")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("ausencias.period", "Período")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("ausencias.daysCol", "Días")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("ausencias.description", "Descripción")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("ausencias.computable", "Computable")}</th>
            </tr>
          </thead>
          <tbody>
            {ausencias.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {t("ausencias.noAbsences", "No hay ausencias registradas este año.")}
                </td>
              </tr>
            )}
            {ausencias.map((a) => (
              <tr key={a.IdAusencia} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(a.TipoAusencia)}`}>
                    {getTipoLabel(a.TipoAusencia)}
                  </span>
                </td>
                <td className="p-4 text-slate-600">
                  {new Date(a.FechaInicio).toLocaleDateString("es-ES")}
                  {a.FechaFin && a.FechaFin !== a.FechaInicio && (
                    <> - {new Date(a.FechaFin).toLocaleDateString("es-ES")}</>
                  )}
                </td>
                <td className="p-4 text-center font-medium">
                  {calcularDias(a.FechaInicio, a.FechaFin)}
                </td>
                <td className="p-4 text-slate-600 text-sm">
                  {a.Descripcion ?? "—"}
                </td>
                <td className="p-4 text-center">
                  {a.Computable ? (
                    <span className="text-green-600">{t("ausencias.yes", "Sí")}</span>
                  ) : (
                    <span className="text-slate-400">{t("ausencias.no", "No")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {t("ausencias.newAbsence", "Nueva ausencia")}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("ausencias.type", "Tipo")} *</label>
                  <select
                    value={formData.TipoAusencia}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {TIPOS_AUSENCIA.map((ta) => (
                      <option key={ta.value} value={ta.value}>
                        {t(ta.key, ta.label)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("ausencias.startDate", "Fecha inicio")} *</label>
                    <input
                      type="date"
                      value={formData.FechaInicio}
                      onChange={(e) => setFormData({ ...formData, FechaInicio: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("ausencias.endDate", "Fecha fin")}</label>
                    <input
                      type="date"
                      value={formData.FechaFin}
                      onChange={(e) => setFormData({ ...formData, FechaFin: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {t("ausencias.leaveEmptyForSingleDay", "Dejar vacío para día suelto")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("ausencias.description", "Descripción")}</label>
                  <textarea
                    value={formData.Descripcion}
                    onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.Computable}
                      onChange={(e) => setFormData({ ...formData, Computable: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    {t("ausencias.computableHours", "Computable (resta del cálculo de horas)")}
                  </label>
                  <p className="mt-1 text-xs text-slate-500 ml-6">
                    {t("ausencias.computableHelp", "Las bajas médicas normalmente no son computables")}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  disabled={saving}
                >
                  {t("ausencias.cancel", "Cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? t("ausencias.saving", "Guardando...") : t("ausencias.save", "Guardar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
