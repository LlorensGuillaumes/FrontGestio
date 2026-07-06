import { api } from "~/lib/api";

export type NominaLinea = { tipo: "DEVENGO" | "DEDUCCION"; concepto: string; importe: number };

export type NominaPreview = {
  idUsuario: number;
  nombre: string;
  yaGenerada: boolean;
  lineas: NominaLinea[];
  totalDevengado: number;
  totalDeducciones: number;
  liquido: number;
};

export type Nomina = {
  id: number;
  idUsuario: number;
  nombre: string;
  mes: number;
  anyo: number;
  totalDevengado: number;
  totalDeducciones: number;
  liquido: number;
  estadoPago: string;
  estado: string;
};

export type NominaDetalle = Nomina & { iban: string | null; fechaEmision: string; lineas: NominaLinea[] };

export const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export async function previewNominas(mes: number, anyo: number) {
  const { data } = await api.get<{ mes: number; anyo: number; etiqueta: string; nominas: NominaPreview[]; resumen: { num: number; totalDevengado: number; totalLiquido: number } }>(
    "/nominas/preview",
    { params: { mes, anyo } }
  );
  return data;
}

export async function generarNominas(input: { mes: number; anyo: number; usuariosExcluidos?: number[] }) {
  const { data } = await api.post<{ creadas: number; nominas?: any[]; mensaje?: string }>("/nominas/generar", input);
  return data;
}

export async function fetchNominas(params?: { mes?: number; anyo?: number }) {
  const { data } = await api.get<{ data: Nomina[] }>("/nominas", { params });
  return data.data;
}

export async function fetchNomina(id: number) {
  const { data } = await api.get<NominaDetalle>(`/nominas/${id}`);
  return data;
}

export async function deleteNomina(id: number) {
  const { data } = await api.delete(`/nominas/${id}`);
  return data;
}
