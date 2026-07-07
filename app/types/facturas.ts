// --- 1. Definición de Tipos ---
export interface FacturaVentaLinea {
    id: string;
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
}

export interface FacturaVenta {
    id: string;
    fechaFactura: string;
    serie: string;
    numero: number;
    nombreCliente: string;
    totalBaseImponible: number;
    totalCuotaIva: number;
    totalFactura: number;
    estadoFiscal: string;
    estadoCobro: string;

    // VeriFactu
    veriFactuEstado?: string;
    veriFactuCSV?: string | null;

    FacturaVentaLineas?: FacturaVentaLinea[]; // Las líneas ya vienen dentro
}

export interface FacturasVentaPaginado {
    facturas: FacturaVenta[];
    totalRegistros: number;
    totalPaginas: number;
    paginaActual: number;
}

export interface FacturasResponse {
    facturasVentaFiltrado?: FacturasVentaPaginado;
}