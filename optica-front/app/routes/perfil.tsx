// app/routes/perfil.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";
import { changePassword } from "~/lib/authRest";
import { PasswordInput } from "~/components/PasswordInput";
import {
  fetchPreferenciasNotificacion,
  actualizarPreferencias,
  type PreferenciaNotificacion,
} from "~/lib/notificacionesRest";

export default function PerfilPage() {
  const { t, i18n } = useTranslation(["profile", "comunicacion"]);
  const { user, isMaster } = useAuth();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences state
  const [preferencias, setPreferencias] = useState<PreferenciaNotificacion[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);

  // Load notification preferences
  useEffect(() => {
    fetchPreferenciasNotificacion()
      .then(setPreferencias)
      .catch(console.error)
      .finally(() => setLoadingPrefs(false));
  }, []);

  const handleTogglePref = async (
    idTipo: number,
    field: "pushEnabled" | "emailEnabled",
    value: boolean
  ) => {
    const updated = preferencias.map((p) =>
      p.idTipoNotificacion === idTipo ? { ...p, [field]: value } : p
    );
    setPreferencias(updated);

    setSavingPrefs(true);
    setPrefsSuccess(null);
    try {
      await actualizarPreferencias(
        updated.map((p) => ({
          idTipoNotificacion: p.idTipoNotificacion,
          emailEnabled: p.emailEnabled,
          pushEnabled: p.pushEnabled,
        }))
      );
      setPrefsSuccess(t("comunicacion:preferences.saved", "Preferencias guardadas"));
      setTimeout(() => setPrefsSuccess(null), 2000);
    } catch (err) {
      console.error("Error saving preferences:", err);
      // Revert
      setPreferencias(preferencias);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch", "Las contrasenas no coinciden"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("passwordTooShort", "La contrasena debe tener al menos 6 caracteres"));
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(t("passwordChanged", "Contrasena cambiada correctamente"));
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : t("errorChangingPassword", "Error al cambiar la contrasena");
      setError(message || t("errorChangingPassword", "Error al cambiar la contrasena"));
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleName = () => {
    if (!user) return "";
    switch (user.role) {
      case "master":
        return "Administrador Master";
      case "admin":
        return "Administrador";
      default:
        return "Usuario";
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t("title", "Mi Perfil")}</h1>

      {/* Informacion del usuario */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
            {user?.nombre?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{user?.nombre}</h2>
            <p className="text-gray-500">@{user?.username}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">{t("username", "Usuario")}</span>
            <span className="font-medium text-gray-800">{user?.username}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">{t("name", "Nombre")}</span>
            <span className="font-medium text-gray-800">{user?.nombre}</span>
          </div>
          {user?.email && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">{t("email", "Email")}</span>
              <span className="font-medium text-gray-800">{user.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">{t("role", "Rol")}</span>
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                user?.role === "master"
                  ? "bg-purple-100 text-purple-700"
                  : user?.role === "admin"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {getRoleName()}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">{t("currentDatabase", "Base de datos actual")}</span>
            <span className="font-medium text-gray-800">{user?.currentDatabase}</span>
          </div>
        </div>
      </div>

      {/* Cambiar contrasena - Solo para usuarios normales, no Master */}
      {!isMaster && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{t("security", "Seguridad")}</h3>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {t("changePassword", "Cambiar contrasena")}
              </button>
            )}
          </div>

          {/* Mensajes */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordInput
                id="current-password"
                label={t("currentPassword", "Contrasena actual")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <PasswordInput
                id="new-password"
                label={t("newPassword", "Nueva contrasena")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <PasswordInput
                id="confirm-password"
                label={t("confirmPassword", "Confirmar contrasena")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t("cancel", "Cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {isSaving ? t("saving", "Guardando...") : t("save", "Guardar")}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-500 text-sm">
              {t("passwordDescription", "Puedes cambiar tu contrasena para mantener tu cuenta segura.")}
            </p>
          )}
        </div>
      )}

      {isMaster && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-purple-800">{t("profile:masterUser", "Usuario Master")}</p>
              <p className="text-sm text-purple-600">
                {t("profile:masterPasswordInfo", "La contrasena del usuario Master se configura en el archivo .env del servidor.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {t("comunicacion:preferences.title", "Preferencias de notificacion")}
          </h3>
          {savingPrefs && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
          {prefsSuccess && (
            <span className="text-sm text-green-600">{prefsSuccess}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {t("comunicacion:preferences.subtitle", "Configura como quieres recibir las notificaciones")}
        </p>

        {loadingPrefs ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : preferencias.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            {t("comunicacion:preferences.noTypes", "No hay tipos de notificacion configurables")}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 pb-2 border-b border-gray-200">
              <div>{t("comunicacion:preferences.notificationType", "Tipo de notificacion")}</div>
              <div className="text-center">{t("comunicacion:preferences.inApp", "En la app")}</div>
              <div className="text-center">{t("comunicacion:preferences.email", "Email")}</div>
            </div>

            {/* Preferences rows */}
            {preferencias.map((pref) => (
              <div key={pref.idTipoNotificacion} className="grid grid-cols-3 gap-4 items-center py-2">
                <div className="text-sm text-gray-700">
                  {i18n.language === "ca" ? pref.tipoNombreCa : pref.tipoNombreEs}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleTogglePref(pref.idTipoNotificacion, "pushEnabled", !pref.pushEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      pref.pushEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    disabled={savingPrefs}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        pref.pushEnabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleTogglePref(pref.idTipoNotificacion, "emailEnabled", !pref.emailEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      pref.emailEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    disabled={savingPrefs}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        pref.emailEnabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
