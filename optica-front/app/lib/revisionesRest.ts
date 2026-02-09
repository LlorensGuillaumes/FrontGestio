import { api } from "~/lib/api";

// Estructura “tipo GraphQL” para que el modal casi no cambie
export async function getRevisionFull(id: string) {
  const { data } = await api.get<{ revision: any }>(`/revisiones-full/${id}`);
  return data;
}

export async function createRevisionFull(input: any) {
  const { data } = await api.post(`/revisiones-full`, { input });
  return data;
}

export async function updateRevisionFull(id: string, input: any) {
  const { data } = await api.put(`/revisiones-full/${id}`, { input });
  return data;
}

export async function getHistoriaClinicaFull(idCliente: string) {
  const { data } = await api.get<any>(`/historia-clinica-full/${idCliente}`);
  return data;
}

export async function updateHistoriaClinicaFull(idCliente: string, input: any) {
  const { data } = await api.put<any>(`/historia-clinica-full/${idCliente}`, input);
  return data;
}

export async function deleteRevision(id: string) {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/revisiones-full/${id}`);
  return data;
}
