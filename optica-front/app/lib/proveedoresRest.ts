import { api } from "~/lib/api";

export type ProveedorListItem = {
  id: number;
  Nombre: string;
  NombreComercial?: string;
  NIF?: string;
  Email?: string;
  Activo: number;
  telefonos: { id: number; telefono: string; tipo: string }[];
  subfamilias: { id: number; id_subfamilia: number; descripcion: string; id_familia: number }[];
};

export type ProveedorFull = ProveedorListItem & {
  Direccion?: string;
  CodigoPostal?: string;
  Poblacion?: string;
  Provincia?: string;
  Pais?: string;
  Web?: string;
  Observaciones?: string;
  contactos: { id: number; Nombre: string; Cargo?: string; Telefono?: string; Email?: string }[];
  productos: { id: number; Nombre: string; Codigo?: string; PVP?: number }[];
};

export type ProveedoresPage = {
  data: ProveedorListItem[];
  total: number;
  take: number;
  offset: number;
};

export type ProveedorFilters = {
  q?: string;
  nif?: string;
  email?: string;
  telefono?: string;
  soloActivos?: boolean;
};

// Lista proveedores con paginación y filtros
export async function fetchProveedoresFullPage(
  take: number,
  offset: number,
  filters: ProveedorFilters = {}
): Promise<ProveedoresPage> {
  const params = new URLSearchParams();
  params.set("take", String(take));
  params.set("offset", String(offset));
  if (filters.soloActivos !== false) params.set("soloActivos", "1");
  if (filters.q) params.set("q", filters.q);
  if (filters.nif) params.set("nif", filters.nif);
  if (filters.email) params.set("email", filters.email);
  if (filters.telefono) params.set("telefono", filters.telefono);

  const { data } = await api.get<ProveedoresPage>(`/proveedores-full?${params.toString()}`);
  return data;
}

// Obtener un proveedor completo
export async function fetchProveedor(id: string | number): Promise<ProveedorFull> {
  const { data } = await api.get<ProveedorFull>(`/proveedores/${id}`);
  return data;
}

// Obtener productos de un proveedor
export async function fetchProveedorProductos(id: string | number) {
  const { data } = await api.get<any[]>(`/proveedores/${id}/productos`);
  return data;
}

// Crear proveedor
export async function createProveedor(input: any): Promise<ProveedorFull> {
  const { data } = await api.post<ProveedorFull>(`/proveedores-post`, { input });
  return data;
}

// Actualizar proveedor
export async function updateProveedor(id: string | number, input: any): Promise<ProveedorFull> {
  const { data } = await api.put<ProveedorFull>(`/proveedores-put/${id}`, { input });
  return data;
}

export type FamiliaProveedor = {
  IdFamiliaProveedor: number;
  Descripcion: string;
  Activa?: number;
};

export type SubfamiliaProveedor = {
  IdSubFamiliaProveedor: number;
  IdFamiliaProveedor: number;
  Descripcion: string;
  Activa?: number;
};

// Familias de proveedores
export async function fetchFamiliasProveedores(): Promise<FamiliaProveedor[]> {
  const { data } = await api.get<FamiliaProveedor[]>(`/familias-proveedores?take=5000&offset=0`);
  return data;
}

// Subfamilias de proveedores
export async function fetchSubfamiliasProveedores(): Promise<SubfamiliaProveedor[]> {
  const { data } = await api.get<SubfamiliaProveedor[]>(`/subfamilias-proveedores?take=5000&offset=0`);
  return data;
}

// CRUD familias
export async function createFamiliaProveedor(data: any) {
  return api.post(`/familias-proveedores`, data);
}

export async function updateFamiliaProveedor(id: number, data: any) {
  return api.put(`/familias-proveedores/${id}`, data);
}

export async function deleteFamiliaProveedor(id: number) {
  return api.delete(`/familias-proveedores/${id}`);
}

// CRUD subfamilias
export async function createSubfamiliaProveedor(data: any) {
  return api.post(`/subfamilias-proveedores`, data);
}

export async function updateSubfamiliaProveedor(id: number, data: any) {
  return api.put(`/subfamilias-proveedores/${id}`, data);
}

export async function deleteSubfamiliaProveedor(id: number) {
  return api.delete(`/subfamilias-proveedores/${id}`);
}
