import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchMatriculas,
  fetchClasesRecurrentes,
  fetchOpcionesEscola,
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
  const [opciones, setOpciones] = useState<{ instrumentos: { id: number; Nombre: string }[]; profesores: { id: number; NombreCompleto: string; Especialidad: string | null }[] }>({ instrumentos: [], profesores: [] });
  const [filtroInstrumento, setFiltroInstrumento] = useState<number | "">("");
  const [filtroProfesor, setFiltroProfesor] = useState<number | "">("");
  const [filtroAlumno, setFiltroAlumno] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMatriculas({ 
        idClase: undefined,
        idServicio: filtroInstrumento ? Number(filtroInstrumento) : undefined,
        idProfesional: filtroProfesor ? Number(filtroProfesor) : undefined 
      });
      setMatriculas(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? t("escola:matriculas.errorCargando"));
    } finally {
      setLoading(false);
    }
  };

  // Filtrar matrículas por nombre de alumno
  const matriculasFiltradas = matriculas.filter((m) => {
    // Filtro por alumno
    if (filtroAlumno.trim()) {
      const nombreCompleto = nombreAlumno(m).toLowerCase();
      if (!nombreCompleto.includes(filtroAlumno.toLowerCase())) return false;
    }
    return true;
  });

  const loadClases = async () => {
    try {
      const d = await fetchClasesRecurrentes({ soloActivas: true });
      setClases(d.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadOpciones = async () => {
    try {
      setOpciones(await fetchOpcionesEscola());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadClases();
    loadOpciones();
  }, []);
  useEffect(() => {
    load();
  }, [filtroProfesor, filtroInstrumento]);

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

  // Agrupar matrículas por alumno (usar matriculasFiltradas)
  const matriculasPorAlumno = matriculasFiltradas.reduce((acc, m) => {
    const key = m.IdCliente;
    if (!acc[key]) {
      acc[key] = {
        alumno: m,
        clases: [],
        totalCuota: 0,
        totalPreMatricula: 0,
        totalMatricula: 0,
      };
    }
    acc[key].clases.push(m);
    acc[key].totalCuota += Number(m.CuotaMensual);
    acc[key].totalPreMatricula += Number(m.ImportePreMatricula ?? 0);
    acc[key].totalMatricula += Number(m.ImporteMatricula ?? 0);
    return acc;
  }, {} as Record<number, { alumno: Matricula; clases: Matricula[]; totalCuota: number; totalPreMatricula: number; totalMatricula: number }>);

  const alumnosAgrupados = Object.values(matriculasPorAlumno);

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
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder={t("escola:matriculas.buscarAlumno")}
            value={filtroAlumno}
            onChange={(e) => setFiltroAlumno(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={filtroInstrumento}
            onChange={(e) => setFiltroInstrumento(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">{t("escola:matriculas.todasInstrumentos")}</option>
            {opciones.instrumentos.map((i) => (
              <option key={i.id} value={i.id}>{i.Nombre}</option>
            ))}
          </select>
          <select
            value={filtroProfesor}
            onChange={(e) => setFiltroProfesor(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">{t("escola:matriculas.todosProfesores")}</option>
            {opciones.profesores.map((p) => (
              <option key={p.id} value={p.id}>{p.NombreCompleto}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colAlumno")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colClase")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colInstrumento")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colProfesor")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colPreMatricula")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colMatricula")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colCuota")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colAlta")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colFechaFin")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:matriculas.colAcciones")}</th>
            </tr>
          </thead>
          <tbody>
            {alumnosAgrupados.length === 0 && !loading && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">{t("escola:matriculas.sinDatos")}</td>
              </tr>
            )}
            {alumnosAgrupados.map(({ alumno, clases, totalCuota, totalPreMatricula, totalMatricula }) => (
              <tr key={alumno.IdCliente} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{nombreAlumno(alumno)}</td>
                <td className="p-4 text-slate-600 text-sm">
                  {clases.map((c, i) => (
                    <div key={c.id} className={i > 0 ? "mt-1" : ""}>
                      {c.NombreClase} {c.FechaFin && <span className="text-xs text-slate-400">(hasta: {c.FechaFin?.slice(0, 10)})</span>}
                    </div>
                  ))}
                </td>
                <td className="p-4 text-slate-600 text-sm">
                  {clases.map((c, i) => (
                    <div key={c.id} className={i > 0 ? "mt-1" : ""}>{c.NombreInstrumento ?? "—"}</div>
                  ))}
                </td>
                <td className="p-4 text-slate-600 text-sm">
                  {clases.map((c, i) => (
                    <div key={c.id} className={i > 0 ? "mt-1" : ""}>{c.NombreProfesor ?? "—"}</div>
                  ))}
                </td>
                <td className="p-4 text-right text-slate-900 font-medium">{totalPreMatricula > 0 ? totalPreMatricula.toFixed(2) + " €" : "—"}</td>
                <td className="p-4 text-right text-slate-900 font-medium">{totalMatricula > 0 ? totalMatricula.toFixed(2) + " €" : "—"}</td>
                <td className="p-4 text-right text-slate-900 font-medium">{totalCuota.toFixed(2)} €</td>
                <td className="p-4 text-slate-600 text-sm">
                  {clases.map((c, i) => (
                    <div key={c.id} className={i > 0 ? "mt-1" : ""}>{c.FechaAlta?.slice(0, 10)}</div>
                  ))}
                </td>
                <td className="p-4 text-slate-600 text-sm">
                  {clases.map((c, i) => (
                    <div key={c.id} className={i > 0 ? "mt-1" : ""}>{c.FechaFin ? c.FechaFin?.slice(0, 10) : "—"}</div>
                  ))}
                </td>
                <td className="p-4 text-right">
                  {clases.map((c, i) => (
                    <div key={c.id} className={i > 0 ? "mt-1" : ""}>
                      <button
                        type="button"
                        onClick={() => handleBaja(c)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                      >
                        {t("escola:matriculas.baja")}
                      </button>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}