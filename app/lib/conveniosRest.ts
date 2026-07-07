// app/lib/conveniosRest.ts
// Ahora usa /rrhh/convenios - los convenios están en gestio_master
import { api } from "~/lib/api";

export interface Convenio {
  id: number;
  nombre: string;
  horas_anuales: number;
  dias_vacaciones: number;
  dias_convenio: number;
  descripcion: string | null;
  activo: boolean;

  // Alias para compatibilidad con código antiguo (siempre definidos por normalize)
  IdConvenio: number;
  Nombre: string;
  HorasAnuales: number;
  DiasVacaciones: number;
  DiasConvenio: number;
  Descripcion: string | null;
  Activo: number;
}

// Helper para normalizar respuesta del backend
function normalizeConvenio(c: any): Convenio {
  return {
    ...c,
    // Alias para código antiguo
    IdConvenio: c.id ?? 0,
    Nombre: c.nombre ?? "",
    HorasAnuales: c.horas_anuales ?? 1800,
    DiasVacaciones: c.dias_vacaciones ?? 22,
    DiasConvenio: c.dias_convenio ?? 0,
    Descripcion: c.descripcion ?? null,
    Activo: c.activo ? 1 : 0,
  };
}

export async function fetchConvenios(soloActivos = true): Promise<Convenio[]> {
  const { data } = await api.get<{ rows: any[] }>("/rrhh/convenios", {
    params: { soloActivos: soloActivos ? 1 : 0 },
  });
  return data.rows.map(normalizeConvenio);
}

export async function getConvenio(id: number): Promise<Convenio> {
  // No hay endpoint individual, buscar en la lista
  const convenios = await fetchConvenios(false);
  const convenio = convenios.find((c) => c.id === id);
  if (!convenio) {
    throw new Error("Convenio no encontrado");
  }
  return convenio;
}

export async function createConvenio(input: Partial<Convenio>): Promise<Convenio> {
  // Normalizar campos (aceptar tanto snake_case como PascalCase)
  const payload = {
    nombre: input.nombre ?? input.Nombre,
    horas_anuales: input.horas_anuales ?? input.HorasAnuales ?? 1800,
    dias_vacaciones: input.dias_vacaciones ?? input.DiasVacaciones ?? 22,
    dias_convenio: input.dias_convenio ?? input.DiasConvenio ?? 0,
    descripcion: input.descripcion ?? input.Descripcion,
  };

  const { data } = await api.post("/rrhh/convenios", payload);
  return normalizeConvenio(data);
}

export async function updateConvenio(id: number, input: Partial<Convenio>): Promise<Convenio> {
  // Normalizar campos
  const payload: Record<string, any> = {};

  if (input.nombre !== undefined || input.Nombre !== undefined) {
    payload.nombre = input.nombre ?? input.Nombre;
  }
  if (input.horas_anuales !== undefined || input.HorasAnuales !== undefined) {
    payload.horas_anuales = input.horas_anuales ?? input.HorasAnuales;
  }
  if (input.dias_vacaciones !== undefined || input.DiasVacaciones !== undefined) {
    payload.dias_vacaciones = input.dias_vacaciones ?? input.DiasVacaciones;
  }
  if (input.dias_convenio !== undefined || input.DiasConvenio !== undefined) {
    payload.dias_convenio = input.dias_convenio ?? input.DiasConvenio;
  }
  if (input.descripcion !== undefined || input.Descripcion !== undefined) {
    payload.descripcion = input.descripcion ?? input.Descripcion;
  }
  if (input.activo !== undefined || input.Activo !== undefined) {
    payload.activo = input.activo ?? (input.Activo === 1);
  }

  const { data } = await api.put(`/rrhh/convenios/${id}`, payload);
  return normalizeConvenio(data);
}

export async function deleteConvenio(id: number): Promise<void> {
  // En lugar de eliminar, desactivar
  await api.put(`/rrhh/convenios/${id}`, { activo: false });
}
