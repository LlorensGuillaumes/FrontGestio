import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getTrabajador,
  getTrabajadorHorario,
  updateTrabajadorHorario,
  type Trabajador,
  type HorarioDia,
} from "~/lib/trabajadoresRest";

const DIAS_SEMANA = [
  { value: 0, key: "horario.diaLunes", label: "Lunes" },
  { value: 1, key: "horario.diaMartes", label: "Martes" },
  { value: 2, key: "horario.diaMiercoles", label: "Miércoles" },
  { value: 3, key: "horario.diaJueves", label: "Jueves" },
  { value: 4, key: "horario.diaViernes", label: "Viernes" },
  { value: 5, key: "horario.diaSabado", label: "Sábado" },
  { value: 6, key: "horario.diaDomingo", label: "Domingo" },
];

export default function TrabajadorHorario() {
  const { t } = useTranslation(["trabajadores", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [horarios, setHorarios] = useState<HorarioDia[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [trab, hor] = await Promise.all([
          getTrabajador(Number(id)),
          getTrabajadorHorario(Number(id)),
        ]);
        setTrabajador(trab);

        // Crear estructura completa de 7 días
        const horariosCompletos: HorarioDia[] = DIAS_SEMANA.map((dia) => {
          const existing = hor.find((h) => h.DiaSemana === dia.value);
          return existing ?? {
            // snake_case (backend)
            dia_semana: dia.value,
            hora_inicio: null,
            hora_fin: null,
            minutos_descanso: 0,
            // PascalCase aliases (compatibilidad)
            IdHorario: 0,
            IdTrabajador: Number(id) || 0,
            DiaSemana: dia.value,
            HoraInicio: null,
            HoraFin: null,
            MinutosDescanso: 0,
          };
        });
        setHorarios(horariosCompletos);
      } catch (e: any) {
        setError(e.message ?? t("horario.errorLoading", "Error cargando datos"));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleChange = (diaSemana: number, field: string, value: any) => {
    setHorarios((prev) =>
      prev.map((h) =>
        h.DiaSemana === diaSemana ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await updateTrabajadorHorario(Number(id), horarios);
      navigate("/rrhh/trabajadores");
    } catch (e: any) {
      setError(e.message ?? t("horario.errorSaving", "Error guardando horario"));
    } finally {
      setSaving(false);
    }
  };

  const calcularHorasDia = (h: HorarioDia): number => {
    if (!h.HoraInicio || !h.HoraFin) return 0;
    const [hiH, hiM] = h.HoraInicio.split(":").map(Number);
    const [hfH, hfM] = h.HoraFin.split(":").map(Number);
    const inicioMin = hiH * 60 + hiM;
    const finMin = hfH * 60 + hfM;
    const trabajoMin = finMin - inicioMin - (h.MinutosDescanso || 0);
    return Math.max(0, trabajoMin / 60);
  };

  const horasTotales = horarios.reduce((acc, h) => acc + calcularHorasDia(h), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-slate-500">{t("horario.loading", "Cargando...")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
            {t("horario.weeklySchedule", "Horario semanal")}
          </h1>
          <p className="text-slate-500 text-sm">
            {trabajador?.Nombre} {trabajador?.Apellidos}
          </p>
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
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("horario.day", "Día")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("horario.startTime", "Entrada")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("horario.endTime", "Salida")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("horario.breakMinutes", "Descanso (min)")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("horario.hours", "Horas")}</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((h) => {
              const dia = DIAS_SEMANA.find((d) => d.value === h.DiaSemana);
              const horasDia = calcularHorasDia(h);
              return (
                <tr key={h.DiaSemana} className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-900">
                    {dia ? t(dia.key, dia.label) : h.DiaSemana}
                  </td>
                  <td className="p-4">
                    <input
                      type="time"
                      value={h.HoraInicio ?? ""}
                      onChange={(e) => handleChange(h.DiaSemana, "HoraInicio", e.target.value || null)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="time"
                      value={h.HoraFin ?? ""}
                      onChange={(e) => handleChange(h.DiaSemana, "HoraFin", e.target.value || null)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={h.MinutosDescanso || 0}
                      onChange={(e) => handleChange(h.DiaSemana, "MinutosDescanso", Number(e.target.value))}
                      className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </td>
                  <td className="p-4 text-right font-mono text-sm">
                    {horasDia > 0 ? `${horasDia.toFixed(1)}h` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={4} className="p-4 text-right font-semibold text-slate-700">
                {t("horario.totalWeekly", "Total semanal")}:
              </td>
              <td className="p-4 text-right font-bold text-slate-900 font-mono">
                {horasTotales.toFixed(1)}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate("/rrhh/trabajadores")}
          className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
        >
          {t("horario.cancel", "Cancelar")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {saving ? t("horario.saving", "Guardando...") : t("horario.saveSchedule", "Guardar horario")}
        </button>
      </div>
    </div>
  );
}
