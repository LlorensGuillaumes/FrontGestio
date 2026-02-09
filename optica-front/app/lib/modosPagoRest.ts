// app/lib/modosPagoRest.ts
import { api } from "~/lib/api";

export type ModoPago = {
  id: number;
  descripcion: string;
  usaDatafono: boolean;
  activo: boolean;
  orden: number;
};

export type ModoPagoInput = {
  descripcion: string;
  usaDatafono?: boolean;
  orden?: number;
};

export async function fetchModosPago(soloActivos = true) {
  const { data } = await api.get<{ rows: ModoPago[]; totalCount: number }>("/modos-pago", {
    params: { soloActivos: soloActivos ? 1 : 0 },
  });
  return data.rows;
}

export async function fetchModoPago(id: number) {
  const { data } = await api.get<ModoPago>(`/modos-pago/${id}`);
  return data;
}

export async function createModoPago(input: ModoPagoInput) {
  const { data } = await api.post<ModoPago>("/modos-pago", input);
  return data;
}

export async function updateModoPago(id: number, input: Partial<ModoPagoInput> & { activo?: boolean }) {
  const { data } = await api.put<{ success: boolean; id: number }>(`/modos-pago/${id}`, input);
  return data;
}

export async function deleteModoPago(id: number) {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/modos-pago/${id}`);
  return data;
}
