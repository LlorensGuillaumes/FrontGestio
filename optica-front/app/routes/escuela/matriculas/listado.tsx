import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchMatriculas,
  fetchClasesRecurrentes,
  deleteMatricula,
  nombreAlumno,
  type Matricula,
  type ClaseRecurrente,
} from "~/lib/escolaRest";

export default function MatriculasListado() {
  const { t } = useTranslation(["escola", "common"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [clases, setClases] = useState<ClaseRecurrente[]>([]);
  const [filtroClase, setFiltroClase] = useState<number | "">("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMatriculas({ idClase: filtroClase ? Number(filtroClase) : undefined });
      setMatriculas(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? t("escola:matriculas.errorCargando"));
    } finally {
      setLoading(false);
    }
  };

  const loadClases = async () => {
    try {
      const d = await fetchClasesRecurrentes({ soloActivas: true });
      setClases(d.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadClases();
  }, []);
  useEffect(() => {
    load();
  }, [filtroClase]);

  const handleBaja = async (m: Matricula) => {
    if (!window.confirm(t("escola:matriculas.confirmarBaja", { alumno: nombreAlumno(m), clase: m.NombreClase }))) return;
    try {
      await deleteMatricula(m.id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? t("escola:matriculas.errorBaja"));
    }
  };

  const ingresosMes = matriculas.reduce((acc, m) => acc + Number(m.CuotaMensual), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("escola:matriculas.titulo")}</h1>
          <p className="text-slate-500 text-sm">
            {loading
              ? t("escola:matriculas.cargando")
              : t("escola:matriculas.resumen", { count: matriculas.length, ingresos: ingresosMes.toFixed(2) })}
          </p>
        </div>
        <select
          value={filtroClase}
          onChange={(e) => setFiltroClase(e.target.value ? Number(e.target.value) : "")}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">{t("escola:matriculas.todasClases")}</option>
          {clases.map((c) => (
            <option key={c.id} value={c.id}>{c.Nombre}</option>
          ))}
        </select>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colAlumno")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colClase")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colProfesor")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colCuota")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colAlta")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colAcciones")}</th>
            </tr>
          </thead>
          <tbody>
            {matriculas.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">{t("escola:matriculas.sinDatos")}</td>
              </tr>
            )}
            {matriculas.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{nombreAlumno(m)}</td>
                <td className="p-4 text-slate-600 text-sm">{m.NombreClase}</td>
                <td className="p-4 text-slate-600 text-sm">{m.NombreProfesor ?? "—"}</td>
                <td className="p-4 text-right text-slate-900 font-medium">{Number(m.CuotaMensual).toFixed(2)} €</td>
                <td className="p-4 text-slate-600 text-sm">{m.FechaAlta?.slice(0, 10)}</td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleBaja(m)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                  >
                    {t("escola:matriculas.baja")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
