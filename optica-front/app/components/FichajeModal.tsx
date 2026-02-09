// app/components/FichajeModal.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fichar, getEstadoPorUsername, MENSAJES_ADVERTENCIA, type EstadoFichaje } from "~/lib/fichajesRest";
import { PasswordInput } from "./PasswordInput";

interface FichajeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FichajeModal({ isOpen, onClose }: FichajeModalProps) {
  const { t, i18n } = useTranslation("fichajes");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEstado, setIsLoadingEstado] = useState(false);
  const [estado, setEstado] = useState<EstadoFichaje | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<"ENTRADA" | "SALIDA" | null>(null);
  const [horaActual, setHoraActual] = useState("");
  const [resultado, setResultado] = useState<{ success: boolean; mensaje: string; tipo?: string } | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizar hora cada segundo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraActual(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setUsername("");
      setPassword("");
      setError("");
      setEstado(null);
      setTipoSeleccionado(null);
      setResultado(null);
      setTimeout(() => usernameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Consultar estado cuando cambia el username (con debounce)
  const consultarEstado = useCallback(async (user: string) => {
    if (!user.trim()) {
      setEstado(null);
      setTipoSeleccionado(null);
      return;
    }

    setIsLoadingEstado(true);
    try {
      const estadoUsuario = await getEstadoPorUsername(user.trim());
      setEstado(estadoUsuario);
      setTipoSeleccionado(estadoUsuario.tipoSugerido);
      setError("");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setEstado(null);
        setTipoSeleccionado(null);
        // No mostrar error aquí, se mostrará al intentar fichar
      }
    } finally {
      setIsLoadingEstado(false);
    }
  }, []);

  // Debounce para consultar estado
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      consultarEstado(username);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [username, consultarEstado]);

  // Auto-cerrar después de éxito
  useEffect(() => {
    if (resultado?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resultado, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(t("errorEmptyFields", "Introduce usuario y contraseña"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fichar(username.trim(), password, tipoSeleccionado || undefined);
      setResultado({
        success: true,
        mensaje: res.mensaje,
        tipo: res.fichaje?.tipo,
      });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError(t("errorInvalidCredentials", "Usuario o contraseña incorrectos"));
      } else {
        setError(t("errorConnection", "Error de conexión"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getAdvertenciaTexto = (codigo: string): string => {
    const mensaje = MENSAJES_ADVERTENCIA[codigo];
    if (!mensaje) return codigo;
    return i18n.language === "ca" ? mensaje.ca : mensaje.es;
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
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {t("title", "Fichar")}
                  </h2>
                  <p className="text-3xl font-bold text-white">
                    {horaActual}
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

          {/* Resultado de éxito */}
          {resultado?.success ? (
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  resultado.tipo === "ENTRADA" ? "bg-green-100" : "bg-orange-100"
                }`}>
                  {resultado.tipo === "ENTRADA" ? (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  resultado.tipo === "ENTRADA" ? "text-green-700" : "text-orange-700"
                }`}>
                  {resultado.tipo === "ENTRADA"
                    ? t("entradaRegistrada", "Entrada registrada")
                    : t("salidaRegistrada", "Salida registrada")
                  }
                </h3>
                <p className="text-gray-600">{resultado.mensaje}</p>
                <p className="text-sm text-gray-400 mt-4">
                  {t("closeAuto", "Esta ventana se cerrará automáticamente...")}
                </p>
              </div>
            </div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Estado del usuario */}
              {estado && (
                <div className={`p-4 rounded-lg border ${
                  estado.tipoSugerido === "ENTRADA"
                    ? "bg-green-50 border-green-200"
                    : "bg-orange-50 border-orange-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      estado.tipoSugerido === "ENTRADA" ? "bg-green-200" : "bg-orange-200"
                    }`}>
                      {estado.tipoSugerido === "ENTRADA" ? (
                        <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {estado.usuario?.nombre || username}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t("vasAFichar", "Vas a fichar")}{" "}
                        <span className={`font-bold ${
                          tipoSeleccionado === "ENTRADA" ? "text-green-700" : "text-orange-700"
                        }`}>
                          {tipoSeleccionado === "ENTRADA" ? t("entrada", "ENTRADA") : t("salida", "SALIDA")}
                        </span>
                      </p>
                      {estado.horasTrabajadasHoy > 0 && (
                        <p className="text-xs text-gray-500">
                          {t("horasHoy", "Horas trabajadas hoy")}: {estado.horasTrabajadasHoy.toFixed(2)}h
                        </p>
                      )}
                    </div>
                    {/* Botón para cambiar tipo */}
                    <button
                      type="button"
                      onClick={() => setTipoSeleccionado(tipoSeleccionado === "ENTRADA" ? "SALIDA" : "ENTRADA")}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {t("cambiar", "Cambiar")}
                    </button>
                  </div>
                </div>
              )}

              {/* Advertencias */}
              {estado && estado.advertencias.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium text-yellow-800">{t("advertencias", "Advertencias")}:</p>
                      <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                        {estado.advertencias.map((adv, idx) => (
                          <li key={idx}>• {getAdvertenciaTexto(adv)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Usuario */}
              <div>
                <label htmlFor="fichaje-username" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("usuario", "Usuario")}
                </label>
                <div className="relative">
                  <input
                    ref={usernameRef}
                    id="fichaje-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("usernamePlaceholder", "Tu nombre de usuario")}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100"
                    autoComplete="username"
                  />
                  {isLoadingEstado && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Contraseña */}
              <PasswordInput
                id="fichaje-password"
                label={t("password", "Contraseña")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder", "Tu contraseña")}
                disabled={isLoading}
                autoComplete="current-password"
              />

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t("cancelar", "Cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    tipoSeleccionado === "SALIDA"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t("fichando", "Fichando...")}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {tipoSeleccionado === "SALIDA"
                          ? t("ficharSalida", "Fichar salida")
                          : t("ficharEntrada", "Fichar entrada")
                        }
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
