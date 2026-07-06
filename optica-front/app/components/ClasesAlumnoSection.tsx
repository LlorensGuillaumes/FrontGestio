import { useEffect, useState } from "react";
import {
  fetchMatriculas,
  fetchClasesRecurrentes,
  createMatricula,
  deleteMatricula,
  DIAS_SEMANA,
  type Matricula,
  type ClaseRecurrente,
} from "~/lib/escolaRest";
import { generarMatriculaAlumno } from "~/lib/facturacionMensualRest";
import { useTranslation } from "react-i18next";

// Sección reutilizable: clases a las que está matriculado un alumno (cliente).
export default function ClasesAlumnoSection({ idCliente, disabled }: { idCliente: number | string; disabled?: boolean }) {
  const { t } = useTranslation(["escola", "common"]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [clases, setClases] = useState<ClaseRecurrente[]>([]);
  const [adding, setAdding] = useState(false);
  const [idClase, setIdClase] = useState<number | "">("");
  const [cuota, setCuota] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const d = await fetchMatriculas({ idCliente: Number(idCliente) });
      setMatriculas(d.data);
    } catch (e) {
      console.error("Error cargando clases del alumno", e);
    }
  };

  useEffect(() => {
    if (idCliente) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCliente]);

  const openAdd = async () => {
    setErr(null);
    setIdClase("");
    setCuota(0);
    setAdding(true);
    if (!clases.length) {
      try { setClases((await fetchClasesRecurrentes({ soloActivas: true })).data); } catch {}
    }
  };

  const matricular = async () => {
    if (!idClase) { setErr(t("escola:clasesAlumno.errorSeleccionaClase")); return; }
    setSaving(true);
    setErr(null);
    try {
      await createMatricula({ idClaseRecurrente: Number(idClase), idCliente: Number(idCliente), cuotaMensual: Number(cuota) });
      // Si la clase tiene matrícula, ofrecer crear su factura a nombre del alumno
      const cl = clases.find((c) => c.id === Number(idClase));
      const importeMat = cl?.ImporteMatricula != null ? Number(cl.ImporteMatricula) : 0;
      if (importeMat > 0 && confirm(t("escola:clasesAlumno.confirmFacturaMatricula", { importe: importeMat.toFixed(2) }))) {
        try {
          const r = await generarMatriculaAlumno(Number(idCliente), Number(idClase));
          if (!r.creada && r.mensaje) alert(r.mensaje);
        } catch (e: any) {
          alert(e?.response?.data?.error ?? t("escola:clasesAlumno.errorCrearFactura"));
        }
      }
      setAdding(false);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? t("escola:clasesAlumno.errorMatricular"));
    } finally {
      setSaving(false);
    }
  };

  const baja = async (m: Matricula) => {
    if (!confirm(t("escola:clasesAlumno.confirmBaja", { clase: m.NombreClase }))) return;
    try { await deleteMatricula(m.id); load(); }
    catch (e: any) { alert(e?.response?.data?.error ?? t("escola:clasesAlumno.errorBaja")); }
  };

  // Clases en las que aún no está matriculado
  const matriculadasIds = new Set(matriculas.map((m) => m.IdClaseRecurrente));
  const disponibles = clases.filter((c) => !matriculadasIds.has(c.id));
  const totalMes = matriculas.reduce((acc, m) => acc + Number(m.CuotaMensual), 0);

  return (
    <section className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">
          {t("escola:clasesAlumno.titulo")} {matriculas.length > 0 && <span className="text-slate-400 font-normal">· {t("escola:clasesAlumno.euroMes", { importe: totalMes.toFixed(2) })}</span>}
        </h3>
        {!disabled && (
          <button type="button" onClick={openAdd} className="text-sm text-blue-600 hover:underline font-medium">{t("escola:clasesAlumno.apuntar")}</button>
        )}
      </div>
      <div className="p-4 space-y-2">
        {matriculas.length === 0 && <p className="text-sm text-slate-500">{t("escola:clasesAlumno.sinClases")}</p>}
        {matriculas.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div>
              <div className="font-medium text-slate-900 text-sm">
                {m.NombreClase}
                <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs ${m.Tipo === "GRUPAL" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                  {m.Tipo === "GRUPAL" ? t("escola:clasesAlumno.tipoGrupal") : t("escola:clasesAlumno.tipoIndividual")}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {m.DiaSemana ? DIAS_SEMANA[m.DiaSemana] : ""} {m.HoraInicio?.slice(0, 5) ?? ""}
                {m.NombreProfesor ? ` · ${m.NombreProfesor}` : ""} · {t("escola:clasesAlumno.euroMes", { importe: Number(m.CuotaMensual).toFixed(2) })}
              </div>
            </div>
            {!disabled && (
              <button type="button" onClick={() => baja(m)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">{t("escola:clasesAlumno.darBaja")}</button>
            )}
          </div>
        ))}

        {adding && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3 mt-2">
            {err && <div className="text-xs text-red-600">{err}</div>}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-600">{t("escola:clasesAlumno.labelClase")}</label>
                <select
                  value={idClase}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : "";
                    setIdClase(id);
                    const cl = clases.find((c) => c.id === id);
                    if (cl?.CuotaSugerida != null) setCuota(Number(cl.CuotaSugerida));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">{t("escola:clasesAlumno.seleccionaClase")}</option>
                  {disponibles.map((c) => (
                    <option key={c.id} value={c.id}>{c.Nombre} ({c.Ocupacion}/{c.CapacidadMax})</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-slate-600">{t("escola:clasesAlumno.labelCuota")}</label>
                <input type="number" step="0.01" min={0} value={cuota} onChange={(e) => setCuota(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button type="button" onClick={matricular} disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50">{saving ? "..." : t("escola:clasesAlumno.matricular")}</button>
              <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">{t("escola:clasesAlumno.cancelar")}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
