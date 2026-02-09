// app/lib/documentosRest.ts
import { api } from "~/lib/api";

export type DocumentoListItem = {
  id: number;
  IdCliente: number;
  Tipo: string;
  NumeroDocumento: string;
  Fecha: string;
  FechaEntrega?: string;
  Estado: string;
  Total: number;
  PagoACuenta?: number;
  Observaciones?: string;
  NombreCliente?: string;
  ApellidosCliente?: string;
  IdFacturaAnticipo?: number;
  IdFacturaFinal?: number;
};

export type DocumentoLinea = {
  id?: number;
  Tipo: string;
  IdProducto?: number;
  Codigo?: string;
  Descripcion: string;
  Cantidad: number;
  PrecioUnitario: number;
  Descuento: number;
  DescuentoImporte: number;
  PorcentajeIva: number;
  Subtotal: number;
  Observaciones?: string;
};

export type DocumentoPago = {
  id?: number;
  Fecha: string;
  Importe: number;
  FormaPago: string;
  Referencia?: string;
  Observaciones?: string;
};

export type DocumentoFull = DocumentoListItem & {
  ObservacionesInternas?: string;

  // Graduación OD
  OD_Esfera?: number;
  OD_Cilindro?: number;
  OD_Eje?: number;
  OD_Adicion?: number;
  OD_Prisma?: number;
  OD_BasePrisma?: string;
  OD_AV?: string;
  OD_DNP?: number;
  OD_Altura?: number;

  // Graduación OI
  OI_Esfera?: number;
  OI_Cilindro?: number;
  OI_Eje?: number;
  OI_Adicion?: number;
  OI_Prisma?: number;
  OI_BasePrisma?: string;
  OI_AV?: string;
  OI_DNP?: number;
  OI_Altura?: number;

  DIP_Lejos?: number;
  DIP_Cerca?: number;

  // Montura
  MonturaModelo?: string;
  MonturaMarca?: string;
  MonturaColor?: string;
  MonturaTalla?: string;
  MonturaPrecio?: number;

  // Lentes
  LenteTipo?: string;
  LenteMaterial?: string;
  LenteTratamiento?: string;
  LenteColoracion?: string;

  // Totales
  BaseImponible?: number;
  TotalIva?: number;
  TotalDescuento?: number;

  // Validez presupuesto
  ValidezDias?: number;

  lineas: DocumentoLinea[];
  pagos: DocumentoPago[];
};

export type DocumentoFilters = {
  idCliente?: number;
  tipo?: string;
  estado?: string;
  q?: string;
};

// Listado
export async function fetchDocumentosFull(
  take = 50,
  offset = 0,
  filters: DocumentoFilters = {}
) {
  const params: Record<string, any> = { take, offset };
  if (filters.idCliente) params.idCliente = filters.idCliente;
  if (filters.tipo) params.tipo = filters.tipo;
  if (filters.estado) params.estado = filters.estado;
  if (filters.q) params.q = filters.q;

  const { data } = await api.get<{ data: DocumentoListItem[]; total: number }>("/documentos-full", { params });
  return data;
}

// Obtener uno
export async function fetchDocumento(id: string | number) {
  const { data } = await api.get<DocumentoFull>(`/documentos/${id}`);
  return data;
}

// Crear
export async function createDocumento(input: any) {
  const { data } = await api.post<DocumentoFull>("/documentos-post", input);
  return data;
}

// Actualizar
export async function updateDocumento(id: string | number, input: any) {
  const { data } = await api.put<DocumentoFull>(`/documentos-put/${id}`, input);
  return data;
}

// Cambiar estado
export async function cambiarEstadoDocumento(id: string | number, estado: string) {
  const { data } = await api.put<DocumentoFull>(`/documentos/${id}/estado`, { estado });
  return data;
}

// Añadir pago
export async function addPagoDocumento(id: string | number, pago: Partial<DocumentoPago>) {
  const { data } = await api.post<DocumentoFull>(`/documentos/${id}/pagos`, pago);
  return data;
}

// Documentos de un cliente
export async function fetchClienteDocumentos(idCliente: string | number) {
  const { data } = await api.get<{ rows: DocumentoListItem[]; totalCount: number }>(
    `/clientes/${idCliente}/documentos`
  );
  return data;
}
