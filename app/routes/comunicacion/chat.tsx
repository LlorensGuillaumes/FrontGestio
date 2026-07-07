// app/routes/comunicacion/chat.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "~/contexts/AuthContext";
import {
  fetchConversaciones,
  fetchMensajes,
  enviarMensaje,
  marcarMensajesLeidos,
  fetchUsuariosDisponibles,
  iniciarConversacionDirecta,
  crearGrupo,
  getNombreConversacion,
  formatFechaMensaje,
  type ConversacionResumen,
  type Mensaje,
  type UsuarioDisponible,
} from "~/lib/chatRest";

const POLLING_INTERVAL = 5000;

export default function ChatPage() {
  const { t } = useTranslation(["comunicacion", "common"]);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct");
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioDisponible[]>([]);
  const [searchUsuarios, setSearchUsuarios] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Read conversation id from URL (validate against loaded conversations)
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const numId = Number(id);
      // Only set if conversations are loaded and user has access
      if (conversaciones.length > 0) {
        if (conversaciones.some((c) => c.id === numId)) {
          setSelectedId(numId);
        } else {
          // Invalid conversation ID, clear the param
          setSearchParams({});
          setSelectedId(null);
        }
      } else if (!loading) {
        // Conversations loaded but empty, clear invalid param
        setSearchParams({});
        setSelectedId(null);
      }
      // If still loading, wait for conversations to load before validating
    }
  }, [searchParams, conversaciones, loading, setSearchParams]);

  // Fetch conversations
  const fetchConvs = useCallback(async () => {
    try {
      const data = await fetchConversaciones();
      setConversaciones(data);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages
  const fetchMsgs = useCallback(async () => {
    if (!selectedId) return;
    try {
      const data = await fetchMensajes(selectedId);
      setMensajes(data);
      await marcarMensajesLeidos(selectedId);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      // Handle 403 (no access) by clearing selection
      if (err.response?.status === 403) {
        setSelectedId(null);
        setMensajes([]);
        setSearchParams({});
      }
    }
  }, [selectedId, setSearchParams]);

  // Initial load
  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, POLLING_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedId) {
      setLoadingMessages(true);
      fetchMsgs().finally(() => setLoadingMessages(false));
      const interval = setInterval(fetchMsgs, POLLING_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [selectedId, fetchMsgs]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Focus input
  useEffect(() => {
    if (selectedId) {
      inputRef.current?.focus();
    }
  }, [selectedId]);

  // Fetch available users for new chat
  useEffect(() => {
    if (showNewChat) {
      fetchUsuariosDisponibles().then(setUsuariosDisponibles);
    }
  }, [showNewChat]);

  const handleSelectConversacion = (id: number) => {
    setSelectedId(id);
    setSearchParams({ id: String(id) });
  };

  const handleSend = async () => {
    if (!nuevoMensaje.trim() || !selectedId || sending) return;

    setSending(true);
    const contenido = nuevoMensaje.trim();
    setNuevoMensaje("");

    try {
      const mensaje = await enviarMensaje(selectedId, contenido);
      setMensajes((prev) => [...prev, mensaje]);
      fetchConvs(); // Refresh list
    } catch (err) {
      console.error("Error sending message:", err);
      setNuevoMensaje(contenido);
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

  const handleStartChat = async (idUsuario: number) => {
    try {
      const conv = await iniciarConversacionDirecta(idUsuario);
      await fetchConvs();
      handleSelectConversacion(conv.id);
      closeNewChatModal();
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;

    setCreatingGroup(true);
    try {
      const conv = await crearGrupo(groupName.trim(), selectedParticipants);
      await fetchConvs();
      handleSelectConversacion(conv.id);
      closeNewChatModal();
    } catch (err) {
      console.error("Error creating group:", err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleParticipant = (id: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const closeNewChatModal = () => {
    setShowNewChat(false);
    setNewChatMode("direct");
    setSearchUsuarios("");
    setFilterEmpresa(null);
    setGroupName("");
    setSelectedParticipants([]);
  };

  const selectedConv = conversaciones.find((c) => c.id === selectedId);

  // Get unique empresas for filter
  const empresasDisponibles = useMemo(() => {
    const empresaMap = new Map<number, { id: number; nombre: string }>();
    usuariosDisponibles.forEach((u) => {
      u.empresas?.forEach((e) => {
        if (!empresaMap.has(e.id)) {
          empresaMap.set(e.id, { id: e.id, nombre: e.nombre });
        }
      });
    });
    return Array.from(empresaMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuariosDisponibles]);

  const filteredUsuarios = useMemo(() => {
    let result = usuariosDisponibles;

    // Filter by empresa
    if (filterEmpresa !== null) {
      result = result.filter((u) => u.empresas?.some((e) => e.id === filterEmpresa));
    }

    // Filter by search (nombre, username, puesto, departamento)
    if (searchUsuarios.trim()) {
      const searchLower = searchUsuarios.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(searchLower) ||
          (u.nombre && u.nombre.toLowerCase().includes(searchLower)) ||
          (u.puesto && u.puesto.toLowerCase().includes(searchLower)) ||
          u.departamentos.some((d) => d.toLowerCase().includes(searchLower))
      );
    }

    return result.sort((a, b) => {
      const nameA = a.nombre || a.username;
      const nameB = b.nombre || b.username;
      return nameA.localeCompare(nameB);
    });
  }, [usuariosDisponibles, filterEmpresa, searchUsuarios]);

  return (
    <div className="p-6 h-[calc(100vh-120px)]">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link to="/comunicacion" className="text-blue-600 hover:text-blue-800">
          {t("comunicacion:center.title", "Comunicaciones")}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600">{t("comunicacion:chat.title", "Chat")}</span>
      </div>

      {/* Main container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100%-40px)] flex overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">
                {t("comunicacion:chat.conversations", "Conversaciones")}
              </h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={t("comunicacion:chat.newChat", "Nueva conversación")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversaciones.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <p className="text-sm">{t("comunicacion:chat.noConversations", "No hay conversaciones")}</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  {t("comunicacion:chat.startFirst", "Iniciar una conversación")}
                </button>
              </div>
            ) : (
              conversaciones.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversacion(conv.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-gray-100 ${
                    selectedId === conv.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                      conv.tipo === "GRUPO"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                      {conv.tipo === "GRUPO" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      ) : (
                        getNombreConversacion(conv, user?.id).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-800 truncate">
                          {getNombreConversacion(conv, user?.id)}
                        </p>
                        {conv.ultimoMensajeFecha && (
                          <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                            {formatFechaMensaje(conv.ultimoMensajeFecha)}
                          </span>
                        )}
                      </div>
                      {conv.ultimoMensaje && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">{conv.ultimoMensaje}</p>
                      )}
                    </div>
                    {conv.mensajesNoLeidos > 0 && (
                      <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                        {conv.mensajesNoLeidos}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">{t("comunicacion:chat.selectConversation", "Selecciona una conversación")}</p>
                <p className="text-sm mt-1">{t("comunicacion:chat.selectHint", "o inicia una nueva")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  selectedConv?.tipo === "GRUPO"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-blue-100 text-blue-600"
                }`}>
                  {selectedConv?.tipo === "GRUPO" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ) : (
                    selectedConv && getNombreConversacion(selectedConv, user?.id).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {selectedConv && getNombreConversacion(selectedConv, user?.id)}
                  </p>
                  {selectedConv?.tipo === "GRUPO" && (
                    <p className="text-xs text-slate-500">
                      {selectedConv.participantes.length} {t("comunicacion:chat.participantsSelected", "participantes")}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loadingMessages ? (
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
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-xl px-4 py-2 ${
                            isOwn
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-white border border-gray-200 rounded-bl-sm shadow-sm"
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-medium text-blue-600 mb-1">
                              {msg.autorNombre || msg.autorUsername}
                            </p>
                          )}
                          <p className={`text-sm ${isOwn ? "text-white" : "text-slate-800"}`}>{msg.contenido}</p>
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
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("comunicacion:chat.typePlaceholder", "Escribe un mensaje...")}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!nuevoMensaje.trim() || sending}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>{t("common:send", "Enviar")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[500px] max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {newChatMode === "direct"
                  ? t("comunicacion:chat.newChat", "Nueva conversación")
                  : t("comunicacion:chat.newGroup", "Nuevo grupo")}
              </h3>
              <button
                onClick={closeNewChatModal}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setNewChatMode("direct")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  newChatMode === "direct"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t("comunicacion:chat.directChat", "Chat directo")}
                </div>
              </button>
              <button
                onClick={() => setNewChatMode("group")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  newChatMode === "group"
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {t("comunicacion:chat.createGroup", "Crear grupo")}
                </div>
              </button>
            </div>

            {/* Group name input (only in group mode) */}
            {newChatMode === "group" && (
              <div className="p-4 border-b border-gray-200">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t("comunicacion:chat.groupName", "Nombre del grupo")}
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t("comunicacion:chat.groupNamePlaceholder", "Ej: Equipo de ventas")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                />
              </div>
            )}

            {/* Selected participants (only in group mode) */}
            {newChatMode === "group" && selectedParticipants.length > 0 && (
              <div className="p-3 bg-blue-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedParticipants.length} {t("comunicacion:chat.participantsSelected", "participantes")}
                  </span>
                  <button
                    onClick={() => setSelectedParticipants([])}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {t("comunicacion:recipients.clearAll", "Quitar todos")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedParticipants.map((id) => {
                    const u = usuariosDisponibles.find((usr) => usr.id === id);
                    if (!u) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 text-blue-800 text-xs rounded-full"
                      >
                        {u.nombre || u.username}
                        <button
                          onClick={() => toggleParticipant(id)}
                          className="text-blue-400 hover:text-blue-600"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchUsuarios}
                  onChange={(e) => setSearchUsuarios(e.target.value)}
                  placeholder={t("comunicacion:recipients.searchPlaceholder", "Buscar por nombre, puesto o departamento...")}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Empresa filter */}
              {empresasDisponibles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterEmpresa(null)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      filterEmpresa === null
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t("comunicacion:recipients.allCompanies", "Todas")}
                  </button>
                  {empresasDisponibles.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setFilterEmpresa(e.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        filterEmpresa === e.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {e.nombre}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-500">
                {filteredUsuarios.length} {t("comunicacion:recipients.available", "disponibles")}
              </div>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
              {filteredUsuarios.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="font-medium">{t("comunicacion:chat.noUsersFound", "No se encontraron usuarios")}</p>
                  <p className="text-sm mt-1">{t("comunicacion:recipients.tryOtherFilter", "Prueba con otro filtro")}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredUsuarios.map((u) => {
                    const isSelected = selectedParticipants.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => newChatMode === "direct" ? handleStartChat(u.id) : toggleParticipant(u.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                      >
                        {/* Checkbox for group mode */}
                        {newChatMode === "group" && (
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                              isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 flex items-center justify-center font-semibold flex-shrink-0">
                          {(u.nombre || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-800 truncate">{u.nombre || u.username}</p>
                            {u.departamentos.length > 0 && (
                              <div className="flex flex-wrap justify-end gap-1 flex-shrink-0">
                                {u.departamentos.slice(0, 2).map((dept) => (
                                  <span
                                    key={dept}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full whitespace-nowrap"
                                  >
                                    {dept}
                                  </span>
                                ))}
                                {u.departamentos.length > 2 && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-full">
                                    +{u.departamentos.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {u.puesto && (
                              <span className="text-xs text-slate-500">{u.puesto}</span>
                            )}
                            {u.puesto && u.empresas && u.empresas.length > 0 && (
                              <span className="text-slate-300">·</span>
                            )}
                            {u.empresas && u.empresas.length > 0 && (
                              <span className="text-xs text-slate-400 truncate">
                                {u.empresas.map((e) => e.nombre).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer for group mode */}
            {newChatMode === "group" && (
              <div className="p-4 border-t border-gray-200 bg-slate-50">
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedParticipants.length === 0 || creatingGroup}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingGroup ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("comunicacion:chat.creating", "Creando...")}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      {t("comunicacion:chat.createGroupBtn", "Crear grupo")}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
