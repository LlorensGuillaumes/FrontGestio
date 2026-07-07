// app/lib/festivosRest.ts
import { api } from "~/lib/api";

export interface FestivoEmpresa {
  IdFestivo: number;
  Nombre: string;
  TipoFestivo: "NACIONAL" | "AUTONOMICO" | "LOCAL" | "OTRO";
  FechaInicio: string;
  FechaFin: string | null;
  Anual: boolean;
  Anyo: number | null;
  Observaciones: string | null;
  Activo: number;
}

export const TIPOS_FESTIVO = [
  { value: "NACIONAL", label: "Nacional" },
  { value: "AUTONOMICO", label: "Autonómico" },
  { value: "LOCAL", label: "Local" },
  { value: "OTRO", label: "Otro" },
] as const;

export async function fetchFestivos(anyo?: number, soloActivos = true): Promise<FestivoEmpresa[]> {
  const { data } = await api.get<{ rows: FestivoEmpresa[] }>("/festivos-empresa-full", {
    params: {
      soloActivos: soloActivos ? 1 : 0,
      ...(anyo ? { anyo } : {}),
    },
  });
  return data.rows;
}

export async function getFestivo(id: number): Promise<FestivoEmpresa> {
  const { data } = await api.get(`/festivos-empresa/${id}`);
  return data;
}

export async function createFestivo(input: Partial<FestivoEmpresa>): Promise<FestivoEmpresa> {
  const { data } = await api.post("/festivos-empresa-post", input);
  return data;
}

export async function updateFestivo(id: number, input: Partial<FestivoEmpresa>): Promise<FestivoEmpresa> {
  const { data } = await api.put(`/festivos-empresa-put/${id}`, input);
  return data;
}

export async function deleteFestivo(id: number): Promise<void> {
  await api.delete(`/festivos-empresa/${id}`);
}
