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

// ===== Responsables (N:M alumno <-> contacto) =====
export type Responsable = {
  id: number;
  IdContacto: number;
  Parentesco: string | null;
  EsPagador: boolean;
  EsPrincipal: boolean;
  Nombre: string;
  Apellido1: string | null;
  Apellido2: string | null;
  Telefono: string | null;
  Email: string | null;
  Iban: string | null;
  TitularCuenta: string | null;
};

export async function getResponsables(idCliente: string | number) {
  const { data } = await api.get<{ data: Responsable[] }>(`/clientes/${idCliente}/responsables`);
  return data.data;
}

export async function addResponsable(
  idCliente: string | number,
  input: { idContacto: number; parentesco?: string; esPagador?: boolean; esPrincipal?: boolean }
) {
  const { data } = await api.post(`/clientes/${idCliente}/responsables`, input);
  return data;
}

export async function updateResponsable(relId: number, input: { parentesco?: string; esPagador?: boolean; esPrincipal?: boolean }) {
  const { data } = await api.put(`/responsables/${relId}`, input);
  return data;
}

export async function removeResponsable(relId: number) {
  const { data } = await api.delete(`/responsables/${relId}`);
  return data;
}

export async function getPagador(idCliente: string | number) {
  const { data } = await api.get<{ origen: string | null; iban: string | null; titular: string | null; edad: number | null; aviso?: string }>(
    `/clientes/${idCliente}/pagador`
  );
  return data;
}

// ===== Contactos =====
export type Contacto = {
  id: number;
  Nombre: string;
  Apellido1: string | null;
  Apellido2: string | null;
  Dni: string | null;
  Telefono: string | null;
  Email: string | null;
  Direccion?: string | null;
  CodigoPostal?: string | null;
  Poblacion?: string | null;
  Provincia?: string | null;
  Iban: string | null;
  TitularCuenta: string | null;
  Bic?: string | null;
  Observaciones?: string | null;
  Activo?: number;
};

export type ContactoInput = {
  nombre: string;
  apellido1?: string;
  apellido2?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  codigoPostal?: string;
  poblacion?: string;
  provincia?: string;
  iban?: string;
  titularCuenta?: string;
  bic?: string;
  observaciones?: string;
};

export async function searchContactos(q?: string) {
  const { data } = await api.get<{ data: Contacto[] }>(`/contactos`, { params: { q } });
  return data.data;
}

export async function getContacto(id: number) {
  const { data } = await api.get<Contacto>(`/contactos/${id}`);
  return data;
}

export async function createContacto(input: ContactoInput) {
  const { data } = await api.post<{ id: number }>(`/contactos`, input);
  return data;
}

export async function updateContacto(id: number, input: Partial<ContactoInput> & { activo?: boolean }) {
  const { data } = await api.put(`/contactos/${id}`, input);
  return data;
}

export async function deleteContacto(id: number) {
  const { data } = await api.delete(`/contactos/${id}`);
  return data;
}
