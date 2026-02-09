// app/components/TopBar.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";
import { SwitchUserModal } from "./SwitchUserModal";
import { FichajeModal } from "./FichajeModal";
import { NotificationBell } from "./NotificationBell";

export function TopBar() {
  const { t } = useTranslation(["auth", "fichajes"]);
  const { user, currentDatabase, switchDatabase, switchUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [showFichajeModal, setShowFichajeModal] = useState(false);

  const currentDb = user?.databases.find((db) => db.dbName === currentDatabase);
  const hasMultipleDatabases = user && user.databases.length > 1;

  const handleSwitch = async (dbName: string) => {
    if (dbName === currentDatabase) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await switchDatabase(dbName);
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error cambiando de base de datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
      {/* Indicador de tienda actual */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Conectado" />
          <span className="text-sm text-gray-500">Trabajando en:</span>
        </div>

        {hasMultipleDatabases ? (
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="max-w-[200px] truncate">{currentDb?.nombre || currentDatabase}</span>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Cambiar de tienda</p>
                    <p className="text-xs text-gray-500">Selecciona la tienda donde quieres trabajar</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {user?.databases.map((db) => (
                      <button
                        key={db.id}
                        onClick={() => handleSwitch(db.dbName)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          db.dbName === currentDatabase
                            ? "bg-blue-50 border-l-4 border-blue-600"
                            : "hover:bg-gray-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                          db.dbName === currentDatabase
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}>
                          {db.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            db.dbName === currentDatabase ? "text-blue-700" : "text-gray-800"
                          }`}>
                            {db.nombre}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{db.dbName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              db.rol === "admin"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {db.rol}
                            </span>
                          </div>
                        </div>
                        {db.dbName === currentDatabase && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{currentDb?.nombre || currentDatabase}</span>
          </div>
        )}
      </div>

      {/* Lado derecho: info adicional */}
      <div className="flex items-center gap-4">
        {currentDb && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Serie facturacion</p>
            <p className="text-sm font-mono font-bold text-blue-600">
              {currentDb.serieFacturacion || "F"}
            </p>
          </div>
        )}

        {/* Notification Bell */}
        <NotificationBell />

        {/* Fichar Button */}
        <button
          onClick={() => setShowFichajeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t("fichajes:fichar", "Fichar")}</span>
        </button>

        {/* User info and switch button */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.nombre}</p>
            <p className="text-xs text-gray-400">{user?.role === "master" ? "Master" : user?.role === "admin" ? "Admin" : "Usuario"}</p>
          </div>

          {/* Switch User Button */}
          <button
            onClick={() => setShowSwitchUserModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
            title={t("auth:switchUser.title", "Cambiar de usuario")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="hidden sm:inline">{t("auth:switchUser.title", "Cambiar usuario")}</span>
          </button>
        </div>
      </div>

      {/* Switch User Modal */}
      <SwitchUserModal
        isOpen={showSwitchUserModal}
        onClose={() => setShowSwitchUserModal(false)}
        onSwitch={switchUser}
        currentUsername={user?.username}
      />

      {/* Fichaje Modal */}
      <FichajeModal
        isOpen={showFichajeModal}
        onClose={() => setShowFichajeModal(false)}
      />
    </div>
  );
}
