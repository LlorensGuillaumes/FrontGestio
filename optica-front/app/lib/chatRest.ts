// app/lib/chatRest.ts
import { api } from "~/lib/api";

export type Conversacion = {
  id: number;
  tipo: "DIRECTA" | "GRUPO";
  nombre: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversacionResumen = {
  id: number;
  tipo: "DIRECTA" | "GRUPO";
  nombre: string | null;
  ultimoMensaje: string | null;
  ultimoMensajeFecha: string | null;
  ultimoMensajeAutor: string | null;
  mensajesNoLeidos: number;
  participantes: Array<{
    id: number;
    username: string;
    nombre: string | null;
  }>;
};

export type Mensaje = {
  id: number;
  idConversacion: number;
  idUsuarioAutor: number;
  autorUsername: string;
  autorNombre: string | null;
  contenido: string;
  tipo: "TEXTO" | "ARCHIVO" | "IMAGEN";
  archivoUrl: string | null;
  editado: boolean;
  eliminado: boolean;
  createdAt: string;
};

export type Participante = {
  id: number;
  username: string;
  nombre: string | null;
  ultimoMensajeLeido: number | null;
  silenciada: boolean;
  fechaUnion: string;
};

export type ConversacionCompleta = Conversacion & {
  participantes: Participante[];
};

export type EmpresaInfo = {
  id: number;
  nombre: string;
  dbName: string;
};

export type UsuarioDisponible = {
  id: number;
  username: string;
  nombre: string | null;
  puesto: string | null;
  departamentos: string[];
  empresas: EmpresaInfo[];
};

/**
 * Obtener lista de conversaciones
 */
export async function fetchConversaciones(): Promise<ConversacionResumen[]> {
  const { data } = await api.get<{ data: ConversacionResumen[] }>("/chat/conversaciones");
  return data.data;
}

/**
 * Obtener detalles de una conversación
 */
export async function fetchConversacion(id: number): Promise<ConversacionCompleta> {
  const { data } = await api.get<{ data: ConversacionCompleta }>(`/chat/conversacion/${id}`);
  return data.data;
}

/**
 * Iniciar o recuperar una conversación directa con otro usuario
 */
export async function iniciarConversacionDirecta(idUsuario: number): Promise<Conversacion> {
  const { data } = await api.post<{ data: Conversacion }>(`/chat/conversacion/directa/${idUsuario}`);
  return data.data;
}

/**
 * Obtener mensajes de una conversación
 */
export async function fetchMensajes(
  idConversacion: number,
  limit: number = 50,
  before?: number
): Promise<Mensaje[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (before) params.set("before", String(before));

  const { data } = await api.get<{ data: Mensaje[] }>(
    `/chat/conversacion/${idConversacion}/mensajes?${params.toString()}`
  );
  return data.data;
}

/**
 * Enviar un mensaje en una conversación
 */
export async function enviarMensaje(
  idConversacion: number,
  contenido: string,
  tipo: "TEXTO" | "ARCHIVO" | "IMAGEN" = "TEXTO",
  archivoUrl?: string
): Promise<Mensaje> {
  const { data } = await api.post<{ data: Mensaje }>(
    `/chat/conversacion/${idConversacion}/mensajes`,
    { contenido, tipo, archivoUrl }
  );
  return data.data;
}

/**
 * Marcar mensajes como leídos
 */
export async function marcarMensajesLeidos(idConversacion: number): Promise<void> {
  await api.put(`/chat/conversacion/${idConversacion}/leer`);
}

/**
 * Silenciar/desilenciar una conversación
 */
export async function toggleSilenciarConversacion(
  idConversacion: number,
  silenciada: boolean
): Promise<void> {
  await api.put(`/chat/conversacion/${idConversacion}/silenciar`, { silenciada });
}

/**
 * Obtener usuarios disponibles para chat
 */
export async function fetchUsuariosDisponibles(): Promise<UsuarioDisponible[]> {
  const { data } = await api.get<{ data: UsuarioDisponible[] }>("/chat/usuarios-disponibles");
  return data.data;
}

/**
 * Contar total de mensajes no leídos
 */
export async function fetchChatNoLeidos(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/chat/no-leidos");
  return data.count;
}

/**
 * Obtener el nombre a mostrar de una conversación
 */
export function getNombreConversacion(
  conversacion: ConversacionResumen,
  currentUserId?: number
): string {
  if (conversacion.nombre) {
    return conversacion.nombre;
  }

  // Para conversaciones directas, mostrar el nombre del otro participante
  const otroParticipante = conversacion.participantes.find(
    (p) => p.id !== currentUserId
  );

  if (otroParticipante) {
    return otroParticipante.nombre || otroParticipante.username;
  }

  return "Conversación";
}

/**
 * Formatear fecha de mensaje para mostrar
 */
export function formatFechaMensaje(fecha: string): string {
  const date = new Date(fecha);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Ayer";
  } else if (days < 7) {
    return date.toLocaleDateString("es-ES", { weekday: "short" });
  } else {
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }
}

/**
 * Crear un grupo de chat
 */
export async function crearGrupo(nombre: string, participantes: number[]): Promise<Conversacion> {
  const { data } = await api.post<{ data: Conversacion }>("/chat/grupo", { nombre, participantes });
  return data.data;
}

/**
 * Añadir participante a un grupo
 */
export async function addParticipanteGrupo(idGrupo: number, idNuevoUsuario: number): Promise<void> {
  await api.post(`/chat/grupo/${idGrupo}/participantes`, { idNuevoUsuario });
}

/**
 * Salir de un grupo
 */
export async function salirDeGrupo(idGrupo: number): Promise<void> {
  await api.delete(`/chat/grupo/${idGrupo}/salir`);
}

/**
 * Renombrar un grupo
 */
export async function renombrarGrupo(idGrupo: number, nombre: string): Promise<void> {
  await api.put(`/chat/grupo/${idGrupo}/nombre`, { nombre });
}
