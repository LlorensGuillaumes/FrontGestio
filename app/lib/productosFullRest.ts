import { api } from "~/lib/api";

export type ProductoListItem = {
  id: number;
  Codigo?: string;
  Nombre: string;
  PVP?: number;
  PrecioCoste?: number;
  Stock?: number;
  IdMarca?: number;
  NombreMarca?: string;
  Activo: number;
  subfamilias: { id: number; id_subfamilia: number; descripcion: string; id_familia: number }[];
  proveedores: { id: number; id_proveedor: number; nombre_proveedor: string; referencia?: string; precio?: number }[];
};

export type ProductoFull = ProductoListItem & {
  Descripcion?: string;
  IdTipoIva?: number;
  StockMinimo?: number;
  Ubicacion?: string;
  Observaciones?: string;
};

export type ProductosPage = {
  data: ProductoListItem[];
  total: number;
  take: number;
  offset: number;
};

export type ProductoFilters = {
  q?: string;
  codigo?: string;
  idMarca?: number;
  idFamilia?: number;
  idSubfamilia?: number;
  soloActivos?: boolean;
};

// Lista productos con paginación y filtros
export async function fetchProductosFullPage(
  take: number,
  offset: number,
  filters: ProductoFilters = {}
): Promise<ProductosPage> {
  const params = new URLSearchParams();
  params.set("take", String(take));
  params.set("offset", String(offset));
  if (filters.soloActivos !== false) params.set("soloActivos", "1");
  if (filters.q) params.set("q", filters.q);
  if (filters.codigo) params.set("codigo", filters.codigo);
  if (filters.idMarca) params.set("idMarca", String(filters.idMarca));
  if (filters.idFamilia) params.set("idFamilia", String(filters.idFamilia));
  if (filters.idSubfamilia) params.set("idSubfamilia", String(filters.idSubfamilia));

  const { data } = await api.get<ProductosPage>(`/productos-full?${params.toString()}`);
  return data;
}

// Obtener un producto completo
export async function fetchProducto(id: string | number): Promise<ProductoFull> {
  const { data } = await api.get<ProductoFull>(`/productos/${id}`);
  return data;
}

// Crear producto
export async function createProducto(input: any): Promise<ProductoFull> {
  const { data } = await api.post<ProductoFull>(`/productos-post`, { input });
  return data;
}

// Actualizar producto
export async function updateProducto(id: string | number, input: any): Promise<ProductoFull> {
  const { data } = await api.put<ProductoFull>(`/productos-put/${id}`, { input });
  return data;
}

export type FamiliaProducto = {
  IdFamiliaProducto: number;
  Descripcion: string;
  Activa?: number;
  subfamilias?: SubfamiliaProducto[];
};

export type SubfamiliaProducto = {
  IdSubFamiliaProducto: number;
  IdFamiliaProducto: number;
  Descripcion: string;
  Activa?: number;
};

export type Marca = {
  IdMarca: number;
  Descripcion: string;
  Activa?: number;
};

// Familias de productos con subfamilias
export async function fetchFamiliasProductos(soloActivas = true): Promise<FamiliaProducto[]> {
  const { data } = await api.get<FamiliaProducto[]>(`/familias-productos-full`, {
    params: { soloActivas: soloActivas ? 1 : 0 },
  });
  return data;
}

// Subfamilias de productos
export async function fetchSubfamiliasProductos(): Promise<SubfamiliaProducto[]> {
  const { data } = await api.get<{ rows: SubfamiliaProducto[]; totalCount: number }>(`/subfamilias-productos?take=5000&offset=0`);
  return data.rows ?? [];
}

// Marcas
export async function fetchMarcas(): Promise<Marca[]> {
  const { data } = await api.get<{ rows: Marca[]; totalCount: number }>(`/marcas?take=5000&offset=0`);
  return data.rows ?? [];
}

// CRUD familias
export async function createFamiliaProducto(data: any) {
  return api.post(`/familias-productos`, data);
}

export async function updateFamiliaProducto(id: number, data: any) {
  return api.put(`/familias-productos/${id}`, data);
}

export async function deleteFamiliaProducto(id: number) {
  return api.delete(`/familias-productos/${id}`);
}

// CRUD subfamilias
export async function createSubfamiliaProducto(data: any) {
  return api.post(`/subfamilias-productos`, data);
}

export async function updateSubfamiliaProducto(id: number, data: any) {
  return api.put(`/subfamilias-productos/${id}`, data);
}

export async function deleteSubfamiliaProducto(id: number) {
  return api.delete(`/subfamilias-productos/${id}`);
}

// CRUD marcas
export async function createMarca(data: any) {
  return api.post(`/marcas`, data);
}

export async function updateMarca(id: number, data: any) {
  return api.put(`/marcas/${id}`, data);
}

export async function deleteMarca(id: number) {
  return api.delete(`/marcas/${id}`);
}
