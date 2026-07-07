// app/lib/controlHorarioRest.ts
// Control horario - usa usuarios de gestio_master
import { api } from "~/lib/api";

// Nueva interfaz con snake_case (backend actualizado)
export interface ResumenUsuario {
  id: number;
  nombre: string;
  username: string;
  nombre_convenio: string | null;
  horas_convenio: number;
  dias_vacaciones_convenio: number;
  dias_convenio_extra: number;
  dias_laborables_anyo: number;
  horas_segun_horario: number;
  diferencia_horas: number;
  dias_a_compensar: number;
  dias_vacaciones_usados: number;
  dias_convenio_usados: number;
  dias_vacaciones_pendientes: number;
  dias_convenio_pendientes: number;
  horas_promedio_semanal: number;
}

// Alias para compatibilidad con código antiguo (siempre definidos por normalize)
export interface ResumenTrabajador extends ResumenUsuario {
  IdTrabajador: number;
  Nombre: string;
  Apellidos: string;
  NombreConvenio: string | null;
  HorasConvenio: number;
  DiasVacacionesConvenio: number;
  DiasConvenioExtra: number;
  DiasLaborablesAnyo: number;
  HorasSegunHorario: number;
  DiferenciaHoras: number;
  DiasACompensar: number;
  DiasVacacionesUsados: number;
  DiasConvenioUsados: number;
  DiasVacacionesPendientes: number;
  DiasConvenioPendientes: number;
  HorasPromedioSemanal: number;
}

export interface DiaCalendario {
  fecha: string;
  diaSemana: number;
  esFestivo: boolean;
  nombreFestivo: string | null;
  tipoFestivo: string | null;
  esFinDeSemana: boolean;
  esAusencia: boolean;
  tipoAusencia: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  minutosDescanso: number;
  horasTrabajo: number;
  esLaborable: boolean;
}

export interface CalendarioUsuario {
  id: number;
  nombre: string;
  dias: DiaCalendario[];
}

// Alias para compatibilidad
export interface CalendarioTrabajador extends CalendarioUsuario {}

// Helper para normalizar ResumenUsuario y añadir alias
function normalizeResumen(r: any): ResumenTrabajador {
  return {
    ...r,
    // Alias para código antiguo
    IdTrabajador: r.id,
    Nombre: r.nombre,
    Apellidos: "", // Ya no hay apellidos separados
    NombreConvenio: r.nombre_convenio,
    HorasConvenio: r.horas_convenio,
    DiasVacacionesConvenio: r.dias_vacaciones_convenio,
    DiasConvenioExtra: r.dias_convenio_extra,
    DiasLaborablesAnyo: r.dias_laborables_anyo,
    HorasSegunHorario: r.horas_segun_horario,
    DiferenciaHoras: r.diferencia_horas,
    DiasACompensar: r.dias_a_compensar,
    DiasVacacionesUsados: r.dias_vacaciones_usados,
    DiasConvenioUsados: r.dias_convenio_usados,
    DiasVacacionesPendientes: r.dias_vacaciones_pendientes,
    DiasConvenioPendientes: r.dias_convenio_pendientes,
    HorasPromedioSemanal: r.horas_promedio_semanal,
  };
}

export async function getCalculoHorasAnuales(anyo: number): Promise<{
  anyo: number;
  usuarios: ResumenTrabajador[];
  // Alias para compatibilidad
  trabajadores?: ResumenTrabajador[];
}> {
  const { data } = await api.get(`/control-horario/calculo-horas/${anyo}`);

  const usuarios = (data.usuarios || []).map(normalizeResumen);

  return {
    anyo: data.anyo,
    usuarios,
    trabajadores: usuarios, // Alias para compatibilidad
  };
}

export async function getCalculoHorasUsuario(
  anyo: number,
  idUsuario: number
): Promise<{
  anyo: number;
  usuario: ResumenTrabajador;
  // Alias para compatibilidad
  trabajador?: ResumenTrabajador;
}> {
  const { data } = await api.get(`/control-horario/calculo-horas/${anyo}/${idUsuario}`);

  const usuario = normalizeResumen(data.usuario);

  return {
    anyo: data.anyo,
    usuario,
    trabajador: usuario, // Alias para compatibilidad
  };
}

// Alias para compatibilidad
export async function getCalculoHorasTrabajador(
  anyo: number,
  idTrabajador: number
): Promise<{
  anyo: number;
  trabajador: ResumenTrabajador;
}> {
  const result = await getCalculoHorasUsuario(anyo, idTrabajador);
  return {
    anyo: result.anyo,
    trabajador: result.usuario,
  };
}

export async function getCalendarioMes(
  anyo: number,
  mes: number,
  idUsuario?: number
): Promise<{
  anyo: number;
  mes: number;
  usuarios: CalendarioUsuario[];
  // Alias para compatibilidad
  trabajadores?: CalendarioTrabajador[];
}> {
  const { data } = await api.get(`/control-horario/calendario/${anyo}/${mes}`, {
    params: idUsuario ? { idUsuario } : {},
  });

  const usuarios = data.usuarios || [];

  return {
    anyo: data.anyo,
    mes: data.mes,
    usuarios,
    trabajadores: usuarios, // Alias para compatibilidad
  };
}
