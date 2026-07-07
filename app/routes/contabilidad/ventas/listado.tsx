import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
import FacturacionMensualModal from "~/components/FacturacionMensualModal";
import SepaModal from "~/components/SepaModal";
import { updateEstadoFactura, ESTADOS_COBRO, ESTADOS_FISCAL } from "~/lib/sepaRest";

const FACTURAS_ENDPOINT = "/facturas/venta";

export default function ListadoVentas() {
  const { t } = useTranslation(["contabilidad", "common"]);
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
  const [showFacturacionMensual, setShowFacturacionMensual] = useState(false);
  const [showSepa, setShowSepa] = useState(false);

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
        header: t("ventasListado.colFecha"),
        render: (f) => (
          <span className="flex items-center gap-2">
            <span>{f.fechaFactura ? new Date(f.fechaFactura).toLocaleDateString("es-ES") : ""}</span>
          </span>
        ),
      },
      { header: t("ventasListado.colSerie"), render: (f) => f.serie },
      { header: t("ventasListado.colNumero"), cellClassName: "font-medium text-blue-600", render: (f) => f.numero },
      { header: t("ventasListado.colCliente"), render: (f) => f.nombreCliente },
      {
        header: t("ventasListado.colBase"),
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        render: (f) => f.totalBaseImponible.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: t("ventasListado.colIva"),
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        render: (f) => f.totalCuotaIva.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: t("ventasListado.colTotal"),
        headerClassName: "text-right",
        cellClassName: "text-right font-bold text-slate-900 font-mono",
        render: (f) => f.totalFactura.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: t("ventasListado.colFiscal"),
        render: (f) => (
          <select
            value={f.estadoFiscal}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => { await updateEstadoFactura(Number(f.id), { estadoFiscal: e.target.value }); loadFacturas(); }}
            className="text-xs rounded border border-slate-200 px-1.5 py-1 bg-white"
          >
            {ESTADOS_FISCAL.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        ),
      },
      {
        header: t("ventasListado.colCobro"),
        render: (f) => {
          const color = f.estadoCobro === "PAGADA" ? "text-green-700 border-green-300 bg-green-50"
            : f.estadoCobro === "SEPA_GENERADO" ? "text-blue-700 border-blue-300 bg-blue-50"
            : f.estadoCobro === "DEVUELTA" ? "text-red-700 border-red-300 bg-red-50"
            : "text-slate-700 border-slate-200 bg-white";
          return (
            <select
              value={f.estadoCobro}
              onClick={(e) => e.stopPropagation()}
              onChange={async (e) => { await updateEstadoFactura(Number(f.id), { estadoCobro: e.target.value }); loadFacturas(); }}
              className={`text-xs rounded border px-1.5 py-1 font-medium ${color}`}
            >
              {ESTADOS_COBRO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          );
        },
      },
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
        header: t("ventasListado.colAcciones"),
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
            {t("common:breadcrumb.ver")}
          </button>
        ),
      },
    ];
  }, [expandedId, t]);

  const lineColumns = useMemo<ColumnDef<FacturaVentaLinea>[]>(() => {
    return [
      { header: t("ventasListado.lineaCol"), render: (l) => l.numeroLinea },
      { header: t("ventasListado.itemCol"), render: (l) => l.codigoItem },
      { header: t("ventasListado.descripcionCol"), render: (l) => l.descripcionItem },
      { header: t("ventasListado.cantCol"), headerAlign: "right", cellAlign: "right", cellClassName: "font-mono", render: (l) => l.cantidad },
      {
        header: t("ventasListado.pUnitCol"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) =>
          l.precioUnitario.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      {
        header: t("ventasListado.colBase"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.baseImporte.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: t("ventasListado.pcIvaCol"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.pcIva.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      {
        header: t("ventasListado.colIva"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.importeIva.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: t("ventasListado.pcDescCol"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) =>
          l.pcDescuento.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      },
      {
        header: t("ventasListado.descCol"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono",
        render: (l) => l.importeDescuento.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
      {
        header: t("ventasListado.colTotal"),
        headerAlign: "right",
        cellAlign: "right",
        cellClassName: "font-mono font-semibold text-slate-900",
        render: (l) => l.importeLinea.toLocaleString("es-ES", { style: "currency", currency: "EUR" }),
      },
    ];
  }, [t]);

  const filterFields = useMemo<FilterField[]>(
    () => [
      { name: "serie", label: t("ventasListado.filtroSerie"), type: "text", colSpan: 1, colStart: 1, rowStart: 1 },
      { name: "numero", label: t("ventasListado.filtroNumero"), type: "number", colSpan: 1, rowStart: 1 },
      { name: "cliente", label: t("ventasListado.filtroCliente"), type: "text", colSpan: 2, placeholder: t("ventasListado.filtroClientePlaceholder"), rowStart: 1 },
      { name: "desdeFecha", label: t("ventasListado.filtroDesde"), type: "date", colSpan: 1, rowStart: 1 },
      { name: "hastaFecha", label: t("ventasListado.filtroHasta"), type: "date", colSpan: 1, rowStart: 1 },
      {
        name: "estadoFiscal",
        label: t("ventasListado.filtroFiscal"),
        type: "select",
        colSpan: 1,
        rowStart: 1,
        options: [
          { value: "BORRADOR", label: t("ventasListado.fiscalBorrador") },
          { value: "EMITIDA", label: t("ventasListado.fiscalEmitida") },
          { value: "RECTIFICATIVA", label: t("ventasListado.fiscalRectificativa") },
        ],
      },
      {
        name: "estadoCobro",
        label: t("ventasListado.filtroCobro"),
        type: "select",
        colSpan: 1,
        rowStart: 1,
        options: [
          { value: "PENDIENTE", label: t("ventasListado.cobroPendiente") },
          { value: "COBRADA", label: t("ventasListado.cobroCobrada") },
          { value: "COBRADA_PARCIAL", label: t("ventasListado.cobroCobradaParcial") },
          { value: "INCOBRABLE", label: t("ventasListado.cobroIncobrable") },
        ],
      },
    ],
    [t]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <GridHeader title={t("ventasListado.titulo")} subtitle={t("ventasListado.subtitulo")} />
        <div className="mt-1 flex gap-2">
          <button
            onClick={() => setShowFacturacionMensual(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
          >
            {t("ventasListado.generarMensualidades")}
          </button>
          <button
            onClick={() => setShowSepa(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium whitespace-nowrap"
          >
            {t("ventasListado.generarSepa")}
          </button>
        </div>
      </div>
      {showSepa && (
        <SepaModal
          idsFactura={facturas.map((f: any) => Number(f.id ?? f.IdFactura ?? f.idFactura)).filter(Boolean)}
          onClose={() => setShowSepa(false)}
        />
      )}
      {showFacturacionMensual && (
        <FacturacionMensualModal
          onClose={() => setShowFacturacionMensual(false)}
          onGenerated={() => loadFacturas()}
        />
      )}

      {/* Error de carga */}
      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {loadError}
          <button
            onClick={loadFacturas}
            className="ml-4 text-sm underline hover:no-underline"
          >
            {t("ventasListado.reintentar")}
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
          <span className="ml-3 text-slate-600">{t("ventasListado.cargandoFacturas")}</span>
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
                  {t("ventasListado.detalleLineas")}
                </h4>
                <DataTable<FacturaVentaLinea>
                  columns={lineColumns}
                  data={lineas}
                  getRowKey={(l, idx) => l.id ?? `${l.numeroLinea}-${idx}`}
                  emptyText={t("ventasListado.sinLineas")}
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
