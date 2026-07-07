// app/routes/index.tsx - Redirección de ruta raíz
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { useAuth } from "~/contexts/AuthContext";

export default function Index() {
  const { t } = useTranslation(["common"]);
  const { isAuthenticated, isLoading } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">{t("root.cargando")}</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, ir a home. Si no, ir a login
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/login" replace />;
}
