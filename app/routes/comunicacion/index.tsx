// app/routes/comunicacion/index.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { fetchNotificacionesCount } from "~/lib/notificacionesRest";
import { fetchChatNoLeidos } from "~/lib/chatRest";
import { fetchMensajesNoLeidos } from "~/lib/mensajesRest";

export default function ComunicacionIndex() {
  const { t } = useTranslation(["comunicacion", "common"]);
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [mensajesCount, setMensajesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [notif, chat, msgs] = await Promise.all([
          fetchNotificacionesCount(),
          fetchChatNoLeidos(),
          fetchMensajesNoLeidos(),
        ]);
        setNotificacionesCount(notif);
        setChatCount(chat);
        setMensajesCount(msgs);
      } catch (err) {
        console.error("Error fetching counts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  const cards = [
    {
      title: t("comunicacion:notifications.title", "Notificaciones"),
      description: t("comunicacion:notifications.description", "Alertas del sistema y avisos importantes"),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      count: notificacionesCount,
      countLabel: t("comunicacion:notifications.unread", "no leídas"),
      link: "/comunicacion/notificaciones",
      color: "blue",
    },
    {
      title: t("comunicacion:messages.title", "Mensajes"),
      description: t("comunicacion:messages.description", "Mensajes formales con prioridad y asunto"),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      count: mensajesCount,
      countLabel: t("comunicacion:messages.unread", "sin leer"),
      link: "/comunicacion/mensajes",
      color: "emerald",
    },
    {
      title: t("comunicacion:chat.title", "Chat"),
      description: t("comunicacion:chat.description", "Conversaciones directas con otros usuarios"),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      count: chatCount,
      countLabel: t("comunicacion:chat.unreadMessages", "mensajes nuevos"),
      link: "/comunicacion/chat",
      color: "violet",
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    blue: {
      bg: "bg-blue-50 hover:bg-blue-100",
      text: "text-blue-600",
      border: "border-blue-200",
      badge: "bg-blue-600 text-white",
    },
    emerald: {
      bg: "bg-emerald-50 hover:bg-emerald-100",
      text: "text-emerald-600",
      border: "border-emerald-200",
      badge: "bg-emerald-600 text-white",
    },
    violet: {
      bg: "bg-violet-50 hover:bg-violet-100",
      text: "text-violet-600",
      border: "border-violet-200",
      badge: "bg-violet-600 text-white",
    },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {t("comunicacion:center.title", "Centro de Comunicaciones")}
        </h1>
        <p className="text-slate-500 mt-1">
          {t("comunicacion:center.subtitle", "Gestiona tus notificaciones, mensajes y chats")}
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const colors = colorClasses[card.color];
          return (
            <Link
              key={card.link}
              to={card.link}
              className={`${colors.bg} ${colors.border} border rounded-xl p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
                  {card.icon}
                </div>
                {card.count > 0 && (
                  <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${colors.badge}`}>
                    {card.count}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mt-4">{card.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{card.description}</p>
              {card.count > 0 && (
                <p className={`text-sm font-medium ${colors.text} mt-3`}>
                  {card.count} {card.countLabel}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {t("comunicacion:center.quickActions", "Acciones rápidas")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/comunicacion/mensajes/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t("comunicacion:messages.compose", "Nuevo mensaje")}
          </Link>
          <Link
            to="/comunicacion/chat"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t("comunicacion:chat.openChat", "Abrir chat")}
          </Link>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
