// app/lib/comprasRest.ts
import { api } from "~/lib/api";

// =============================================
// TIPOS
// =============================================

export type OrdenCompraListItem = {
  id: number;
  NumeroOrden: string;
  IdProveedor: number;
  NombreProveedor: string;
  FechaOrden: string;
  FechaEntregaPrevista: string | null;
  Estado: string;
  Total: number;
  Observaciones: string | null;
};

export type OrdenCompraLinea = {
  id?: number;
  IdProducto?: number;
  Codigo: string;
  Descripcion: string;
  CantidadPedida: number;
  CantidadRecibida: number;
  PrecioUnitario: number;
  Descuento: number;
  PorcentajeIva: number;
  Subtotal: number;
  EstadoLinea: string;
  Observaciones?: string;
};

export type OrdenCompraFull = OrdenCompraListItem & {
  ObservacionesInternas?: string;
  BaseImponible: number;
  TotalIva: number;
  TotalDescuento: number;
  lineas: OrdenCompraLinea[];
};

export type RecepcionCompraListItem = {
  id: number;
  NumeroRecepcion: string;
  IdOrdenCompra: number | null;
  NumeroOrden: string | null;
  IdProveedor: number;
  NombreProveedor: string;
  NumeroAlbaranProveedor: string | null;
  FechaRecepcion: string;
  Estado: string;
  Total: number;
};

export type RecepcionCompraLinea = {
  id?: number;
  IdOrdenLinea?: number;
  IdProducto?: number;
  Codigo: string;
  Descripcion: string;
  CantidadRecibida: number;
  CantidadFacturada: number;
  PrecioUnitario: number;
  Descuento: number;
  PorcentajeIva: number;
  Subtotal: number;
  Observaciones?: string;
};

export type RecepcionCompraFull = RecepcionCompraListItem & {
  Observaciones?: string;
  BaseImponible: number;
  TotalIva: number;
  lineas: RecepcionCompraLinea[];
};

export type FacturaCompraListItem = {
  id: number;
  SerieFactura: string | null;
  NumeroFactura: string;
  IdProveedor: number;
  NombreProveedor: string;
  FechaFactura: string;
  Estado: string;
  TotalFactura: number;
  ImportePagado: number;
  ImportePendiente: number;
  // VeriFactu
  VeriFactuEstado?: string;
  VeriFactuCSV?: string | null;
};

export type FacturaCompraLinea = {
  id?: number;
  IdProducto?: number;
  CodigoItem: string;
  DescripcionItem: string;
  Cantidad: number;
  PrecioUnitario: number;
  PcDescuento: number;
  ImporteDescuento: number;
  BaseImporte: number;
  PcIva: number;
  ImporteIva: number;
  ImporteLinea: number;
  Observaciones?: string;
};

export type FacturaCompraPago = {
  id?: number;
  FechaPago: string;
  Importe: number;
  FormaPago: string;
  Referencia?: string;
  NumeroCuenta?: string;
  Observaciones?: string;
};

export type FacturaCompraFull = FacturaCompraListItem & {
  FechaRecepcion?: string;
  FechaVencimiento?: string;
  Observaciones?: string;
  IdFamiliaGasto?: number;
  IdSubFamiliaGasto?: number;
  TotalBaseImponible: number;
  TotalDescuento: number;
  TotalCuotaIva: number;
  TotalRetencion: number;
  lineas: FacturaCompraLinea[];
  resumenIva: { PorcentajeIva: number; BaseImponible: number; CuotaIva: number }[];
  pagos: FacturaCompraPago[];
};

export type ProveedorLookup = {
  id: number;
  nombre: string;
  CIF?: string;
};

// =============================================
// PROVEEDORES LOOKUP
// =============================================

export async function fetchProveedoresLookup() {
  const { data } = await api.get<ProveedorLookup[]>("/proveedores-lookup");
  return data;
}

// Productos de un proveedor
export type ProductoProveedor = {
  id: number;
  Codigo: string;
  Nombre: string;
  PVP: number;
  PrecioCoste: number;
  Marca: string | null;
  ReferenciaProveedor: string | null;
  PrecioProveedor: number | null;
};

export async function fetchProductosByProveedor(idProveedor: number) {
  const { data } = await api.get<ProductoProveedor[]>(`/proveedores/${idProveedor}/productos`);
  return data;
}

// Ordenes pendientes de un proveedor (para recepciones)
export type OrdenPendiente = {
  id: number;
  NumeroOrden: string;
  FechaOrden: string;
  Estado: string;
  Total: number;
  lineas: {
    id: number;
    IdProducto: number | null;
    Codigo: string;
    Descripcion: string;
    CantidadPedida: number;
    CantidadRecibida: number;
    PrecioUnitario: number;
    Descuento: number;
    PorcentajeIva: number;
    EstadoLinea: string;
  }[];
};

export async function fetchOrdenesPendientesProveedor(idProveedor: number) {
  const { data } = await api.get<OrdenPendiente[]>(`/compras/ordenes-pendientes/${idProveedor}`);
  return data;
}

// =============================================
// ORDENES DE COMPRA
// =============================================

export type OrdenCompraFilters = {
  idProveedor?: number;
  estado?: string;
  q?: string;
};

