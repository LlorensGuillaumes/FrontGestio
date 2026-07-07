// app/lib/notificacionesRest.ts
import { api } from "~/lib/api";

export type Notificacion = {
  id: number;
  idTipo: number;
  tipoNombre: string;
  tipoCodigo: string;
  titulo: string;
  mensaje: string;
  datos: Record<string, unknown>;
  leida: boolean;
  fechaLectura: string | null;
  createdAt: string;
};

export type TipoNotificacion = {
  id: number;
  codigo: string;
  nombreEs: string;
  nombreCa: string;
  descripcion: string | null;
  permisoRequerido: string | null;
  activo: boolean;
};

export type PreferenciaNotificacion = {
  idTipoNotificacion: number;
  tipoCodigo: string;
  tipoNombreEs: string;
  tipoNombreCa: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
};

export type NotificacionesResponse = {
  data: Notificacion[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Obtener notificaciones del usuario
 */
export async function fetchNotificaciones(
  limit: number = 50,
  offset: number = 0,
  noLeidas: boolean = false
): Promise<NotificacionesResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (noLeidas) params.set("noLeidas", "1");

  const { data } = await api.get<NotificacionesResponse>(`/notificaciones?${params.toString()}`);
  return data;
}

/**
 * Contar notificaciones no leídas
 */
export async function fetchNotificacionesCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/notificaciones/count");
  return data.count;
}

/**
 * Marcar una notificación como leída
 */
export async function marcarNotificacionLeida(id: number): Promise<void> {
  await api.put(`/notificaciones/${id}/leer`);
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function marcarTodasLeidas(): Promise<void> {
  await api.put("/notificaciones/leer-todas");
}

/**
 * Eliminar una notificación
 */
export async function eliminarNotificacion(id: number): Promise<void> {
  await api.delete(`/notificaciones/${id}`);
}

/**
 * Obtener tipos de notificación
 */
export async function fetchTiposNotificacion(): Promise<TipoNotificacion[]> {
  const { data } = await api.get<{ data: TipoNotificacion[] }>("/notificaciones/tipos");
  return data.data;
}

/**
 * Obtener preferencias de notificación del usuario
 */
export async function fetchPreferenciasNotificacion(): Promise<PreferenciaNotificacion[]> {
  const { data } = await api.get<{ data: PreferenciaNotificacion[] }>("/notificaciones/preferencias");
  return data.data;
}

/**
 * Actualizar preferencias de notificación
 */
export async function actualizarPreferencias(
  preferencias: Array<{
    idTipoNotificacion: number;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }>
): Promise<void> {
  await api.put("/notificaciones/preferencias", { preferencias });
}

/**
 * Obtener el ícono según el tipo de notificación
 */
export function getIconoNotificacion(tipoCodigo: string): string {
  const iconos: Record<string, string> = {
    stock_bajo: "warning",
    stock_critico: "error",
    mensaje_nuevo: "mail",
    chat_nuevo: "chat",
    sistema: "info",
  };
  return iconos[tipoCodigo] ?? "notifications";
}

/**
 * Obtener el color según el tipo de notificación
 */
export function getColorNotificacion(tipoCodigo: string): string {
  const colores: Record<string, string> = {
    stock_bajo: "text-amber-600",
    stock_critico: "text-red-600",
    mensaje_nuevo: "text-blue-600",
    chat_nuevo: "text-green-600",
    sistema: "text-slate-600",
  };
  return colores[tipoCodigo] ?? "text-slate-600";
}
