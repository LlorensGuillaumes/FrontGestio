import { api } from "~/lib/api";

export const productosApi = {
  listProductos: async () => (await api.get<any[]>("/productos")).data,
  listProveedores: async () => (await api.get<any[]>("/proveedores")).data,
  listMarcas: async () => (await api.get<any[]>("/marcas")).data,
  listFamilias: async () => (await api.get<any[]>("/familias")).data,
  listSubfamilias: async () => (await api.get<any[]>("/subfamilias")).data,
};
