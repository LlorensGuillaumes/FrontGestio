// app/lib/profesionalesRest.ts
import { api } from "~/lib/api";

export type Profesional = {
  id: number;
  nombreCompleto: string;
  especialidad: string | null;
  numColegiado: string | null;
  idUsuario?: number | null;
  nombreTrabajador?: string | null;
  tipoRelacion?: string | null;
  activo: boolean;
};

export async function fetchProfesionales(soloActivos = true) {
  const { data } = await api.get<{ rows: Profesional[]; totalCount: number }>("/profesionales", {
    params: { soloActivos: soloActivos ? 1 : 0 },
  });
  return data.rows;
}

export async function fetchProfesional(id: number) {
  const { data } = await api.get<Profesional>(`/profesionales/${id}`);
  return data;
}

export async function createProfesional(input: Omit<Profesional, "id">) {
  const { data } = await api.post<Profesional>("/profesionales", input);
  return data;
}

export async function updateProfesional(id: number, input: Partial<Omit<Profesional, "id">>) {
  const { data } = await api.put<Profesional>(`/profesionales/${id}`, input);
  return data;
}

export async function deleteProfesional(id: number) {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/profesionales/${id}`);
  return data;
}
