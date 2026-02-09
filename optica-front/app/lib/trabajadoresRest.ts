// app/lib/trabajadoresRest.ts
// Ahora usa /rrhh/usuarios - los trabajadores son usuarios en gestio_master
import { api } from "~/lib/api";

// Interfaz actualizada para usuarios como trabajadores
export interface Trabajador {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
  dni: string | null;
  telefono: string | null;
  puesto: string | null;
  id_convenio: number | null;
  nombre_convenio?: string | null;
  horas_anuales?: number;
  dias_vacaciones?: number;
  dias_convenio?: number;
  fecha_alta: string | null;
  fecha_baja: string | null;
  observaciones: string | null;
  activo: boolean;

  // Alias para compatibilidad con código antiguo (siempre definidos por normalize)
  IdTrabajador: number;
  Nombre: string;
  Apellidos: string;
  DNI: string | null;
  Email: string | null;
  Telefono: string | null;
  Puesto: string | null;
  IdConvenio: number | null;
  NombreConvenio: string | null;
  HorasAnuales: number;
  DiasVacaciones: number;
  DiasConvenio: number;
  FechaAlta: string | null;
  FechaBaja: string | null;
  Observaciones: string | null;
  Activo: number;
}

export interface HorarioDia {
  id?: number;
  id_usuario?: number;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  minutos_descanso: number;

  // Alias para compatibilidad (siempre definidos por normalize)
  IdHorario: number;
  IdTrabajador: number;
  DiaSemana: number;
  HoraInicio: string | null;
  HoraFin: string | null;
  MinutosDescanso: number;
}

export interface Ausencia {
  id: number;
  id_usuario: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  computable: boolean;
  descripcion: string | null;
  estado: string;
  activo: boolean;

  // Alias para compatibilidad (siempre definidos por normalize)
  IdAusencia: number;
  IdTrabajador: number;
  TipoAusencia: string;
  FechaInicio: string;
  FechaFin: string | null;
  Computable: boolean;
  Descripcion: string | null;
  Estado: string;
  Activo: number;
}

// Helper para normalizar respuesta del backend y añadir alias de compatibilidad
function normalizeTrabajador(t: any): Trabajador {
  return {
    ...t,
    // Alias para código antiguo
    IdTrabajador: t.id,
    Nombre: t.nombre ?? "",
    Apellidos: "", // Ya no hay apellidos separados
    DNI: t.dni ?? null,
    Email: t.email ?? null,
    Telefono: t.telefono ?? null,
    Puesto: t.puesto ?? null,
    IdConvenio: t.id_convenio ?? null,
    NombreConvenio: t.nombre_convenio ?? null,
    HorasAnuales: t.horas_anuales ?? 0,
    DiasVacaciones: t.dias_vacaciones ?? 22,
    DiasConvenio: t.dias_convenio ?? 0,
    FechaAlta: t.fecha_alta ?? null,
    FechaBaja: t.fecha_baja ?? null,
    Observaciones: t.observaciones ?? null,
    Activo: t.activo ? 1 : 0,
  };
}

function normalizeHorario(h: any): HorarioDia {
  return {
    ...h,
    dia_semana: h.dia_semana ?? 0,
    hora_inicio: h.hora_inicio ?? null,
    hora_fin: h.hora_fin ?? null,
    minutos_descanso: h.minutos_descanso ?? 0,
    // Alias para código antiguo
    IdHorario: h.id ?? 0,
    IdTrabajador: h.id_usuario ?? 0,
    DiaSemana: h.dia_semana ?? 0,
    HoraInicio: h.hora_inicio ?? null,
    HoraFin: h.hora_fin ?? null,
    MinutosDescanso: h.minutos_descanso ?? 0,
  };
}

function normalizeAusencia(a: any): Ausencia {
  return {
    ...a,
    // Alias para código antiguo
    IdAusencia: a.id ?? 0,
    IdTrabajador: a.id_usuario ?? 0,
    TipoAusencia: a.tipo ?? "",
    FechaInicio: a.fecha_inicio ?? "",
    FechaFin: a.fecha_fin ?? null,
    Computable: a.computable ?? true,
    Descripcion: a.descripcion ?? null,
    Estado: a.estado ?? "APROBADA",
    Activo: a.activo ? 1 : 0,
  };
}

