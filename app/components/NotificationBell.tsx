// app/components/NotificationBell.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  fetchNotificaciones,
  fetchNotificacionesCount,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  getColorNotificacion,
  type Notificacion,
} from "~/lib/notificacionesRest";

const POLLING_INTERVAL = 30000; // 30 seconds

export function NotificationBell() {
  const { t, i18n } = useTranslation(["comunicacion", "common"]);
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch count on mount and periodically
  const fetchCount = useCallback(async () => {
    try {
      const newCount = await fetchNotificacionesCount();
      setCount(newCount);
    } catch (err) {
      console.error("Error fetching notification count:", err);
    }
  }, []);

  // Fetch notifications when dropdown is opened
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchNotificaciones(10, 0, false);
      setNotificaciones(response.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Fetch notifications when opening dropdown
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await marcarNotificacionLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
      setCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("comunicacion:notifications.justNow", "Ahora");
    if (minutes < 60) return t("comunicacion:notifications.minutesAgo", "Hace {{count}} min", { count: minutes });
    if (hours < 24) return t("comunicacion:notifications.hoursAgo", "Hace {{count}} h", { count: hours });
    if (days < 7) return t("comunicacion:notifications.daysAgo", "Hace {{count}} d", { count: days });
    return date.toLocaleDateString(i18n.language === "ca" ? "ca-ES" : "es-ES");
  };

  const getNavigationPath = (notif: Notificacion): string | null => {
    if (notif.tipoCodigo === "stock_bajo" || notif.tipoCodigo === "stock_critico") {
      const idProducto = notif.datos?.idProducto;
      if (idProducto) return `/productos/detalle/${idProducto}`;
      return "/productos/stock/listado";
    }
    if (notif.tipoCodigo === "mensaje_nuevo") {
      const idMensaje = notif.datos?.idMensaje;
      if (idMensaje) return `/comunicacion/mensajes?id=${idMensaje}`;
      return "/comunicacion/mensajes";
    }
    if (notif.tipoCodigo === "chat_nuevo") {
      const idConversacion = notif.datos?.idConversacion;
      if (idConversacion) return `/comunicacion/chat?id=${idConversacion}`;
      return "/comunicacion/chat";
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        title={t("comunicacion:notifications.title", "Notificaciones")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {t("comunicacion:notifications.title", "Notificaciones")}
            </h3>
            {count > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {t("comunicacion:notifications.markAllRead", "Marcar todas como leídas")}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">{t("comunicacion:notifications.empty", "No hay notificaciones")}</p>
              </div>
            ) : (
              notificaciones.map((notif) => {
                const navPath = getNavigationPath(notif);
                const content = (
                  <div
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notif.leida ? "bg-blue-50/50" : ""
                    }`}
                    onClick={() => {
                      if (!notif.leida) handleMarkAsRead(notif.id);
                      if (navPath) setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${getColorNotificacion(notif.tipoCodigo)}`}>
                        {notif.tipoCodigo === "stock_bajo" || notif.tipoCodigo === "stock_critico" ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : notif.tipoCodigo === "mensaje_nuevo" ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : notif.tipoCodigo === "chat_nuevo" ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.leida ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.mensaje}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(notif.createdAt)}</p>
                      </div>
                      {!notif.leida && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );

                return navPath ? (
                  <Link key={notif.id} to={navPath}>
                    {content}
                  </Link>
                ) : (
                  <div key={notif.id}>{content}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-gray-200">
            <Link
              to="/comunicacion/notificaciones"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t("comunicacion:notifications.viewAll", "Ver todas las notificaciones")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