export async function fetchOrdenesCompra(
  take = 50,
  offset = 0,
  filters: OrdenCompraFilters = {}
) {
  const params: Record<string, any> = { take, offset };
  if (filters.idProveedor) params.idProveedor = filters.idProveedor;
  if (filters.estado) params.estado = filters.estado;
  if (filters.q) params.q = filters.q;

  const { data } = await api.get<{ data: OrdenCompraListItem[]; total: number }>("/compras/ordenes", { params });
  return data;
}

export async function fetchOrdenCompra(id: string | number) {
  const { data } = await api.get<OrdenCompraFull>(`/compras/ordenes/${id}`);
  return data;
}

export async function createOrdenCompra(input: any) {
  const { data } = await api.post<OrdenCompraFull>("/compras/ordenes", input);
  return data;
}

export async function updateOrdenCompra(id: string | number, input: any) {
  const { data } = await api.put<OrdenCompraFull>(`/compras/ordenes/${id}`, input);
  return data;
}

// =============================================
// RECEPCIONES DE COMPRA
// =============================================

export type RecepcionCompraFilters = {
  idProveedor?: number;
  idOrdenCompra?: number;
  estado?: string;
  q?: string;
};

export async function fetchRecepcionesCompra(
  take = 50,
  offset = 0,
  filters: RecepcionCompraFilters = {}
) {
  const params: Record<string, any> = { take, offset };
  if (filters.idProveedor) params.idProveedor = filters.idProveedor;
  if (filters.idOrdenCompra) params.idOrdenCompra = filters.idOrdenCompra;
  if (filters.estado) params.estado = filters.estado;
  if (filters.q) params.q = filters.q;

  const { data } = await api.get<{ data: RecepcionCompraListItem[]; total: number }>("/compras/recepciones", { params });
  return data;
}

export async function fetchRecepcionCompra(id: string | number) {
  const { data } = await api.get<RecepcionCompraFull>(`/compras/recepciones/${id}`);
  return data;
}

export async function createRecepcionCompra(input: any) {
  const { data } = await api.post<RecepcionCompraFull>("/compras/recepciones", input);
  return data;
}

// =============================================
// FACTURAS DE COMPRA
// =============================================

export type FacturaCompraFilters = {
  idProveedor?: number;
  estado?: string;
  desdeFecha?: string;
  hastaFecha?: string;
  q?: string;
};

export async function fetchFacturasCompra(
  take = 50,
  offset = 0,
  filters: FacturaCompraFilters = {}
) {
  const params: Record<string, any> = { take, offset };
  if (filters.idProveedor) params.idProveedor = filters.idProveedor;
  if (filters.estado) params.estado = filters.estado;
  if (filters.desdeFecha) params.desdeFecha = filters.desdeFecha;
  if (filters.hastaFecha) params.hastaFecha = filters.hastaFecha;
  if (filters.q) params.q = filters.q;

  const { data } = await api.get<{ data: FacturaCompraListItem[]; total: number; totalPaginas: number }>("/facturas/compra", { params });
  return data;
}

export async function fetchFacturaCompra(id: string | number) {
  const { data } = await api.get<FacturaCompraFull>(`/compras/facturas/${id}`);
  return data;
}

export async function createFacturaCompra(input: any) {
  const { data } = await api.post<FacturaCompraFull>("/compras/facturas", input);
  return data;
}

export async function addPagoFacturaCompra(id: string | number, pago: any) {
  const { data } = await api.post<FacturaCompraFull>(`/compras/facturas/${id}/pagos`, pago);
  return data;
}

// =============================================
// HELPERS
// =============================================

export const ESTADOS_ORDEN = [
  { value: "BORRADOR", label: "Borrador", color: "bg-slate-100 text-slate-700" },
  { value: "ENVIADA", label: "Enviada", color: "bg-blue-100 text-blue-700" },
  { value: "PARCIAL", label: "Parcial", color: "bg-amber-100 text-amber-700" },
  { value: "RECIBIDA", label: "Recibida", color: "bg-emerald-100 text-emerald-700" },
  { value: "ANULADA", label: "Anulada", color: "bg-red-100 text-red-700" },
];

export const ESTADOS_RECEPCION = [
  { value: "PENDIENTE", label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  { value: "FACTURADA", label: "Facturada", color: "bg-emerald-100 text-emerald-700" },
  { value: "ANULADA", label: "Anulada", color: "bg-red-100 text-red-700" },
];

export const ESTADOS_FACTURA_COMPRA = [
  { value: "PENDIENTE", label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  { value: "PARCIAL", label: "Pago parcial", color: "bg-blue-100 text-blue-700" },
  { value: "PAGADA", label: "Pagada", color: "bg-emerald-100 text-emerald-700" },
  { value: "ANULADA", label: "Anulada", color: "bg-red-100 text-red-700" },
];

export function getEstadoOrden(estado: string) {
  return ESTADOS_ORDEN.find(e => e.value === estado) || ESTADOS_ORDEN[0];
}

export function getEstadoRecepcion(estado: string) {
  return ESTADOS_RECEPCION.find(e => e.value === estado) || ESTADOS_RECEPCION[0];
}

export function getEstadoFacturaCompra(estado: string) {
  return ESTADOS_FACTURA_COMPRA.find(e => e.value === estado) || ESTADOS_FACTURA_COMPRA[0];
}
