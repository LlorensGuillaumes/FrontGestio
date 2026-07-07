// app/components/NotificationPanel.tsx
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  fetchNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
  getColorNotificacion,
  type Notificacion,
} from "~/lib/notificacionesRest";

type FilterType = "all" | "unread";

export function NotificationPanel() {
  const { t, i18n } = useTranslation(["comunicacion", "common"]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchNotificaciones(limit, offset, filter === "unread");
      setNotificaciones(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [offset, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await marcarNotificacionLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await eliminarNotificacion(id);
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(i18n.language === "ca" ? "ca-ES" : "es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const unreadCount = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {t("comunicacion:notifications.title", "Notificaciones")}
          </h2>
          <p className="text-sm text-slate-500">
            {total} {t("comunicacion:notifications.total", "notificaciones")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setFilter("all"); setOffset(0); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("comunicacion:notifications.all", "Todas")}
            </button>
            <button
              onClick={() => { setFilter("unread"); setOffset(0); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === "unread"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("comunicacion:notifications.unread", "No leídas")}
            </button>
          </div>
          {/* Mark all as read */}
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {t("comunicacion:notifications.markAllRead", "Marcar todas como leídas")}
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-lg font-medium">{t("comunicacion:notifications.empty", "No hay notificaciones")}</p>
            <p className="text-sm mt-1">{t("comunicacion:notifications.emptyHint", "Las notificaciones aparecerán aquí")}</p>
          </div>
        ) : (
          notificaciones.map((notif) => {
            const navPath = getNavigationPath(notif);
            return (
              <div
                key={notif.id}
                className={`px-6 py-4 hover:bg-slate-50 transition-colors ${
                  !notif.leida ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`mt-0.5 p-2 rounded-lg bg-opacity-10 ${
                    notif.tipoCodigo === "stock_bajo" || notif.tipoCodigo === "stock_critico"
                      ? "bg-amber-100"
                      : notif.tipoCodigo === "mensaje_nuevo"
                      ? "bg-blue-100"
                      : notif.tipoCodigo === "chat_nuevo"
                      ? "bg-green-100"
                      : "bg-slate-100"
                  }`}>
                    <div className={getColorNotificacion(notif.tipoCodigo)}>
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
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className={`text-sm ${!notif.leida ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">{notif.mensaje}</p>
                        <p className="text-xs text-slate-400 mt-2">{formatDate(notif.createdAt)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {navPath && (
                          <Link
                            to={navPath}
                            onClick={() => { if (!notif.leida) handleMarkAsRead(notif.id); }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title={t("comunicacion:notifications.view", "Ver")}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                        {!notif.leida && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t("comunicacion:notifications.markRead", "Marcar como leída")}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t("common:delete", "Eliminar")}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notif.leida && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t("common:pagination.showing", "Mostrando")} {offset + 1}-{Math.min(offset + limit, total)}{" "}
            {t("common:pagination.of", "de")} {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {t("common:pagination.previous", "Anterior")}
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {t("common:pagination.next", "Siguiente")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
