import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { getResumenMensual, type ResumenMensualUsuario } from "~/lib/fichajesRest";

export default function FichajesResumen() {
  const { t, i18n } = useTranslation("fichajes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenMensualUsuario[]>([]);

  // Filtros
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResumenMensual(anyo, mes);
      setResumen(data.usuarios);
    } catch (e: any) {
      setError(e.message ?? t("gestion.mensajes.errorCargar"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anyo, mes]);

  const meses = [
    { value: 1, label: i18n.language === "ca" ? "Gener" : "Enero" },
    { value: 2, label: i18n.language === "ca" ? "Febrer" : "Febrero" },
    { value: 3, label: i18n.language === "ca" ? "Març" : "Marzo" },
    { value: 4, label: i18n.language === "ca" ? "Abril" : "Abril" },
    { value: 5, label: i18n.language === "ca" ? "Maig" : "Mayo" },
    { value: 6, label: i18n.language === "ca" ? "Juny" : "Junio" },
    { value: 7, label: i18n.language === "ca" ? "Juliol" : "Julio" },
    { value: 8, label: i18n.language === "ca" ? "Agost" : "Agosto" },
    { value: 9, label: i18n.language === "ca" ? "Setembre" : "Septiembre" },
    { value: 10, label: i18n.language === "ca" ? "Octubre" : "Octubre" },
    { value: 11, label: i18n.language === "ca" ? "Novembre" : "Noviembre" },
    { value: 12, label: i18n.language === "ca" ? "Desembre" : "Diciembre" },
  ];

  const anyos = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    anyos.push(y);
  }

  // Totales
  const totales = resumen.reduce(
    (acc, r) => ({
      horasTrabajadas: acc.horasTrabajadas + r.horas_trabajadas,
      diasTrabajados: acc.diasTrabajados + r.dias_trabajados,
      fichajesIncompletos: acc.fichajesIncompletos + r.fichajes_incompletos,
      advertencias: acc.advertencias + r.advertencias_count,
    }),
    { horasTrabajadas: 0, diasTrabajados: 0, fichajesIncompletos: 0, advertencias: 0 }
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("gestion.resumen")}</h1>
          <p className="text-gray-500">{t("gestion.resumenSubtitle", "Resumen de horas trabajadas por usuario")}</p>
        </div>
        <Link
          to="/rrhh/fichajes"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t("gestion.listado")}
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("gestion.resumenMensual.mes")}
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("gestion.resumenMensual.anyo")}
            </label>
            <select
              value={anyo}
              onChange={(e) => setAnyo(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {anyos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("gestion.resumenMensual.horasTrabajadas")}</p>
              <p className="text-2xl font-bold text-gray-800">{totales.horasTrabajadas.toFixed(1)}h</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("gestion.resumenMensual.diasTrabajados")}</p>
              <p className="text-2xl font-bold text-gray-800">{totales.diasTrabajados}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("gestion.resumenMensual.incompletos")}</p>
              <p className="text-2xl font-bold text-gray-800">{totales.fichajesIncompletos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("gestion.resumenMensual.advertenciasCount")}</p>
              <p className="text-2xl font-bold text-gray-800">{totales.advertencias}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resumen.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t("gestion.noFichajes", "No hay datos para mostrar")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.usuario")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.resumenMensual.horasTrabajadas")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.resumenMensual.diasTrabajados")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.resumenMensual.incompletos")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.resumenMensual.advertenciasCount")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resumen.map((r) => (
                  <tr key={r.id_usuario} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/rrhh/fichajes?idUsuario=${r.id_usuario}`}
                        className="hover:text-blue-600"
                      >
                        <p className="font-medium text-gray-800">{r.nombre}</p>
                        <p className="text-xs text-gray-500">{r.username}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-lg font-semibold text-gray-800">
                        {r.horas_trabajadas.toFixed(1)}h
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {r.dias_trabajados}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.fichajes_incompletos > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {r.fichajes_incompletos}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.advertencias_count > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {r.advertencias_count}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-800">Total</td>
                  <td className="px-4 py-3 text-right font-mono text-lg font-bold text-gray-800">
                    {totales.horasTrabajadas.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {totales.diasTrabajados}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {totales.fichajesIncompletos}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {totales.advertencias}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
