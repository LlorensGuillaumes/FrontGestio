import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCalculoHorasAnuales, type ResumenTrabajador } from "~/lib/controlHorarioRest";

export default function ControlHorarioResumen() {
  const { t } = useTranslation("controlHorario");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const [trabajadores, setTrabajadores] = useState<ResumenTrabajador[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalculoHorasAnuales(anyo);
      setTrabajadores(data.usuarios ?? []);
    } catch (e: any) {
      setError(e.message ?? "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anyo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">
            {loading ? t("loading", "Cargando...") : `${trabajadores.length} ${t("workers", "trabajadores")}`}
          </p>
        </div>

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
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 text-sm font-semibold text-slate-600">{t("worker", "Trabajador")}</th>
              <th className="text-left p-3 text-sm font-semibold text-slate-600">{t("agreement", "Convenio")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("agreementHours", "H. Convenio")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("scheduleHours", "H. Horario")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("difference", "Diferencia")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("compensateDays", "Días comp.")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("vacationUsed", "Vac. usadas")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("vacationPending", "Vac. pend.")}</th>
              <th className="text-right p-3 text-sm font-semibold text-slate-600">{t("weeklyHours", "H/semana")}</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  {t("noData", "No hay datos disponibles.")}
                </td>
              </tr>
            )}
            {trabajadores.map((tr) => (
              <tr key={tr.IdTrabajador} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3">
                  <div className="font-medium text-slate-900">{tr.Nombre} {tr.Apellidos}</div>
                </td>
                <td className="p-3 text-slate-600 text-sm">{tr.NombreConvenio ?? "—"}</td>
                <td className="p-3 text-right font-mono text-sm">{tr.HorasConvenio}h</td>
                <td className="p-3 text-right font-mono text-sm">{tr.HorasSegunHorario}h</td>
                <td className="p-3 text-right font-mono text-sm">
                  <span className={tr.DiferenciaHoras > 0 ? "text-red-600" : tr.DiferenciaHoras < 0 ? "text-green-600" : ""}>
                    {tr.DiferenciaHoras > 0 ? "+" : ""}{tr.DiferenciaHoras}h
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-sm">
                  {tr.DiasACompensar !== 0 && (
                    <span className={tr.DiasACompensar > 0 ? "text-red-600" : "text-green-600"}>
                      {tr.DiasACompensar > 0 ? "+" : ""}{tr.DiasACompensar}
                    </span>
                  )}
                  {tr.DiasACompensar === 0 && "0"}
                </td>
                <td className="p-3 text-right text-sm">
                  {tr.DiasVacacionesUsados} / {tr.DiasVacacionesConvenio}
                </td>
                <td className="p-3 text-right text-sm">
                  <span className={tr.DiasVacacionesPendientes > 0 ? "text-blue-600 font-medium" : ""}>
                    {tr.DiasVacacionesPendientes}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-sm text-slate-600">
                  {tr.HorasPromedioSemanal}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>{t("moreHoursThanAgreement", "Más horas que convenio (días a compensar)")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>{t("lessHoursThanAgreement", "Menos horas que convenio")}</span>
        </div>
      </div>
    </div>
  );
}
