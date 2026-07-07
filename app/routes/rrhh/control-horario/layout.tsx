import { Outlet, NavLink } from "react-router";
import { useTranslation } from "react-i18next";

export default function ControlHorarioLayout() {
  const { t } = useTranslation("controlHorario");

  const tabStyle = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? "bg-blue-100 text-blue-700"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("timeTracking", "Control Horario")}</h1>
        <p className="text-slate-500 text-sm">{t("manageWorkingHours", "Gestión de horas de trabajo")}</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
        <NavLink to="/rrhh/control-horario/resumen" className={tabStyle}>
          {t("annualSummary", "Resumen anual")}
        </NavLink>
        <NavLink to="/rrhh/control-horario/calendario" className={tabStyle}>
          {t("calendar", "Calendario")}
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
