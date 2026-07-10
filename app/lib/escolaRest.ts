import { api } from "~/lib/api";

// =========================================================
// Tipos
// =========================================================
export type Aula = { id: number; Nombre: string; Capacidad: number | null; Observaciones?: string | null };

export type Sesion = {
  id?: number;
  dia: number; // 1=Lunes ... 7=Domingo
  hora: string; // "HH:MM"
  duracion: number;
  idAula: number | null;
  aula?: string | null;
};

export type ConflictoAula = {
  dia: number;
  diaNombre: string;
  hora: string;
  aula: string;
  conClase: string;
  horaExistente: string;
};

export type ClaseRecurrente = {
  id: number;
  Nombre: string;
  IdServicio: number | null;
  NombreInstrumento: string | null;
  CuotaSugerida?: number | null;
  ImporteMatricula?: number | null;
  IdProfesional: number | null;
  NombreProfesor: string | null;
  Tipo: "INDIVIDUAL" | "GRUPAL";
  CapacidadMax: number;
  DiaSemana: number; // 1=Lunes ... 7=Domingo (primera sesión, legacy)
  HoraInicio: string; // "HH:MM:SS"
  DuracionMinutos: number;
  Aula: string | null;
  FechaInicio: string | null;
  FechaFin: string | null;
  Observaciones: string | null;
  Activo: number;
  Ocupacion: number;
  sesiones?: Sesion[];
};

export type MatriculaAlumno = {
  id: number;
  IdCliente: number;
  nombre: string;
  apellido1: string | null;
  apellido2: string | null;
  ImportePreMatricula?: number | null;
  ImporteMatricula?: number | null;
  CuotaMensual: number;
  Estado: string;
  FechaAlta: string;
  FechaBaja: string | null;
  Activo: number;
};

export type ClaseRecurrenteDetalle = ClaseRecurrente & {
  matriculas: MatriculaAlumno[];
};

export type Matricula = {
  id: number;
  IdClaseRecurrente: number | null;
  IdClaseGrupal: number | null;
  NombreClase: string;
  Tipo: string;
  DiaSemana?: number;
  HoraInicio?: string;
  NombreProfesor: string | null;
  NombreInstrumento: string | null;
  IdCliente: number;
  nombre: string;
  apellido1: string | null;
  apellido2: string | null;
  ImportePreMatricula?: number | null;
  ImporteMatricula?: number | null;
  CuotaMensual: number;
  Estado: string;
  FechaAlta: string;
  FechaFin: string | null;
  FechaBaja: string | null;
  Activo: number;
};

export type Asignatura = {
  id: number;
  Nombre: string;
  Descripcion: string | null;
};

export type OpcionesEscola = {
  instrumentos: { id: number; Nombre: string }[];
  profesores: { id: number; NombreCompleto: string; Especialidad: string | null }[];
  alumnos: { id: number; NombreCompleto: string }[];
};

export type ClaseRecurrenteInput = {
  nombre: string;
  idServicio?: number | null;
  idProfesional?: number | null;
  tipo: "INDIVIDUAL" | "GRUPAL";
  capacidadMax: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  sesiones: { dia: number; hora: string; duracion: number; idAula: number | null }[];
  observaciones?: string | null;
  activo?: boolean;
};

// =========================================================
// Helpers
// =========================================================
export const DIAS_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function nombreAlumno(a: { nombre: string; apellido1?: string | null; apellido2?: string | null }) {
  return [a.nombre, a.apellido1, a.apellido2].filter(Boolean).join(" ");
}

// =========================================================
// Aulas
// =========================================================
export async function fetchAulas() {
  const { data } = await api.get<{ data: Aula[] }>("/aulas");
  return data.data;
}
export async function createAula(input: { nombre: string; capacidad?: number | null; observaciones?: string }) {
  const { data } = await api.post<{ id: number }>("/aulas", input);
  return data;
}
export async function updateAula(id: number, input: { nombre?: string; capacidad?: number | null; observaciones?: string }) {
  const { data } = await api.put(`/aulas/${id}`, input);
  return data;
}
export async function deleteAula(id: number) {
  const { data } = await api.delete(`/aulas/${id}`);
  return data;
}

