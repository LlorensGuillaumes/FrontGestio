// app/lib/empresaRest.ts
import { api } from "~/lib/api";

export type DatosEmpresa = {
  IdDatosEmpresa: number;
  NombreEmpresa: string;
  NombreComercial: string;
  CIF: string;
  Direccion: string;
  CodigoPostal: string;
  Poblacion: string;
  Provincia: string;
  Pais: string;
  Telefono: string;
  Email: string;
  Web: string;
  LogoUrl: string;
  PlazoConfirmacionDias: number;
  TextoPieDocumento: string;
};

export async function fetchDatosEmpresa(): Promise<DatosEmpresa> {
  const { data } = await api.get<DatosEmpresa>("/empresa/datos");
  return data;
}

export async function updateDatosEmpresa(datos: Partial<DatosEmpresa>): Promise<DatosEmpresa> {
  const { data } = await api.put<DatosEmpresa>("/empresa/datos", datos);
  return data;
}
