import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";

export default function MatriculasLayout() {
  const { t } = useTranslation(["escola", "common"]);
  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-8 py-3 flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <span className="text-slate-400 font-medium">{t("escola:matriculas.escuela")}</span>
          <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-bold tracking-tight px-2 py-0.5 bg-slate-200/50 rounded-md">
            {t("escola:matriculas.titulo")}
          </span>
        </nav>
      </header>
      <main className="bg-white flex-1 overflow-auto">
        <div className="max-w-none mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
