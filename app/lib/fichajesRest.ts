// app/lib/fichajesRest.ts
import axios from "axios";
import { api } from "./api";

// Cliente sin autenticación para fichar (usa credenciales en body)
const apiPublic = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Tipos
export interface Fichaje {
  id: number;
  id_usuario: number;
  id_usuario_registro: number;
  fecha: string;
  hora: string;
  tipo: "ENTRADA" | "SALIDA";
  ip_address: string | null;
  es_correccion: boolean;
  id_fichaje_original: number | null;
  motivo_correccion: string | null;
  advertencias: string[];
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  nombre_usuario?: string;
  username?: string;
}

export interface EstadoFichaje {
  ultimoFichaje: Fichaje | null;
  tipoSugerido: "ENTRADA" | "SALIDA";
  horasTrabajadasHoy: number;
  advertencias: string[];
  usuario?: {
    id: number;
    nombre: string;
  };
}

export interface ResultadoFichaje {
  success: boolean;
  fichaje?: Fichaje;
  advertencias: string[];
  mensaje: string;
  usuario?: {
    id: number;
    nombre: string;
  };
}

export interface ResumenMensualUsuario {
  id_usuario: number;
  nombre: string;
  username: string;
  horas_trabajadas: number;
  dias_trabajados: number;
  fichajes_incompletos: number;
  advertencias_count: number;
}

export interface FiltrosFichajes {
  idUsuario?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  tipo?: "ENTRADA" | "SALIDA";
  soloConAdvertencias?: boolean;
}

// Códigos de advertencia para mostrar mensajes amigables
export const MENSAJES_ADVERTENCIA: Record<string, { es: string; ca: string }> = {
  ENTRADA_SIN_SALIDA_PREVIA: {
    es: "No fichaste salida en tu turno anterior",
    ca: "No vas fitxar sortida en el torn anterior",
  },
  EXCESO_HORAS_24: {
    es: "Han pasado más de 24h desde tu última entrada",
    ca: "Han passat més de 24h des de la teva última entrada",
  },
  EXCESO_HORAS_12: {
    es: "Han pasado más de 12h desde tu última entrada",
    ca: "Han passat més de 12h des de la teva última entrada",
  },
  FUERA_HORARIO: {
    es: "Fichaje fuera de tu horario habitual",
    ca: "Fitxatge fora del teu horari habitual",
  },
  SALIDA_SIN_ENTRADA: {
    es: "No hay fichaje de entrada hoy",
    ca: "No hi ha fitxatge d'entrada avui",
  },
};

// =====================================================
// FUNCIONES PÚBLICAS (sin autenticación)
// =====================================================

/**
 * Fichar entrada/salida (no requiere sesión)
 */
export async function fichar(
  username: string,
  password: string,
  tipo?: "ENTRADA" | "SALIDA",
  observaciones?: string
): Promise<ResultadoFichaje> {
  const response = await apiPublic.post("/fichajes/fichar", {
    username,
    password,
    tipo,
    observaciones,
  });
  return response.data;
}

/**
 * Obtener estado de fichaje por username (para el modal antes de fichar)
 */
export async function getEstadoPorUsername(username: string): Promise<EstadoFichaje> {
  const response = await apiPublic.get(`/fichajes/estado-por-username/${encodeURIComponent(username)}`);
  return response.data;
}

// =====================================================
// FUNCIONES PROTEGIDAS (requieren autenticación)
// =====================================================

/**
 * Obtener estado de fichaje de un usuario
 */
export async function getEstadoUsuario(idUsuario: number): Promise<EstadoFichaje> {
  const response = await api.get(`/fichajes/estado/${idUsuario}`);
  return response.data;
}

/**
 * Obtener listado de fichajes con filtros
 */
export async function getFichajes(filtros?: FiltrosFichajes): Promise<{ rows: Fichaje[]; totalCount: number }> {
  const params = new URLSearchParams();

  if (filtros?.idUsuario) params.append("idUsuario", String(filtros.idUsuario));
  if (filtros?.fechaDesde) params.append("fechaDesde", filtros.fechaDesde);
  if (filtros?.fechaHasta) params.append("fechaHasta", filtros.fechaHasta);
  if (filtros?.tipo) params.append("tipo", filtros.tipo);
  if (filtros?.soloConAdvertencias) params.append("soloConAdvertencias", "true");

  const response = await api.get(`/fichajes?${params.toString()}`);
  return response.data;
}

/**
 * Obtener fichajes de un usuario específico
 */
export async function getFichajesUsuario(
  idUsuario: number,
  fechaDesde?: string,
  fechaHasta?: string
): Promise<{ rows: Fichaje[]; totalCount: number }> {
  const params = new URLSearchParams();
  if (fechaDesde) params.append("fechaDesde", fechaDesde);
  if (fechaHasta) params.append("fechaHasta", fechaHasta);

  const response = await api.get(`/fichajes/usuario/${idUsuario}?${params.toString()}`);
  return response.data;
}

/**
 * Corregir un fichaje existente
 */
export async function corregirFichaje(
  idFichaje: number,
  hora: string,
  tipo: "ENTRADA" | "SALIDA",
  motivo: string
): Promise<ResultadoFichaje> {
  const response = await api.put(`/fichajes/${idFichaje}`, {
    hora,
    tipo,
    motivo,
  });
  return response.data;
}

/**
 * Eliminar un fichaje (soft delete)
 */
export async function eliminarFichaje(idFichaje: number): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(`/fichajes/${idFichaje}`);
  return response.data;
}

/**
 * Crear fichaje manual (admin)
 */
export async function crearFichajeManual(
  idUsuario: number,
  fecha: string,
  hora: string,
  tipo: "ENTRADA" | "SALIDA",
  motivo: string
): Promise<ResultadoFichaje> {
  const response = await api.post("/fichajes/manual", {
    idUsuario,
    fecha,
    hora,
    tipo,
    motivo,
  });
  return response.data;
}

/**
 * Obtener resumen mensual de fichajes
 */
export async function getResumenMensual(
  anyo: number,
  mes: number
): Promise<{ anyo: number; mes: number; usuarios: ResumenMensualUsuario[]; totalCount: number }> {
  const response = await api.get(`/fichajes/resumen/${anyo}/${mes}`);
  return response.data;
}
