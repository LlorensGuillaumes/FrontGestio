// app/lib/stockRest.ts
import { api } from "~/lib/api";

export type ProductoStockItem = {
  id: number;
  Codigo?: string;
  Nombre: string;
  Stock: number;
  StockMinimo: number;
  IdMarca?: number;
  NombreMarca?: string;
  subfamilias: { id: number; id_subfamilia: number; descripcion: string; id_familia: number }[];
};

export type ProductosStockPage = {
  data: ProductoStockItem[];
  total: number;
  take: number;
  offset: number;
};

export type StockFilters = {
  q?: string;
  idFamilia?: number;
  idSubfamilia?: number;
  stockBajo?: boolean;
};

export type MovimientoStock = {
  id: number;
  TipoMovimiento: string;
  Cantidad: number;
  StockAnterior: number;
  StockPosterior: number;
  FechaMovimiento: string;
  IdDocumentoOrigen?: number | null;
  TipoDocumentoOrigen?: string | null;
  Observaciones?: string | null;
};

export type MovimientosStockResponse = {
  producto: {
    id: number;
    nombre: string;
    stockActual: number;
  };
  data: MovimientoStock[];
  total: number;
  take: number;
  offset: number;
};

/**
 * Lista productos con stock actual y filtros
 */
export async function fetchProductosStock(
  take: number,
  offset: number,
  filters: StockFilters = {}
): Promise<ProductosStockPage> {
  const params = new URLSearchParams();
  params.set("take", String(take));
  params.set("offset", String(offset));
  if (filters.q) params.set("q", filters.q);
  if (filters.idFamilia) params.set("idFamilia", String(filters.idFamilia));
  if (filters.idSubfamilia) params.set("idSubfamilia", String(filters.idSubfamilia));
  if (filters.stockBajo) params.set("stockBajo", "1");

  const { data } = await api.get<ProductosStockPage>(`/productos-stock?${params.toString()}`);
  return data;
}

/**
 * Obtiene el historial de movimientos de stock de un producto
 */
export async function fetchMovimientosStock(
  idProducto: number,
  take: number = 50,
  offset: number = 0
): Promise<MovimientosStockResponse> {
  const params = new URLSearchParams();
  params.set("take", String(take));
  params.set("offset", String(offset));

  const { data } = await api.get<MovimientosStockResponse>(
    `/movimientos-stock/${idProducto}?${params.toString()}`
  );
  return data;
}

/**
 * Obtiene el estado de stock de un producto (OK, BAJO, AGOTADO)
 */
export function getEstadoStock(stock: number, stockMinimo: number): "ok" | "bajo" | "agotado" {
  if (stock <= 0) return "agotado";
  if (stock <= stockMinimo) return "bajo";
  return "ok";
}

/**
 * Formatea el tipo de movimiento para mostrar
 */
export function formatTipoMovimiento(tipo: string): string {
  const tipos: Record<string, string> = {
    ENTRADA_INICIAL: "Entrada inicial",
    ENTRADA_COMPRA: "Entrada compra",
    SALIDA_VENTA: "Salida venta",
    AJUSTE: "Ajuste",
  };
  return tipos[tipo] ?? tipo;
}
