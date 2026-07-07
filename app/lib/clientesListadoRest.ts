// app/lib/clientesListadoRest.ts
import { api } from "~/lib/api";


export async function fetchClientesFullPage(params: {
  q?: string | null;
  take: number;
  offset: number;
  soloActivos?: boolean;
}) {
  try {
    const res = await api.get<{ rows: any[]; totalCount: number }>("/clientes-full", {
      params: {
        q: params.q ?? null,
        take: params.take,
        offset: params.offset,
        soloActivos: params.soloActivos ? 1 : 0,
      },
    });

    console.log(res.data)
    return res.data;
  } catch (err: any) {
    console.log("❌ AXIOS ERROR:", err?.message);

    // Si el servidor respondió (400/500, etc.)
    console.log("❌ response:", err?.response?.status, err?.response?.data);

    // Si se envió la request pero no hubo respuesta (CORS / server caído / reset)
    console.log("❌ request:", err?.request);

    throw err;
  }
}

export async function fetchCliente(idCliente: string, params?: { soloActivos?: boolean }) {
  try {
    const res = await api.get<any>(`/clientes/${encodeURIComponent(idCliente)}`, {
      params: {
        // si no lo pasas, por defecto solo activos (igual que en el controlador)
        soloActivos: params?.soloActivos === false ? 0 : 1,
      },
    });

    return res.data;
  } catch (err: any) {
    console.log("❌ AXIOS ERROR:", err?.message);
    console.log("❌ response:", err?.response?.status, err?.response?.data);
    console.log("❌ request:", err?.request);
    throw err;
  }
}


export async function fetchClienteFacturas(idCliente: string) {
  const { data } = await api.get<any[]>(`/clientes/${encodeURIComponent(idCliente)}/facturas`);
  return data;
}

export async function fetchClienteRevisiones(idCliente: string) {
  const { data } = await api.get<{ rows: any[]; totalCount: number }>(`/clientes/${encodeURIComponent(idCliente)}/revisiones`);
  return data?.rows ?? [];
}

export async function fetchClienteDocumentos(idCliente: string) {
  const { data } = await api.get<any[]>(`/clientes/${encodeURIComponent(idCliente)}/documentos`);
  return data;
}

export type UltimaGraduacion = {
  graduacion: {
    odEsfera: number | null;
    odCilindro: number | null;
    odEje: number | null;
    odAdicion: number | null;
    oiEsfera: number | null;
    oiCilindro: number | null;
    oiEje: number | null;
    oiAdicion: number | null;
  } | null;
  fechaRevision?: string;
  idRevision?: number;
  mensaje?: string;
};

export async function fetchClienteUltimaGraduacion(idCliente: string) {
  const { data } = await api.get<UltimaGraduacion>(`/clientes/${encodeURIComponent(idCliente)}/ultima-graduacion`);
  return data;
}

export type DescuentoCliente = {
  descuento: number;
  esPorcentaje: boolean;
  origen: string | null;
  mensaje: string;
};

export async function fetchClienteDescuento(idCliente: string) {
  const { data } = await api.get<DescuentoCliente>(`/clientes/${encodeURIComponent(idCliente)}/descuento`);
  return data;
}
