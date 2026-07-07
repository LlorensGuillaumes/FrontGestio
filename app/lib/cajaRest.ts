// app/lib/cajaRest.ts
import { api } from "~/lib/api";

export type ModoPago = {
  id: number;
  descripcion: string;
  usaDatafono: boolean;
  activo: boolean;
  orden: number;
};

export type MovimientoCaja = {
  id: number;
  fecha: string;
  tipo: "COBRO" | "PAGO" | "APERTURA" | "CIERRE" | "AJUSTE";
  idModoPago?: number;
  modoPago?: string;
  concepto: string;
  importe: number;
  idFactura?: number;
  numeroFactura?: string;
  idDocumento?: number;
  idCliente?: number;
  nombreCliente?: string;
  referencia?: string;
  observaciones?: string;
};

export type ResumenCaja = {
  periodo: { desde: string; hasta: string };
  totalesPorTipo: Array<{ tipo: string; total: number; operaciones: number }>;
  totalesPorModoPago: Array<{ idModoPago: number; modoPago: string; total: number; operaciones: number }>;
  resumen: {
    totalCobros: number;
    totalPagos: number;
    totalAjustes: number;
    saldoCaja: number;
  };
};

export type CobroFacturaInput = {
  idFactura: number;
  idModoPago: number;
  importe: number;
  referencia?: string;
  observaciones?: string;
};

/**
 * Obtiene los modos de pago activos
 */
export async function fetchModosPago(soloActivos = true): Promise<ModoPago[]> {
  const { data } = await api.get<{ rows: ModoPago[]; totalCount: number }>("/modos-pago", {
    params: { soloActivos: soloActivos ? "1" : "0" }
  });
  return data.rows;
}

/**
 * Obtiene movimientos de caja con filtros
 */
export async function fetchMovimientosCaja(params: {
  pagina?: number;
  porPagina?: number;
  fecha?: string;
  desdeFecha?: string;
  hastaFecha?: string;
  tipo?: string;
  idModoPago?: number;
} = {}): Promise<{ movimientos: MovimientoCaja[]; totalRegistros: number; totalPaginas: number; paginaActual: number }> {
  const { data } = await api.get("/caja/movimientos", { params });
  return data;
}

/**
 * Obtiene resumen de caja para un día o rango
 */
export async function fetchResumenCaja(params: {
  fecha?: string;
  desdeFecha?: string;
  hastaFecha?: string;
} = {}): Promise<ResumenCaja> {
  const { data } = await api.get<ResumenCaja>("/caja/resumen", { params });
  return data;
}

/**
 * Registra un cobro de factura
 */
export async function registrarCobroFactura(input: CobroFacturaInput): Promise<MovimientoCaja & { estadoCobroFactura: string }> {
  const { data } = await api.post("/caja/cobro-factura", input);
  return data;
}

/**
 * Crea un movimiento de caja manual
 */
export async function createMovimientoCaja(input: {
  tipo: "COBRO" | "PAGO" | "APERTURA" | "CIERRE" | "AJUSTE";
  idModoPago?: number;
  concepto: string;
  importe: number;
  idCliente?: number;
  referencia?: string;
  observaciones?: string;
}): Promise<MovimientoCaja> {
  const { data } = await api.post<MovimientoCaja>("/caja/movimientos", input);
  return data;
}

/**
 * Elimina un movimiento de caja
 */
export async function deleteMovimientoCaja(id: number): Promise<void> {
  await api.delete(`/caja/movimientos/${id}`);
}

// === Ticket de Venta (POS) ===

export type TicketLineaInput = {
  tipo: "PRODUCTO" | "SERVICIO";
  idItem: number;
  cantidad: number;
  precioUnitario?: number;
  descripcion?: string;
};

export type TicketVentaInput = {
  idCliente?: number | null;
  lineas: TicketLineaInput[];
  idModoPago: number;
  observaciones?: string;
};

export type TicketVentaResult = {
  factura: {
    id: number;
    serie: string;
    numero: number;
    fechaFactura: string;
    nombreCliente: string;
    totalBaseImponible: number;
    totalCuotaIva: number;
    totalFactura: number;
    estadoCobro: string;
  };
  movimientoCaja: {
    id: number;
    fecha: string;
    tipo: string;
    importe: number;
  };
};

export type ClienteSimplificado = {
  id: number;
  nombre: string;
  documentoFiscal: string | null;
  esFacturaSimplificada: boolean;
} | null;

/**
 * Crea un ticket de venta (factura + cobro)
 */
export async function createTicketVenta(input: TicketVentaInput): Promise<TicketVentaResult> {
  const { data } = await api.post<TicketVentaResult>("/caja/ticket", input);
  return data;
}

/**
 * Obtiene el cliente por defecto para facturas simplificadas
 */
export async function fetchClienteFacturaSimplificada(): Promise<ClienteSimplificado> {
  const { data } = await api.get<ClienteSimplificado>("/clientes/default-factura-simplificada");
  return data;
}
