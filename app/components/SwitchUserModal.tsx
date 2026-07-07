// app/components/SwitchUserModal.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PasswordInput } from "./PasswordInput";

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitch: (username: string, password: string) => Promise<void>;
  currentUsername?: string;
}

export function SwitchUserModal({ isOpen, onClose, onSwitch, currentUsername }: SwitchUserModalProps) {
  const { t } = useTranslation("auth");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Focus username input when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername("");
      setPassword("");
      setError("");
      setTimeout(() => usernameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(t("errorEmptyFields"));
      return;
    }

    if (username.trim().toLowerCase() === currentUsername?.toLowerCase()) {
      setError(t("switchUser.sameUser", "Ya has iniciado sesion con este usuario"));
      return;
    }

    setIsLoading(true);
    try {
      await onSwitch(username.trim(), password);
      onClose();
      // Reload to reset all app state for new user
      window.location.reload();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError(t("errorInvalidCredentials"));
      } else {
        setError(t("errorConnection"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {t("switchUser.title", "Cambiar de usuario")}
                  </h2>
                  <p className="text-sm text-blue-100">
                    {t("switchUser.subtitle", "Inicia sesion con otra cuenta")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Current user info */}
          {currentUsername && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-500">
                {t("switchUser.currentUser", "Usuario actual")}: <span className="font-medium text-gray-700">{currentUsername}</span>
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="switch-username" className="block text-sm font-medium text-gray-700 mb-1">
                {t("username")}
              </label>
              <input
                ref={usernameRef}
                id="switch-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("usernamePlaceholder")}
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100"
                autoComplete="username"
              />
            </div>

            <PasswordInput
              id="switch-password"
              label={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              disabled={isLoading}
              autoComplete="current-password"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t("switchUser.cancel", "Cancelar")}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("switchUser.switching", "Cambiando...")}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>{t("switchUser.switch", "Cambiar usuario")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
