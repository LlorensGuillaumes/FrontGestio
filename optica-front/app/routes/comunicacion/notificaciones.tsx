// app/routes/comunicacion/notificaciones.tsx
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { NotificationPanel } from "~/components/NotificationPanel";

export default function NotificacionesPage() {
  const { t } = useTranslation(["comunicacion", "common"]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link to="/comunicacion" className="text-blue-600 hover:text-blue-800">
          {t("comunicacion:center.title", "Comunicaciones")}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600">{t("comunicacion:notifications.title", "Notificaciones")}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {t("comunicacion:notifications.title", "Notificaciones")}
        </h1>
        <p className="text-slate-500 mt-1">
          {t("comunicacion:notifications.pageDescription", "Todas tus alertas y avisos del sistema")}
        </p>
      </div>

      {/* Panel */}
      <NotificationPanel />
    </div>
  );
}
