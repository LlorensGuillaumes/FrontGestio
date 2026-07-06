import { api } from "~/lib/api";

export type LineaPreview = {
  idMatricula: number;
  codigo: string | null;
  descripcion: string;
  cuota: number;
  pcIva: number;
  base: number;
  iva: number;
  total: number;
};

export type FacturaPreview = {
  idCliente: number;
  nombreAlumno: string;
  yaFacturado: boolean;
  lineas: LineaPreview[];
  totalBase: number;
  totalIva: number;
  total: number;
  descuentoPorcentaje?: number;
  totalDescuento?: number;
};

export type PreviewMensual = {
  mes: number;
  anyo: number;
  etiqueta: string;
  facturas: FacturaPreview[];
  resumen: { numAlumnos: number; totalBase: number; totalIva: number; total: number };
};

export async function previewMensual(mes: number, anyo: number) {
  const { data } = await api.get<PreviewMensual>("/facturacion-mensual/preview", { params: { mes, anyo } });
  return data;
}

export async function generarMensual(input: {
  mes: number;
  anyo: number;
  alumnosExcluidos?: number[];
  lineasExcluidas?: number[];
  descuentos?: Record<number, number>;
  omitirYaFacturados?: boolean;
}) {
  const { data } = await api.post<{ creadas: number; serie?: string; facturas: any[]; mensaje?: string }>(
    "/facturacion-mensual/generar",
    input
  );
  return data;
}

// Crea la factura de matrícula de UN alumno por UNA clase (al matricularlo)
export async function generarMatriculaAlumno(idCliente: number, idClaseRecurrente: number) {
  const { data } = await api.post<{ creada: boolean; mensaje?: string; factura?: { total: number } }>(
    "/facturacion-matriculas/alumno",
    { idCliente, idClaseRecurrente }
  );
  return data;
}

// ===== Matrículas (cobro anual, 1 pago o 2 cuotas) =====
export async function previewMatriculas(anyo: number) {
  const { data } = await api.get<PreviewMensual>("/facturacion-matriculas/preview", { params: { anyo } });
  return data;
}

export async function generarMatriculas(input: {
  anyo: number;
  numCuotas: 1 | 2;
  alumnosExcluidos?: number[];
  lineasExcluidas?: number[];
  descuentos?: Record<number, number>;
  omitirYaFacturados?: boolean;
}) {
  const { data } = await api.post<{ creadas: number; serie?: string; numCuotas?: number; facturas: any[]; mensaje?: string }>(
    "/facturacion-matriculas/generar",
    input
  );
  return data;
}
