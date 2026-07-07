// app/lib/verifactuRest.ts
import { api } from "~/lib/api";

// =============================================
// TIPOS
// =============================================

export type VeriFactuConfig = {
  modoActivo: boolean;
  envioAutomatico: boolean;
  ambienteAEAT: "PRUEBAS" | "PRODUCCION";
  certificadoNombre: string | null;
  certificadoExpiracion: string | null;
  nombreSIF: string;
  versionSIF: string;
  fechaModificacion: string | null;
};

export type VeriFactuLog = {
  id: number;
  tipoDocumento: "FACTURA_VENTA" | "FACTURA_COMPRA";
  idFactura: number | null;
  idFacturaCompra: number | null;
  serieFactura: string | null;
  numeroFactura: string | null;
  tipoRegistro: "ALTA" | "ANULACION";
  huellaHash: string;
  estadoEnvio: "PENDIENTE" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "ERROR";
  fechaEnvio: string | null;
  intentoEnvio: number;
  codigoRespuestaAEAT: string | null;
  mensajeRespuestaAEAT: string | null;
  csvRespuesta: string | null;
  fechaRespuesta: string | null;
  xmlEnviado?: string | null;
  xmlRespuesta?: string | null;
  qrCodeData?: string | null;
  ultimoError: string | null;
  fechaCreacion: string;
};

export type VeriFactuLogsResponse = {
  logs: VeriFactuLog[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
};

export type VeriFactuPendientes = {
  ventas: Array<{
    id: number;
    serie: string;
    numero: number;
    fechaFactura: string;
    totalFactura: number;
    tipoFactura: string;
    nombreCliente: string;
  }>;
  compras: Array<{
    id: number;
    serie: string | null;
    numero: string;
    fechaFactura: string;
    totalFactura: number;
    nombreProveedor: string;
  }>;
  totalVentas: number;
  totalCompras: number;
};

export type EnvioResponse = {
  success: boolean;
  idLog?: number;
  estadoEnvio?: string;
  csv?: string;
  mensaje?: string;
  huella?: string;
  error?: string;
};

// =============================================
// CONFIGURACION
// =============================================

export async function fetchVeriFactuConfig(): Promise<VeriFactuConfig> {
  const { data } = await api.get<VeriFactuConfig>("/verifactu/config");
  return data;
}

export async function updateVeriFactuConfig(config: Partial<VeriFactuConfig>): Promise<VeriFactuConfig> {
  const { data } = await api.put<VeriFactuConfig>("/verifactu/config", config);
  return data;
}

// =============================================
// ENVIO DE FACTURAS
// =============================================

export async function enviarFacturaVenta(idFactura: number): Promise<EnvioResponse> {
  const { data } = await api.post<EnvioResponse>(`/verifactu/enviar/venta/${idFactura}`);
  return data;
}

export async function enviarFacturaCompra(idFacturaCompra: number): Promise<EnvioResponse> {
  const { data } = await api.post<EnvioResponse>(`/verifactu/enviar/compra/${idFacturaCompra}`);
  return data;
}

// =============================================
// LOG DE COMUNICACIONES
// =============================================

export type LogsParams = {
  tipoDocumento?: "FACTURA_VENTA" | "FACTURA_COMPRA";
  estadoEnvio?: string;
  desdeFecha?: string;
  hastaFecha?: string;
  pagina?: number;
  porPagina?: number;
};

export async function fetchVeriFactuLogs(params?: LogsParams): Promise<VeriFactuLogsResponse> {
  const { data } = await api.get<VeriFactuLogsResponse>("/verifactu/log", { params });
  return data;
}

export async function fetchVeriFactuLogDetalle(idLog: number): Promise<VeriFactuLog> {
  const { data } = await api.get<VeriFactuLog>(`/verifactu/log/${idLog}`);
  return data;
}

// =============================================
// REINTENTOS
// =============================================

export async function reintentarEnvio(idLog: number): Promise<EnvioResponse> {
  const { data } = await api.post<EnvioResponse>(`/verifactu/reintentar/${idLog}`);
  return data;
}

// =============================================
// PENDIENTES
// =============================================

export async function fetchFacturasPendientes(tipo?: "venta" | "compra" | "todas"): Promise<VeriFactuPendientes> {
  const { data } = await api.get<VeriFactuPendientes>("/verifactu/pendientes", {
    params: tipo ? { tipo } : undefined
  });
  return data;
}

// =============================================
// TEST CONEXION
// =============================================

export async function testConexionAEAT(): Promise<{ success: boolean; mensaje: string }> {
  const { data } = await api.post<{ success: boolean; mensaje: string }>("/verifactu/test-conexion");
  return data;
}
