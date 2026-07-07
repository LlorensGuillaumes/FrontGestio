// app/lib/mensajesRest.ts
import { api } from "~/lib/api";

export type Prioridad = "BAJA" | "NORMAL" | "ALTA" | "URGENTE";

export type MensajeFormal = {
  id: number;
  idUsuarioAutor: number;
  autorUsername: string;
  autorNombre: string | null;
  asunto: string;
  contenido: string;
  prioridad: Prioridad;
  createdAt: string;
};

export type MensajeRecibido = MensajeFormal & {
  leido: boolean;
  fechaLectura: string | null;
  archivado: boolean;
};

export type MensajeEnviado = MensajeFormal & {
  destinatarios: Array<{
    id: number;
    username: string;
    nombre: string | null;
    leido: boolean;
    fechaLectura: string | null;
  }>;
};

export type FiltrosMensaje = {
  noLeidos?: boolean;
  archivados?: boolean;
  prioridad?: Prioridad;
  q?: string;
};

export type EmpresaInfo = {
  id: number;
  nombre: string;
  dbName: string;
};

export type DestinatarioDisponible = {
  id: number;
  username: string;
  nombre: string | null;
  puesto: string | null;
  departamentos: string[];
  empresas: EmpresaInfo[];
};

export type MensajesResponse<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Obtener bandeja de entrada
 */
export async function fetchBandejaEntrada(
  limit: number = 50,
  offset: number = 0,
  filtros: FiltrosMensaje = {}
): Promise<MensajesResponse<MensajeRecibido>> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (filtros.noLeidos) params.set("noLeidos", "1");
  if (filtros.archivados !== undefined) params.set("archivados", filtros.archivados ? "1" : "0");
  if (filtros.prioridad) params.set("prioridad", filtros.prioridad);
  if (filtros.q) params.set("q", filtros.q);

  const { data } = await api.get<MensajesResponse<MensajeRecibido>>(`/mensajes?${params.toString()}`);
  return data;
}

/**
 * Obtener mensajes enviados
 */
export async function fetchMensajesEnviados(
  limit: number = 50,
  offset: number = 0
): Promise<MensajesResponse<MensajeEnviado>> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const { data } = await api.get<MensajesResponse<MensajeEnviado>>(`/mensajes/enviados?${params.toString()}`);
  return data;
}

/**
 * Obtener un mensaje por ID
 */
export async function fetchMensaje(id: number): Promise<{
  data: MensajeRecibido | MensajeEnviado;
  tipo: "recibido" | "enviado";
}> {
  const { data } = await api.get<{
    data: MensajeRecibido | MensajeEnviado;
    tipo: "recibido" | "enviado";
  }>(`/mensajes/${id}`);
  return data;
}

/**
 * Enviar un nuevo mensaje formal
 */
export async function enviarMensaje(
  destinatarios: number[],
  asunto: string,
  contenido: string,
  prioridad: Prioridad = "NORMAL"
): Promise<MensajeFormal> {
  const { data } = await api.post<{ data: MensajeFormal }>("/mensajes", {
    destinatarios,
    asunto,
    contenido,
    prioridad,
  });
  return data.data;
}

/**
 * Marcar mensaje como leído
 */
export async function marcarMensajeLeido(id: number): Promise<void> {
  await api.put(`/mensajes/${id}/leer`);
}

/**
 * Archivar o desarchivar un mensaje
 */
export async function archivarMensaje(id: number, archivado: boolean = true): Promise<void> {
  await api.put(`/mensajes/${id}/archivar`, { archivado });
}

/**
 * Eliminar un mensaje (lo archiva)
 */
export async function eliminarMensaje(id: number): Promise<void> {
  await api.delete(`/mensajes/${id}`);
}

/**
 * Obtener destinatarios disponibles
 */
export async function fetchDestinatarios(): Promise<DestinatarioDisponible[]> {
  const { data } = await api.get<{ data: DestinatarioDisponible[] }>("/mensajes/destinatarios");
  return data.data;
}

/**
 * Contar mensajes no leídos
 */
export async function fetchMensajesNoLeidos(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/mensajes/no-leidos");
  return data.count;
}

/**
 * Obtener el color de la prioridad
 */
export function getColorPrioridad(prioridad: Prioridad): string {
  const colores: Record<Prioridad, string> = {
    BAJA: "bg-slate-100 text-slate-600",
    NORMAL: "bg-blue-100 text-blue-600",
    ALTA: "bg-amber-100 text-amber-600",
    URGENTE: "bg-red-100 text-red-600",
  };
  return colores[prioridad];
}

/**
 * Obtener la etiqueta de la prioridad
 */
export function getEtiquetaPrioridad(prioridad: Prioridad, idioma: "es" | "ca" = "es"): string {
  const etiquetas: Record<Prioridad, { es: string; ca: string }> = {
    BAJA: { es: "Baja", ca: "Baixa" },
    NORMAL: { es: "Normal", ca: "Normal" },
    ALTA: { es: "Alta", ca: "Alta" },
    URGENTE: { es: "Urgente", ca: "Urgent" },
  };
  return etiquetas[prioridad][idioma];
}

/**
 * Formatear fecha para mostrar
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
    return date.toLocaleDateString("es-ES", { weekday: "long" });
  } else {
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
}
