// app/lib/serviciosRest.ts
import { api } from "~/lib/api";

export type SubFamiliaServicio = {
  id: number;
  descripcion: string;
  activa: boolean;
};

export type FamiliaServicio = {
  id: number;
  descripcion: string;
  activa: boolean;
  subfamilias: SubFamiliaServicio[];
};

export type ServicioSubfamilia = {
  id: number;
  nombre: string;
  idFamilia: number;
  nombreFamilia: string;
};

export type Servicio = {
  id: number;
  Codigo: string | null;
  Nombre: string;
  Descripcion: string | null;
  PVP: number;
  PrecioCoste: number;
  PorcentajeIva: number;
  DuracionMinutos: number;
  RequiereCita: boolean;
  Observaciones: string | null;
  Activo: boolean;
  subfamilias: ServicioSubfamilia[];
  NombreFamilia: string | null;
  NombreSubFamilia: string | null;
};

export type ServicioInput = {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  pvp?: number;
  precioCoste?: number;
  porcentajeIva?: number;
  duracionMinutos?: number;
  requiereCita?: boolean;
  observaciones?: string;
  subfamilias?: number[];
};

export async function fetchFamiliasServicios(soloActivas = true) {
  const { data } = await api.get<FamiliaServicio[]>("/familias-servicios-full", {
    params: { soloActivas: soloActivas ? 1 : 0 },
  });
  return data;
}

export async function fetchServicios(params?: {
  take?: number;
  offset?: number;
  soloActivos?: boolean;
  idFamilia?: number;
  idSubFamilia?: number;
  q?: string;
}) {
  const { data } = await api.get<{ data: Servicio[]; totalCount: number }>("/servicios-full", {
    params: {
      take: params?.take ?? 100,
      offset: params?.offset ?? 0,
      soloActivos: params?.soloActivos !== false ? 1 : 0,
      idFamilia: params?.idFamilia,
      idSubFamilia: params?.idSubFamilia,
      q: params?.q,
    },
  });
  return data;
}

export async function fetchServicio(id: number) {
  const { data } = await api.get<Servicio>(`/servicios/${id}`);
  return data;
}

export async function createServicio(input: ServicioInput) {
  const { data } = await api.post<{ id: number; nombre: string }>("/servicios", input);
  return data;
}

export async function updateServicio(id: number, input: Partial<ServicioInput> & { activo?: boolean }) {
  const { data } = await api.put<{ success: boolean; id: number }>(`/servicios/${id}`, input);
  return data;
}

export async function deleteServicio(id: number) {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/servicios/${id}`);
  return data;
}
