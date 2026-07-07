// app/lib/facturasRest.ts
import { api } from "~/lib/api";

export type FacturaLinea = {
  id?: number;
  numeroLinea: number;
  codigoItem: string;
  descripcionItem: string;
  cantidad: number;
  precioUnitario: number;
  baseImporte: number;
  pcIva: number;
  importeIva: number;
  pcDescuento: number;
  importeDescuento: number;
  importeLinea: number;
};

export type Factura = {
  IdFactura: number;
  Serie: string;
  Numero: number;
  FechaFactura: string;
  IdCliente: number;
  TipoFactura: "NORMAL" | "ANTICIPO" | "FINAL";
  IdDocumento?: number;
  IdFacturaAnticipo?: number;
  TotalBaseImponible: number;
  TotalCuotaIva: number;
  TotalFactura: number;
  EstadoFiscal: string;
  EstadoCobro: string;
  Estado: string;
  Observaciones?: string;
  NombreCliente?: string;
  ApellidosCliente?: string;
  CifCliente?: string;
  DireccionCliente?: string;
  NumeroDocumentoOrigen?: string;
  lineas: FacturaLinea[];
  facturaAnticipo?: {
    id: number;
    serie: string;
    numero: number;
    total: number;
  };
  anticipo?: number;
  pendiente?: number;
};

export type FacturaResumen = {
  id: number;
  serie: string;
  numero: number;
  fechaFactura: string;
  tipoFactura: string;
  totalFactura: number;
  estadoCobro: string;
};

/**
 * Obtiene una factura por ID
 */
export async function fetchFactura(id: string | number): Promise<Factura> {
  const { data } = await api.get<Factura>(`/facturas/${id}`);
  return data;
}

/**
 * Obtiene las facturas vinculadas a un documento
 */
export async function fetchFacturasDocumento(idDocumento: string | number): Promise<FacturaResumen[]> {
  const { data } = await api.get<FacturaResumen[]>(`/facturas/documento/${idDocumento}`);
  return data;
}

/**
 * Crea una factura de anticipo para un documento
 */
export async function createFacturaAnticipo(idDocumento: string | number, importe: number, idModoPago: number): Promise<Factura> {
  const { data } = await api.post<Factura>("/facturas/anticipo", {
    idDocumento,
    importe,
    idModoPago,
  });
  return data;
}

/**
 * Crea la factura final al entregar un encargo
 */
export async function createFacturaFinal(idDocumento: string | number): Promise<Factura> {
  const { data } = await api.post<Factura>(`/facturas/final/${idDocumento}`);
  return data;
}

export type AbonoInput = {
  idFacturaOriginal: number;
  idModoPago: number;
  motivo?: string;
  lineasAbono?: Array<{ idLinea: number; cantidad: number }>;
};

/**
 * Crea una factura de abono (rectificativa)
 */
export async function createFacturaAbono(input: AbonoInput): Promise<Factura & { facturaOriginal: { id: number; serie: string; numero: number; total: number } }> {
  const { data } = await api.post("/facturas/abono", input);
  return data;
}
