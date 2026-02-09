// app/lib/agendaRest.ts
import { api } from "~/lib/api";

export interface Cita {
  IdCita: number;
  IdCliente: number | null;
  NombreContacto: string | null;
  TelefonoContacto: string | null;
  EmailContacto: string | null;
  FechaHoraInicio: string;
  FechaHoraFin: string;
  TodoElDia: boolean;
  MotivoVisita: string | null;
  TipoCita: string;
  Observaciones: string | null;
  Estado: string;
  IdProfesional: number | null;
  Color: string;
  Recordatorio: boolean;
  MinutosRecordatorio: number;
  Activo: number;
  // Campos joined
  NombreCompleto?: string;
  NombreCliente?: string;
  NombreProfesional?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
}

export interface ClienteBusqueda {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export const TIPOS_CITA = [
  { value: "GENERAL", label: "General", color: "#3b82f6" },
  { value: "REVISION", label: "Revisión", color: "#8b5cf6" },
  { value: "RECOGIDA", label: "Recogida", color: "#10b981" },
  { value: "AJUSTE", label: "Ajuste", color: "#f59e0b" },
  { value: "CONSULTA", label: "Consulta", color: "#6366f1" },
  { value: "OTRO", label: "Otro", color: "#64748b" },
] as const;

export const ESTADOS_CITA = [
  { value: "PROGRAMADA", label: "Programada", color: "#3b82f6" },
  { value: "CONFIRMADA", label: "Confirmada", color: "#10b981" },
  { value: "COMPLETADA", label: "Completada", color: "#6b7280" },
  { value: "CANCELADA", label: "Cancelada", color: "#ef4444" },
  { value: "NO_ASISTIO", label: "No asistió", color: "#f59e0b" },
] as const;

export const COLORES_CITA = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#64748b", // slate
];

export async function getCitas(
  inicio: string,
  fin: string,
  idProfesional?: number,
  estado?: string
): Promise<Cita[]> {
  const params: Record<string, any> = { inicio, fin };
  if (idProfesional) params.idProfesional = idProfesional;
  if (estado) params.estado = estado;

  const { data } = await api.get<{ rows: Cita[] }>("/agenda/citas", { params });
  return data.rows;
}

export async function getCita(id: number): Promise<Cita> {
  const { data } = await api.get(`/agenda/citas/${id}`);
  return data;
}

export async function createCita(cita: Partial<Cita>): Promise<Cita> {
  const { data } = await api.post("/agenda/citas", cita);
  return data;
}

export async function updateCita(id: number, cita: Partial<Cita>): Promise<Cita> {
  const { data } = await api.put(`/agenda/citas/${id}`, cita);
  return data;
}

export async function deleteCita(id: number): Promise<void> {
  await api.delete(`/agenda/citas/${id}`);
}

export async function cambiarEstadoCita(id: number, estado: string): Promise<Cita> {
  const { data } = await api.put(`/agenda/citas/${id}/estado`, { estado });
  return data;
}

export async function getCitasDia(fecha: string, idProfesional?: number): Promise<Cita[]> {
  const params: Record<string, any> = {};
  if (idProfesional) params.idProfesional = idProfesional;

  const { data } = await api.get<{ rows: Cita[] }>(`/agenda/citas-dia/${fecha}`, { params });
  return data.rows;
}

export async function buscarClientes(q: string): Promise<ClienteBusqueda[]> {
  if (!q || q.length < 2) return [];
  const { data } = await api.get<{ rows: ClienteBusqueda[] }>("/agenda/buscar-clientes", { params: { q } });
  return data.rows;
}