export async function checkConflictosAula(sesiones: { dia: number; hora: string; duracion: number; idAula: number | null }[], idClaseRecurrente?: number) {
  const { data } = await api.post<{ conflictos: ConflictoAula[] }>("/clases-recurrentes/conflictos-aula", { sesiones, idClaseRecurrente });
  return data.conflictos;
}

export async function regenerarCitasClases() {
  const { data } = await api.post<{ success: boolean; generadas: number | null }>("/clases-recurrentes/regenerar-citas", {});
  return data;
}

export async function sincronizarAutonomos() {
  const { data } = await api.post<{ creados: number; actualizados: number; total: number }>("/proveedores/sincronizar-autonomos", {});
  return data;
}

// =========================================================
// Asignaturas (Servicios de tipo asignatura)
// =========================================================
export async function fetchAsignaturas() {
  const { data } = await api.get<{ data: Asignatura[] }>("/asignaturas");
  return data.data;
}
export async function createAsignatura(input: { nombre: string; descripcion?: string | null }) {
  const { data } = await api.post<{ id: number }>("/asignaturas", input);
  return data;
}
export async function updateAsignatura(id: number, input: { nombre?: string; descripcion?: string | null }) {
  const { data } = await api.put(`/asignaturas/${id}`, input);
  return data;
}
export async function deleteAsignatura(id: number) {
  const { data } = await api.delete(`/asignaturas/${id}`);
  return data;
}

// =========================================================
// Clases recurrentes
// =========================================================
export async function fetchClasesRecurrentes(params?: { soloActivas?: boolean; idProfesional?: number }) {
  const { data } = await api.get<{ data: ClaseRecurrente[]; totalCount: number }>("/clases-recurrentes", {
    params: {
      soloActivas: params?.soloActivas !== false ? 1 : 0,
      idProfesional: params?.idProfesional,
    },
  });
  return data;
}

export async function fetchClaseRecurrente(id: number) {
  const { data } = await api.get<ClaseRecurrenteDetalle>(`/clases-recurrentes/${id}`);
  return data;
}

export async function createClaseRecurrente(input: ClaseRecurrenteInput) {
  const { data } = await api.post<{ id: number }>("/clases-recurrentes", input);
  return data;
}

export async function updateClaseRecurrente(id: number, input: Partial<ClaseRecurrenteInput>) {
  const { data } = await api.put<{ success: boolean; id: number }>(`/clases-recurrentes/${id}`, input);
  return data;
}

export async function deleteClaseRecurrente(id: number) {
  const { data } = await api.delete<{ success: boolean }>(`/clases-recurrentes/${id}`);
  return data;
}

// =========================================================
// Matrículas
// =========================================================
export async function fetchMatriculas(params?: { idClase?: number; idCliente?: number; idServicio?: number; idProfesional?: number; soloActivas?: boolean }) {
  const { data } = await api.get<{ data: Matricula[]; totalCount: number }>("/matriculas", {
    params: {
      idClase: params?.idClase,
      idCliente: params?.idCliente,
      idServicio: params?.idServicio,
      idProfesional: params?.idProfesional,
      soloActivas: params?.soloActivas !== false ? 1 : 0,
    },
  });
  return data;
}

export async function createMatricula(input: { idClaseRecurrente: number; idCliente: number; cuotaMensual: number }) {
  const { data } = await api.post<{ id: number }>("/matriculas", input);
  return data;
}

export async function updateMatricula(id: number, input: { cuotaMensual?: number; estado?: string }) {
  const { data } = await api.put<{ success: boolean }>(`/matriculas/${id}`, input);
  return data;
}

export async function deleteMatricula(id: number) {
  const { data } = await api.delete<{ success: boolean }>(`/matriculas/${id}`);
  return data;
}

// =========================================================
// Opciones (selects)
// =========================================================
export async function fetchOpcionesEscola() {
  const { data } = await api.get<OpcionesEscola>("/escola/opciones");
  return data;
}