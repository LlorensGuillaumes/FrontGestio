// app/components/ChatWindow.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";
import {
  fetchConversaciones,
  fetchMensajes,
  enviarMensaje,
  marcarMensajesLeidos,
  fetchChatNoLeidos,
  getNombreConversacion,
  formatFechaMensaje,
  type ConversacionResumen,
  type Mensaje,
} from "~/lib/chatRest";

const POLLING_INTERVAL = 5000; // 5 seconds for messages

interface ChatWindowProps {
  minimized?: boolean;
  onClose?: () => void;
}

export function ChatWindow({ minimized = false, onClose }: ChatWindowProps) {
  const { t } = useTranslation(["comunicacion", "common"]);
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [selectedConversacion, setSelectedConversacion] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  const fetchConvs = useCallback(async () => {
    try {
      const data = await fetchConversaciones();
      setConversaciones(data);
      const noLeidos = await fetchChatNoLeidos();
      setTotalNoLeidos(noLeidos);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMsgs = useCallback(async () => {
    if (!selectedConversacion) return;
    try {
      const data = await fetchMensajes(selectedConversacion);
      setMensajes(data);
      await marcarMensajesLeidos(selectedConversacion);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [selectedConversacion]);

  // Initial load
  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, POLLING_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversacion) {
      setLoading(true);
      fetchMsgs().finally(() => setLoading(false));
      const interval = setInterval(fetchMsgs, POLLING_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [selectedConversacion, fetchMsgs]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (selectedConversacion && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [selectedConversacion, isMinimized]);

  const handleSend = async () => {
    if (!nuevoMensaje.trim() || !selectedConversacion || sending) return;

    setSending(true);
    const contenido = nuevoMensaje.trim();
    setNuevoMensaje("");

    try {
      const mensaje = await enviarMensaje(selectedConversacion, contenido);
      setMensajes((prev) => [...prev, mensaje]);
    } catch (err) {
      console.error("Error sending message:", err);
      setNuevoMensaje(contenido); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConv = conversaciones.find((c) => c.id === selectedConversacion);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{t("comunicacion:chat.title", "Chat")}</span>
          {totalNoLeidos > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1 text-xs font-bold bg-red-500 rounded-full">
              {totalNoLeidos > 99 ? "99+" : totalNoLeidos}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedConversacion && (
            <button
              onClick={() => setSelectedConversacion(null)}
              className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h3 className="font-semibold">
            {selectedConv
              ? getNombreConversacion(selectedConv, user?.id)
              : t("comunicacion:chat.title", "Chat")}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
            title={t("common:minimize", "Minimizar")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
              title={t("common:close", "Cerrar")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedConversacion ? (
        // Conversation list
        <div className="flex-1 overflow-y-auto">
          {conversaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4">
              <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-center">{t("comunicacion:chat.noConversations", "No hay conversaciones")}</p>
            </div>
          ) : (
            conversaciones.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversacion(conv.id)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                    {getNombreConversacion(conv, user?.id).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-800 truncate">
                        {getNombreConversacion(conv, user?.id)}
                      </p>
                      {conv.ultimoMensajeFecha && (
                        <span className="text-xs text-slate-400">
                          {formatFechaMensaje(conv.ultimoMensajeFecha)}
                        </span>
                      )}
                    </div>
                    {conv.ultimoMensaje && (
                      <p className="text-sm text-slate-500 truncate mt-0.5">
                        {conv.ultimoMensajeAutor && `${conv.ultimoMensajeAutor}: `}
                        {conv.ultimoMensaje}
                      </p>
                    )}
                  </div>
                  {conv.mensajesNoLeidos > 0 && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                      {conv.mensajesNoLeidos}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        // Messages view
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mensajes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p className="text-sm">{t("comunicacion:chat.noMessages", "No hay mensajes")}</p>
              </div>
            ) : (
              mensajes.map((msg) => {
                const isOwn = msg.idUsuarioAutor === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        isOwn
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 rounded-bl-sm"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-medium text-blue-600 mb-1">
                          {msg.autorNombre || msg.autorUsername}
                        </p>
                      )}
                      <p className={`text-sm ${isOwn ? "text-white" : "text-slate-800"}`}>
                        {msg.contenido}
                      </p>
                      <p className={`text-xs mt-1 ${isOwn ? "text-blue-200" : "text-slate-400"}`}>
                        {formatFechaMensaje(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("comunicacion:chat.typePlaceholder", "Escribe un mensaje...")}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!nuevoMensaje.trim() || sending}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
