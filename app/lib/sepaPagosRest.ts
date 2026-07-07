import { api } from "~/lib/api";

export type PagoSepa = { id: number; beneficiario: string; iban: string | null; importe: number; concepto: string };

export async function previewPagos(tipo: "NOMINAS" | "COMPRAS", params?: { mes?: number; anyo?: number }) {
  const { data } = await api.post<{ tipo: string; pagos: PagoSepa[]; total: number; sinIban: number }>("/sepa/pagos/preview", { tipo, ...params });
  return data;
}

export async function generarPagos(tipo: "NOMINAS" | "COMPRAS", input: { ids?: number[]; fechaPago?: string; mes?: number; anyo?: number }) {
  const { data } = await api.post<{ xml: string; resumen: { incluidos: number; total: number; fechaPago: string; excluidosSinIban: string[] } }>(
    "/sepa/pagos/generar",
    { tipo, ...input }
  );
  return data;
}
