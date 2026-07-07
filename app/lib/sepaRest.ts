import { api } from "~/lib/api";

export type SepaFactura = {
  idFactura: number;
  numero: string;
  nombreCliente: string;
  importe: number;
  concepto: string | null;
  estadoCobro: string;
  iban: string | null;
  titular: string | null;
};

export const ESTADOS_COBRO = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "SEPA_GENERADO", label: "SEPA generado" },
  { value: "PAGADA", label: "Pagada" },
  { value: "DEVUELTA", label: "Devuelta" },
];
export const ESTADOS_FISCAL = [
  { value: "EMITIDA", label: "Emitida" },
  { value: "ANULADA", label: "Anulada" },
  { value: "RECTIFICADA", label: "Rectificada" },
];

export async function updateEstadoFactura(id: number, input: { estadoCobro?: string; estadoFiscal?: string }) {
  const { data } = await api.put(`/facturas/${id}/estado`, input);
  return data;
}

export async function previewSepa(idsFactura: number[]) {
  const { data } = await api.post<{ facturas: SepaFactura[]; total: number; sinIban: number }>("/sepa/preview", { idsFactura });
  return data;
}

export async function generarSepa(idsFactura: number[], fechaCobro?: string) {
  const { data } = await api.post<{
    xml: string;
    resumen: { incluidas: number; total: number; fechaCobro: string; excluidasSinIban: string[] };
  }>("/sepa/generar", { idsFactura, fechaCobro });
  return data;
}