export async function fetchTrabajadores(soloActivos = true): Promise<Trabajador[]> {
  const { data } = await api.get<{ rows: any[] }>("/rrhh/usuarios", {
    params: { soloActivos: soloActivos ? 1 : 0 },
  });
  return data.rows.map(normalizeTrabajador);
}

export async function getTrabajador(id: number): Promise<Trabajador> {
  const { data } = await api.get(`/rrhh/usuarios/${id}`);
  return normalizeTrabajador(data);
}

export async function createTrabajador(input: Partial<Trabajador>): Promise<Trabajador> {
  // No se pueden crear usuarios desde aquí, solo actualizar datos de trabajador
  // Los usuarios se crean desde el panel de administración
  throw new Error("Los usuarios se crean desde el panel de administración");
}

export async function updateTrabajador(id: number, input: Partial<Trabajador>): Promise<Trabajador> {
  // Normalizar campos de entrada (aceptar tanto snake_case como PascalCase)
  const payload = {
    dni: input.dni ?? input.DNI,
    telefono: input.telefono ?? input.Telefono,
    puesto: input.puesto ?? input.Puesto,
    id_convenio: input.id_convenio ?? input.IdConvenio,
    fecha_alta: input.fecha_alta ?? input.FechaAlta,
    fecha_baja: input.fecha_baja ?? input.FechaBaja,
    observaciones: input.observaciones ?? input.Observaciones,
  };

  const { data } = await api.put(`/rrhh/usuarios/${id}`, payload);
  return normalizeTrabajador(data);
}

export async function deleteTrabajador(id: number): Promise<void> {
  // En lugar de eliminar, desactivar
  await api.put(`/rrhh/usuarios/${id}`, { activo: false });
}

export async function getTrabajadorHorario(id: number): Promise<HorarioDia[]> {
  const { data } = await api.get<{ rows: any[] }>(`/rrhh/usuarios/${id}/horario`);
  return data.rows.map(normalizeHorario);
}

export async function updateTrabajadorHorario(id: number, horarios: HorarioDia[]): Promise<HorarioDia[]> {
  // Normalizar campos (aceptar tanto snake_case como PascalCase)
  const payload = horarios.map((h) => ({
    dia_semana: h.dia_semana ?? h.DiaSemana,
    hora_inicio: h.hora_inicio ?? h.HoraInicio,
    hora_fin: h.hora_fin ?? h.HoraFin,
    minutos_descanso: h.minutos_descanso ?? h.MinutosDescanso ?? 0,
  }));

  const { data } = await api.put<{ rows: any[] }>(`/rrhh/usuarios/${id}/horario`, { horarios: payload });
  return data.rows.map(normalizeHorario);
}

export async function getTrabajadorAusencias(id: number, anyo?: number): Promise<Ausencia[]> {
  const { data } = await api.get<{ rows: any[] }>(`/rrhh/usuarios/${id}/ausencias`, {
    params: anyo ? { anyo } : {},
  });
  return data.rows.map(normalizeAusencia);
}

export async function createTrabajadorAusencia(
  id: number,
  ausencia: Partial<Ausencia>
): Promise<Ausencia> {
  // Normalizar campos
  const payload = {
    tipo: ausencia.tipo ?? ausencia.TipoAusencia,
    fecha_inicio: ausencia.fecha_inicio ?? ausencia.FechaInicio,
    fecha_fin: ausencia.fecha_fin ?? ausencia.FechaFin,
    computable: ausencia.computable ?? ausencia.Computable,
    descripcion: ausencia.descripcion ?? ausencia.Descripcion,
    estado: ausencia.estado ?? ausencia.Estado,
  };

  const { data } = await api.post(`/rrhh/usuarios/${id}/ausencias`, payload);
  return normalizeAusencia(data);
}

export async function deleteTrabajadorAusencia(idUsuario: number, idAusencia: number): Promise<void> {
  await api.delete(`/rrhh/usuarios/${idUsuario}/ausencias/${idAusencia}`);
}
