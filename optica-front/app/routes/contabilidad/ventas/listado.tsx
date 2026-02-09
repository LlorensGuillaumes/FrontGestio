import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";

import { api } from "~/lib/api";

import type { FacturaVenta, FacturaVentaLinea } from "~/types/facturas";
import GridHeader from "../../../components/gridHeader";
import PaginacionBar from "../../../components/paginacionBar";
import DataTable, { type ColumnDef } from "~/components/DataTable";
import type { FilterField } from "~/components/filtro";
import FilterBar from "~/components/filtro";
import FacturaDetalle from "~/modales/facturaDetalle";
import VeriFactuBadge from "~/components/VeriFactuBadge";

const FACTURAS_ENDPOINT = "/facturas/venta";

export default function ListadoVentas() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [facturas, setFacturas] = useState<FacturaVenta[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<React.Key | null>(null);
  const [selectedFactura, setSelectedFactura] = useState<FacturaVenta | null>(null);

  // Get filter values from URL
  const pagina = Number(searchParams.get("pagina") || 1);
  const porPagina = Number(searchParams.get("porPagina") || 20);
  const serie = searchParams.get("serie") || undefined;
  const numeroRaw = searchParams.get("numero");
  const numero = numeroRaw && numeroRaw !== "" && Number.isFinite(Number(numeroRaw)) ? Number(numeroRaw) : undefined;
  const cifCliente = searchParams.get("cifCliente") || undefined;
  const cliente = searchParams.get("cliente") || undefined;
  const desdeRaw = searchParams.get("desdeFecha") || undefined;
  const hastaRaw = searchParams.get("hastaFecha") || undefined;
  const desdeFecha = desdeRaw ? `${desdeRaw}T00:00:00` : undefined;
  const hastaFecha = hastaRaw ? `${hastaRaw}T23:59:59.999` : undefined;
  const estadoFiscal = searchParams.get("estadoFiscal") || undefined;
  const estadoCobro = searchParams.get("estadoCobro") || undefined;

  // Load facturas
  const loadFacturas = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = {
        pagina,
        porPagina,
        serie,
        numero,
        cifCliente,
        cliente,
        estadoFiscal,
        estadoCobro,
        desdeFecha,
        hastaFecha,
      };

      const res = await api.get(FACTURAS_ENDPOINT, { params });
      const data = res.data;

      // Support various response formats
      const paginated = data?.paginatedData ?? data?.facturasVentaFiltrado ?? data;

      setFacturas(paginated?.facturas ?? []);
      setTotalRegistros(paginated?.totalRegistros ?? 0);
      setTotalPaginas(paginated?.totalPaginas ?? 0);
      setPaginaActual(paginated?.paginaActual ?? 1);
    } catch (e: any) {
      console.error("Error loading facturas:", e);
      setLoadError(e?.response?.data?.error ?? e?.message ?? "Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }, [pagina, porPagina, serie, numero, cifCliente, cliente, estadoFiscal, estadoCobro, desdeFecha, hastaFecha]);

  useEffect(() => {
    loadFacturas();
  }, [loadFacturas]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPaginas) return;
    const next = new URLSearchParams(searchParams);
    next.set("pagina", String(newPage));
    setSearchParams(next);
  };

  const handleRefresh = () => {
    loadFacturas();
  };

  const columns = useMemo<ColumnDef<FacturaVenta>[]>(() => {
    return [
      {
        header: "Fecha",
        render: (f) => (
          <span className="flex items-center gap-2">
            <span>{f.fechaFactura ? new Date(f.fechaFactura).toLocaleDateString("es-ES") : ""}</span>
          </span>
        ),
      },
      { header: "Serie", render: (f) => f.serie },
      { header: "Nº", cellClassName: "font-medium text-blue-600", render: (f) => f.numero },
      { header: "Cliente", render: (f) => f.nombreCliente },
      {
        header: "Base",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        render: (f) => f.totalBaseImponible.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: "IVA",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        render: (f) => f.totalCuotaIva.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: "Total",
        headerClassName: "text-right",
        cellClassName: "text-right font-bold text-slate-900 font-mono",
        render: (f) => f.totalFactura.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      { header: "Fiscal", render: (f) => f.estadoFiscal },
      { header: "Cobro", render: (f) => f.estadoCobro },
      {
        header: "VeriFactu",
        render: (f) => (
          <VeriFactuBadge
            estado={f.veriFactuEstado || "NO_ENVIADA"}
            csv={f.veriFactuCSV}
            tipo="venta"
            idFactura={Number(f.id)}
            onEnviado={handleRefresh}
          />
        ),
      },
      {
        header: "Acciones",
        headerClassName: "text-center w-24",
        cellClassName: "text-center",
        render: (f) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFactura(f);
            }}
            className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          >
            Ver
          </button>
        ),
      },
    ];
  }, [expandedId]);

  const lineColumns = useMemo<ColumnDef<FacturaVentaLinea>[]>(() => {
    return [
      { header: "Línea", render: (l) => l.numeroLinea },
      { header: "Item", render: (l) => l.codigoItem },
      { header: "Descripción", render: (l) => l.descripcionItem },
      { header: "Cant.", headerAlign: "right", cellAlign: "right", cellClassName: "font-mono", render: (l) => l.cantidad },
      {
        header: "P.Unit",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) =>
          l.precioUnitario.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      {
        header: "Base",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.baseImporte.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: "% IVA",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.pcIva.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      {
        header: "IVA",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.importeIva.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: "% Desc",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) =>
          l.pcDescuento.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      {
        header: "Desc",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.importeDescuento.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: "Total",
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono font-semibold text-slate-900",
        render: (l) => l.importeLinea.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
    ];
  }, []);

  const filterFields = useMemo<FilterField[]>(
    () => [
      { name: "serie", label: "SERIE", type: "text", colSpan: 1, colStart: 1, rowStart: 1 },
      { name: "numero", label: "Nº", type: "number", colSpan: 1, rowStart: 1 },
      { name: "cliente", label: "CLIENTE", type: "text", colSpan: 2, placeholder: "Nombre / texto...", rowStart: 1 },
      { name: "desdeFecha", label: "DESDE", type: "date", colSpan: 1, rowStart: 1 },
      { name: "hastaFecha", label: "HASTA", type: "date", colSpan: 1, rowStart: 1 },
      {
        name: "estadoFiscal",
        label: "FISCAL",
        type: "select",
        colSpan: 1,
        rowStart: 1,
        options: [
          { value: "BORRADOR", label: "BORRADOR" },
          { value: "EMITIDA", label: "EMITIDA" },
          { value: "RECTIFICATIVA", label: "RECTIFICATIVA" },
        ],
      },
      {
        name: "estadoCobro",
        label: "COBRO",
        type: "select",
        colSpan: 1,
        rowStart: 1,
        options: [
          { value: "PENDIENTE", label: "PENDIENTE" },
          { value: "COBRADA", label: "COBRADA" },
          { value: "COBRADA_PARCIAL", label: "COBRADA PARCIAL" },
          { value: "INCOBRABLE", label: "INCOBRABLE" },
        ],
      },
    ],
    []
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <GridHeader title="Facturas de venta" subtitle="Listado de facturas de venta" />

      {/* Error de carga */}
      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {loadError}
          <button
            onClick={loadFacturas}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <FilterBar fields={filterFields} mdCols={8} preserveParams={["porPagina"]} />

      <PaginacionBar
        currentPage={paginaActual}
        totalPages={totalPaginas}
        onPageChange={handlePageChange}
        windowSize={2}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          <span className="ml-3 text-slate-600">Cargando facturas...</span>
        </div>
      ) : (
        <DataTable<FacturaVenta>
          columns={columns}
          data={facturas}
          getRowKey={(f) => f.id}
          isRowExpandable={(f) => {
            const lineas = f.FacturaVentaLineas || (f as any).facturaVentaLineas || [];
            return lineas.length > 0;
          }}
          isRowExpanded={(_, key) => expandedId === key}
          onToggleExpand={(_, key) => setExpandedId((prev) => (prev === key ? null : key))}
          renderExpandedRow={(factura) => {
            const lineas: FacturaVentaLinea[] =
              factura.FacturaVentaLineas || (factura as any).facturaVentaLineas || [];

            return (
              <div className="border-l-4 border-blue-200 pl-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Detalle de líneas
                </h4>
                <DataTable<FacturaVentaLinea>
                  columns={lineColumns}
                  data={lineas}
                  getRowKey={(l, idx) => l.id ?? `${l.numeroLinea}-${idx}`}
                  emptyText="No se encontraron líneas de detalle."
                  wrapperClassName="bg-white rounded border border-slate-200 overflow-hidden"
                />
              </div>
            );
          }}
        />
      )}

      {selectedFactura && (
        <FacturaDetalle
          factura={selectedFactura}
          onClose={() => setSelectedFactura(null)}
          onRefresh={() => {
            setSelectedFactura(null);
            loadFacturas();
          }}
        />
      )}
    </div>
  );
}
