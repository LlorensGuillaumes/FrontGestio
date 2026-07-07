import { api } from "~/lib/api";

export type SubDescuento = {
  id: number;
  id_familia: number;
  nombre: string;
  descripcion: string | null;
  descuento_porcentaje: number;
};

export type FamiliaDescuento = {
  id: number;
  nombre: string;
  descripcion: string | null;
  aplica_cuota: boolean;
  aplica_matricula: boolean;
  subfamilias: SubDescuento[];
};

export async function fetchDescuentos() {
  const { data } = await api.get<{ data: FamiliaDescuento[] }>("/descuentos");
  return data.data;
}

// Familias
export async function createFamilia(input: { nombre: string; descripcion?: string; aplicaCuota: boolean; aplicaMatricula: boolean }) {
  const { data } = await api.post<{ id: number }>("/descuentos/familias", input);
  return data;
}
export async function updateFamilia(id: number, input: Partial<{ nombre: string; descripcion: string; aplicaCuota: boolean; aplicaMatricula: boolean }>) {
  const { data } = await api.put(`/descuentos/familias/${id}`, input);
  return data;
}
export async function deleteFamilia(id: number) {
  const { data } = await api.delete(`/descuentos/familias/${id}`);
  return data;
}

// Subfamilias (descuentos concretos)
export async function createSub(input: { idFamilia: number; nombre: string; descripcion?: string; descuentoPorcentaje: number }) {
  const { data } = await api.post<{ id: number }>("/descuentos/subfamilias", input);
  return data;
}
export async function updateSub(id: number, input: Partial<{ nombre: string; descripcion: string; descuentoPorcentaje: number }>) {
  const { data } = await api.put(`/descuentos/subfamilias/${id}`, input);
  return data;
}
export async function deleteSub(id: number) {
  const { data } = await api.delete(`/descuentos/subfamilias/${id}`);
  return data;
}
