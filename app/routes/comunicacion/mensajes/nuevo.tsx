// app/routes/comunicacion/mensajes/nuevo.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { RecipientSelector } from "~/components/RecipientSelector";
import { fetchDestinatarios, enviarMensaje, type Prioridad, type DestinatarioDisponible } from "~/lib/mensajesRest";

export default function NuevoMensajePage() {
  const { t } = useTranslation(["comunicacion", "common"]);
  const navigate = useNavigate();
  const [destinatarios, setDestinatarios] = useState<DestinatarioDisponible[]>([]);
  const [selectedDestinatarios, setSelectedDestinatarios] = useState<number[]>([]);
  const [asunto, setAsunto] = useState("");
  const [contenido, setContenido] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("NORMAL");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");  // Error de carga inicial
  const [submitError, setSubmitError] = useState("");  // Error de envío

  useEffect(() => {
    fetchDestinatarios()
      .then(setDestinatarios)
      .catch((err) => {
        console.error("Error fetching recipients:", err);
        setLoadError(t("comunicacion:messages.errorLoadingRecipients", "Error al cargar destinatarios"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Validaciones
    const errors: string[] = [];
    if (selectedDestinatarios.length === 0) {
      errors.push(t("comunicacion:messages.errorNoRecipients", "Selecciona al menos un destinatario"));
    }
    if (!asunto.trim()) {
      errors.push(t("comunicacion:messages.errorNoSubject", "El asunto es obligatorio"));
    }
    if (!contenido.trim()) {
      errors.push(t("comunicacion:messages.errorNoContent", "El contenido es obligatorio"));
    }

    if (errors.length > 0) {
      setSubmitError(errors.join(". "));
      return;
    }

    setSending(true);
    try {
      await enviarMensaje(selectedDestinatarios, asunto.trim(), contenido.trim(), prioridad);
      navigate("/comunicacion/mensajes?tab=sent");
    } catch (err) {
      console.error("Error sending message:", err);
      setSubmitError(t("comunicacion:messages.errorSending", "Error al enviar el mensaje"));
    } finally {
      setSending(false);
    }
  };

  const prioridadOptions: { value: Prioridad; label: string; color: string }[] = [
    { value: "BAJA", label: t("comunicacion:messages.priority.low", "Baja"), color: "bg-slate-100 text-slate-600" },
    { value: "NORMAL", label: t("comunicacion:messages.priority.normal", "Normal"), color: "bg-blue-100 text-blue-600" },
    { value: "ALTA", label: t("comunicacion:messages.priority.high", "Alta"), color: "bg-amber-100 text-amber-600" },
    { value: "URGENTE", label: t("comunicacion:messages.priority.urgent", "Urgente"), color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link to="/comunicacion" className="text-blue-600 hover:text-blue-800">
          {t("comunicacion:center.title", "Comunicaciones")}
        </Link>
        <span className="text-slate-400">/</span>
        <Link to="/comunicacion/mensajes" className="text-blue-600 hover:text-blue-800">
          {t("comunicacion:messages.title", "Mensajes")}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600">{t("comunicacion:messages.new", "Nuevo")}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {t("comunicacion:messages.compose", "Nuevo mensaje")}
        </h1>
        <p className="text-slate-500 mt-1">
          {t("comunicacion:messages.composeHint", "Envía un mensaje formal a uno o varios usuarios")}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 space-y-6">
          {/* Error de carga */}
          {loadError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {loadError}
            </div>
          )}

          {/* Error de envío (solo al intentar enviar) */}
          {submitError && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("comunicacion:messages.recipients", "Destinatarios")} *
            </label>
            <RecipientSelector
              recipients={destinatarios}
              selected={selectedDestinatarios}
              onChange={setSelectedDestinatarios}
              placeholder={t("comunicacion:recipients.placeholder", "Seleccionar destinatarios...")}
              loading={loading}
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="asunto" className="block text-sm font-medium text-slate-700 mb-2">
              {t("comunicacion:messages.subject", "Asunto")} *
            </label>
            <input
              id="asunto"
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder={t("comunicacion:messages.subjectPlaceholder", "Escribe el asunto del mensaje...")}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("comunicacion:messages.priorityLabel", "Prioridad")}
            </label>
            <div className="flex flex-wrap gap-2">
              {prioridadOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrioridad(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    prioridad === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-current`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="contenido" className="block text-sm font-medium text-slate-700 mb-2">
              {t("comunicacion:messages.content", "Contenido")} *
            </label>
            <textarea
              id="contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder={t("comunicacion:messages.contentPlaceholder", "Escribe el contenido del mensaje...")}
              rows={10}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between rounded-b-xl">
          <Link
            to="/comunicacion/mensajes"
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            {t("common:cancel", "Cancelar")}
          </Link>
          <button
            type="submit"
            disabled={sending || selectedDestinatarios.length === 0 || !asunto.trim() || !contenido.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("comunicacion:messages.sending", "Enviando...")}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {t("comunicacion:messages.send", "Enviar mensaje")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
