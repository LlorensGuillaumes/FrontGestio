// app/lib/clientesRest.ts
import { api } from "~/lib/api";

export async function getClienteFull(id: string, opts?: { soloActivos?: boolean }) {
  const { data } = await api.get(`/clientes/${encodeURIComponent(id)}`, {
    params: { soloActivos: opts?.soloActivos === false ? 0 : 1 },
  });

  // el modal espera { cliente: ... }
  return { cliente: data };
}


export async function createClienteFull(input: any) {
  // Ruta correcta del backend: POST /clientes-post
  const { data } = await api.post(`/clientes-post`, input);
  return data;
}

export async function updateClienteFull(id: string, input: any) {
  // Ruta correcta del backend: PUT /clientes-put/:id
  const { data } = await api.put(`/clientes-put/${id}`, input);
  return data;
}
