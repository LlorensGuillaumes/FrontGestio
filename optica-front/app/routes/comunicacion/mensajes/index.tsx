// app/routes/comunicacion/mensajes/index.tsx
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import {
  fetchBandejaEntrada,
  fetchMensajesEnviados,
  fetchMensaje,
  marcarMensajeLeido,
  archivarMensaje,
  getColorPrioridad,
  getEtiquetaPrioridad,
  formatFechaMensaje,
  type MensajeRecibido,
  type MensajeEnviado,
  type FiltrosMensaje,
} from "~/lib/mensajesRest";

type Tab = "inbox" | "sent" | "archived";

export default function MensajesPage() {
  const { t, i18n } = useTranslation(["comunicacion", "common"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("inbox");
  const [mensajes, setMensajes] = useState<(MensajeRecibido | MensajeEnviado)[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMensaje, setSelectedMensaje] = useState<MensajeRecibido | MensajeEnviado | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Read message id from URL
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setSelectedId(Number(id));
    }
  }, [searchParams]);

  // Fetch messages
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "inbox") {
        const response = await fetchBandejaEntrada(limit, offset, {});
        setMensajes(response.data);
        setTotal(response.total);
      } else if (tab === "sent") {
        const response = await fetchMensajesEnviados(limit, offset);
        setMensajes(response.data);
        setTotal(response.total);
      } else if (tab === "archived") {
        const response = await fetchBandejaEntrada(limit, offset, { archivados: true });
        setMensajes(response.data);
        setTotal(response.total);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch selected message detail
  useEffect(() => {
    if (selectedId) {
      setLoadingDetail(true);
      fetchMensaje(selectedId)
        .then((response) => {
          setSelectedMensaje(response.data);
          if (response.tipo === "recibido" && !(response.data as MensajeRecibido).leido) {
            marcarMensajeLeido(selectedId);
            setMensajes((prev) =>
              prev.map((m) => (m.id === selectedId ? { ...m, leido: true } : m))
            );
          }
        })
        .catch((err) => {
          console.error("Error fetching message:", err);
          setSelectedMensaje(null);
        })
        .finally(() => setLoadingDetail(false));
    } else {
      setSelectedMensaje(null);
    }
  }, [selectedId]);

  const handleSelectMensaje = (id: number) => {
    setSelectedId(id);
    setSearchParams({ id: String(id) });
  };

  const handleArchive = async (id: number) => {
    try {
      await archivarMensaje(id, true);
      setMensajes((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedMensaje(null);
        setSearchParams({});
      }
    } catch (err) {
      console.error("Error archiving message:", err);
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      await archivarMensaje(id, false);
      setMensajes((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedMensaje(null);
        setSearchParams({});
      }
    } catch (err) {
      console.error("Error unarchiving message:", err);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const isRecibido = (msg: MensajeRecibido | MensajeEnviado): msg is MensajeRecibido => {
    return "leido" in msg;
  };

  return (
    <div className="p-6 h-[calc(100vh-120px)]">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/comunicacion" className="text-blue-600 hover:text-blue-800">
            {t("comunicacion:center.title", "Comunicaciones")}
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600">{t("comunicacion:messages.title", "Mensajes")}</span>
        </div>
        <Link
          to="/comunicacion/mensajes/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t("comunicacion:messages.compose", "Nuevo mensaje")}
        </Link>
      </div>

      {/* Main container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100%-60px)] flex overflow-hidden">
        {/* Message list */}
        <div className="w-96 border-r border-gray-200 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { key: "inbox", label: t("comunicacion:messages.inbox", "Bandeja de entrada") },
              { key: "sent", label: t("comunicacion:messages.sent", "Enviados") },
              { key: "archived", label: t("comunicacion:messages.archived", "Archivados") },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => { setTab(item.key as Tab); setOffset(0); setSelectedId(null); setSearchParams({}); }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === item.key
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mensajes.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <p className="text-sm">{t("comunicacion:messages.empty", "No hay mensajes")}</p>
              </div>
            ) : (
              mensajes.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelectMensaje(msg.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-gray-100 ${
                    selectedId === msg.id ? "bg-blue-50" : ""
                  } ${isRecibido(msg) && !msg.leido ? "bg-blue-50/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-medium truncate ${isRecibido(msg) && !msg.leido ? "text-slate-900" : "text-slate-700"}`}>
                          {tab === "sent" ? (
                            (msg as MensajeEnviado).destinatarios?.map((d) => d.nombre || d.username).join(", ")
                          ) : (
                            msg.autorNombre || msg.autorUsername
                          )}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getColorPrioridad(msg.prioridad)}`}>
                          {getEtiquetaPrioridad(msg.prioridad, i18n.language as "es" | "ca")}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 truncate ${isRecibido(msg) && !msg.leido ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {msg.asunto}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{formatFechaMensaje(msg.createdAt)}</p>
                    </div>
                    {isRecibido(msg) && !msg.leido && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {t("common:pagination.previous", "Anterior")}
              </button>
              <span className="text-slate-500">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {t("common:pagination.next", "Siguiente")}
              </button>
            </div>
          )}
        </div>

        {/* Message detail */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">{t("comunicacion:messages.selectMessage", "Selecciona un mensaje")}</p>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedMensaje ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-800">{selectedMensaje.asunto}</h2>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getColorPrioridad(selectedMensaje.prioridad)}`}>
                        {getEtiquetaPrioridad(selectedMensaje.prioridad, i18n.language as "es" | "ca")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {t("comunicacion:messages.from", "De")}: {selectedMensaje.autorNombre || selectedMensaje.autorUsername}
                    </p>
                    {"destinatarios" in selectedMensaje && (
                      <p className="text-sm text-slate-500">
                        {t("comunicacion:messages.to", "Para")}: {(selectedMensaje as MensajeEnviado).destinatarios.map((d) => d.nombre || d.username).join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{formatFechaMensaje(selectedMensaje.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab === "archived" ? (
                      <button
                        onClick={() => handleUnarchive(selectedMensaje.id)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t("comunicacion:messages.unarchive", "Desarchivar")}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    ) : tab === "inbox" ? (
                      <button
                        onClick={() => handleArchive(selectedMensaje.id)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t("comunicacion:messages.archive", "Archivar")}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {selectedMensaje.contenido}
                </div>
              </div>

              {/* Read status for sent messages */}
              {"destinatarios" in selectedMensaje && (
                <div className="px-6 py-3 border-t border-gray-200 bg-slate-50">
                  <p className="text-xs text-slate-500 font-medium mb-2">
                    {t("comunicacion:messages.readStatus", "Estado de lectura")}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedMensaje as MensajeEnviado).destinatarios.map((d) => (
                      <span
                        key={d.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                          d.leido ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {d.leido ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {d.nombre || d.username}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <p>{t("comunicacion:messages.notFound", "Mensaje no encontrado")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
