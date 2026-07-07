import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCalendarioMes, type CalendarioTrabajador, type DiaCalendario } from "~/lib/controlHorarioRest";
import { fetchTrabajadores, type Trabajador } from "~/lib/trabajadoresRest";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA_CORTO = ["L", "M", "X", "J", "V", "S", "D"];

export default function ControlHorarioCalendario() {
  const { t } = useTranslation("controlHorario");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [trabajadorId, setTrabajadorId] = useState<number | undefined>(undefined);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [calendario, setCalendario] = useState<CalendarioTrabajador[]>([]);
  const [vistaDetallada, setVistaDetallada] = useState(false);

  useEffect(() => {
    fetchTrabajadores(true).then(setTrabajadores).catch(console.error);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarioMes(anyo, mes, trabajadorId);
      setCalendario(data.usuarios ?? []);
    } catch (e: any) {
      setError(e.message ?? "Error cargando calendario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [anyo, mes, trabajadorId]);

  const getDiaClass = (dia: DiaCalendario) => {
    if (dia.esFestivo) return "bg-red-100 text-red-700";
    if (dia.esFinDeSemana) return "bg-slate-100 text-slate-400";
    if (dia.esAusencia) {
      switch (dia.tipoAusencia) {
        case "VACACIONES":
          return "bg-blue-100 text-blue-700";
        case "CONVENIO":
          return "bg-purple-100 text-purple-700";
        case "BAJA_MEDICA":
          return "bg-orange-100 text-orange-700";
        default:
          return "bg-amber-100 text-amber-700";
      }
    }
    if (dia.esLaborable && dia.horasTrabajo > 0) return "bg-green-50 text-green-700";
    return "bg-white text-slate-600";
  };

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAnyo(anyo - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const mesSiguiente = () => {
    if (mes === 12) {
      setMes(1);
      setAnyo(anyo + 1);
    } else {
      setMes(mes + 1);
    }
  };

  // Calcular totales del mes para un trabajador
  const calcularTotales = (dias: DiaCalendario[]) => {
    let horasTrabajadas = 0;
    let diasLaborables = 0;
    let diasVacaciones = 0;
    let diasFestivos = 0;

    dias.forEach(d => {
      if (d.esFestivo) diasFestivos++;
      else if (d.esAusencia && d.tipoAusencia === "VACACIONES") diasVacaciones++;
      else if (d.esLaborable) {
        diasLaborables++;
        horasTrabajadas += d.horasTrabajo;
      }
    });

    return { horasTrabajadas, diasLaborables, diasVacaciones, diasFestivos };
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={mesAnterior}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            value={anyo}
            onChange={(e) => setAnyo(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>

          <button
            onClick={mesSiguiente}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={trabajadorId ?? ""}
            onChange={(e) => setTrabajadorId(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">{t("allWorkers", "Todos los trabajadores")}</option>
            {trabajadores.map((tr) => (
              <option key={tr.IdTrabajador} value={tr.IdTrabajador}>
                {tr.Nombre} {tr.Apellidos}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={vistaDetallada}
              onChange={(e) => setVistaDetallada(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("detailedView", "Vista detallada")}
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-slate-500">{t("loading", "Cargando...")}</div>
      )}

      {/* Calendarios por trabajador */}
      {!loading && calendario.map((trab) => {
        const totales = calcularTotales(trab.dias);
        const primerDia = trab.dias[0];
        const offsetDias = primerDia ? new Date(primerDia.fecha).getDay() : 0;
        const offsetAjustado = offsetDias === 0 ? 6 : offsetDias - 1;

        return (
          <div key={trab.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">{trab.nombre}</h3>
              <div className="flex gap-4 text-sm text-slate-600">
                <span>{totales.diasLaborables} {t("workDays", "días lab.")}</span>
                <span className="font-mono">{totales.horasTrabajadas.toFixed(1)}h</span>
                {totales.diasVacaciones > 0 && (
                  <span className="text-blue-600">{totales.diasVacaciones} {t("vacationDays", "vac.")}</span>
                )}
              </div>
            </div>

            <div className="p-4">
              {/* Cabecera días semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DIAS_SEMANA_CORTO.map((d, i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-500 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {/* Espacios vacíos antes del primer día */}
                {[...Array(offsetAjustado)].map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {trab.dias.map((dia) => (
                  <div
                    key={dia.fecha}
                    className={`aspect-square rounded-lg p-1 text-center ${getDiaClass(dia)} transition-all hover:ring-2 hover:ring-blue-300`}
                    title={
                      dia.esFestivo
                        ? `${dia.nombreFestivo} (${dia.tipoFestivo})`
                        : dia.esAusencia
                        ? dia.tipoAusencia ?? undefined
                        : dia.esLaborable
                        ? `${dia.horaInicio} - ${dia.horaFin} (${dia.horasTrabajo}h)`
                        : undefined
                    }
                  >
                    <div className="text-sm font-medium">
                      {new Date(dia.fecha).getDate()}
                    </div>
                    {vistaDetallada && dia.esLaborable && dia.horasTrabajo > 0 && !dia.esAusencia && (
                      <div className="text-[10px] leading-tight">
                        {dia.horasTrabajo.toFixed(1)}h
                      </div>
                    )}
                    {vistaDetallada && dia.esAusencia && (
                      <div className="text-[10px] leading-tight truncate">
                        {dia.tipoAusencia?.substring(0, 3)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-50 border border-green-200"></span>
          <span className="text-slate-600">{t("workDay", "Día laborable")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200"></span>
          <span className="text-slate-600">{t("weekend", "Fin de semana")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-100 border border-red-200"></span>
          <span className="text-slate-600">{t("holiday", "Festivo")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></span>
          <span className="text-slate-600">{t("vacation", "Vacaciones")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-purple-100 border border-purple-200"></span>
          <span className="text-slate-600">{t("agreementDay", "Día convenio")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></span>
          <span className="text-slate-600">{t("sickLeave", "Baja médica")}</span>
        </div>
      </div>
    </div>
  );
}
