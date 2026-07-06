// app/components/DatabaseSelector.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";

export function DatabaseSelector() {
  const { t } = useTranslation("common");
  const { user, currentDatabase, switchDatabase } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user || user.databases.length <= 1) {
    // No mostrar selector si solo hay una base de datos
    return null;
  }

  const currentDb = user.databases.find((db) => db.dbName === currentDatabase);

  const handleSwitch = async (dbName: string) => {
    if (dbName === currentDatabase) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await switchDatabase(dbName);
      setIsOpen(false);
      // Recargar la página para refrescar los datos
      window.location.reload();
    } catch (error) {
      console.error("Error cambiando de base de datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="truncate max-w-[120px]">{currentDb?.nombre || currentDatabase}</span>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar el dropdown */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wider">{t("dbSelector.selectCompany")}</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {user.databases.map((db) => (
                <button
                  key={db.id}
                  onClick={() => handleSwitch(db.dbName)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    db.dbName === currentDatabase
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${db.dbName === currentDatabase ? "bg-blue-400" : "bg-slate-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{db.nombre}</p>
                    <p className="text-xs text-slate-500">{db.dbName}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    db.rol === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-slate-600 text-slate-400"
                  }`}>
                    {db.rol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
