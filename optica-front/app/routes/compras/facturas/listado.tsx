// app/routes/compras/facturas/listado.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import {
  fetchFacturasCompra,
  fetchProveedoresLookup,
  getEstadoFacturaCompra,
  ESTADOS_FACTURA_COMPRA,
  type FacturaCompraListItem,
  type ProveedorLookup,
} from "~/lib/comprasRest";
import FacturaCompraModal from "~/modales/facturaCompraModal";
import VeriFactuBadge from "~/components/VeriFactuBadge";

export default function FacturasCompraListado() {
  const [searchParams] = useSearchParams();

  const q = (searchParams.get("q") ?? "").trim();
  const idProveedor = searchParams.get("idProveedor") ? Number(searchParams.get("idProveedor")) : undefined;
  const estado = searchParams.get("estado") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FacturaCompraListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [proveedores, setProveedores] = useState<ProveedorLookup[]>([]);

  // Modal state
  const [modalMode, setModalMode] = useState<"new" | "view" | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Load proveedores
  useEffect(() => {
    fetchProveedoresLookup()
      .then((data) => {
        setProveedores(data ?? []);
      })
      .catch((err) => {
        console.error("Error cargando proveedores:", err);
        setProveedores([]);
      });
  }, []);

  // Load facturas
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFacturasCompra(100, 0, {
        q: q || undefined,
        idProveedor,
        estado: estado || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Error cargando facturas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, idProveedor, estado]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (mode: "new" | "view", id?: number) => {
    setModalMode(mode);
    setSelectedId(id ?? null);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedId(null);
  };

  const handleSaved = () => {
    load();
    closeModal();
  };

  // Filter fields
  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "q",
        label: "BUSCAR",
        type: "text",
        colSpan: 3,
        placeholder: "Numero, proveedor...",
      },
      {
        name: "idProveedor",
        label: "PROVEEDOR",
        type: "select",
        colSpan: 3,
        options: [
          { value: "", label: "Todos los proveedores" },
          ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre })),
        ],
      },
      {
        name: "estado",
        label: "ESTADO",
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: "Todos" },
          ...ESTADOS_FACTURA_COMPRA.filter(e => e.value !== "ANULADA").map((e) => ({ value: e.value, label: e.label })),
        ],
      },
    ],
    [proveedores]
  );

  // Columns
  const columns = useMemo<ColumnDef<FacturaCompraListItem>[]>(
    () => [
      {
        header: "Numero",
        render: (f) => (
          <div className="font-medium text-slate-900">
            {f.SerieFactura ? `${f.SerieFactura}-` : ""}{f.NumeroFactura}
          </div>
        ),
      },
      {
        header: "Proveedor",
        render: (f) => (
          <div className="min-w-48">
            <div className="font-medium text-slate-900">{f.NombreProveedor || "-"}</div>
          </div>
        ),
      },
      {
        header: "Fecha",
        render: (f) => (
          <div className="text-slate-600">
            {f.FechaFactura ? new Date(f.FechaFactura).toLocaleDateString("es-ES") : "-"}
          </div>
        ),
      },
      {
        header: "Total",
        headerAlign: "right",
        cellAlign: "right",
        render: (f) => (
          <div className="font-medium text-slate-900">
            {Number(f.TotalFactura ?? 0).toFixed(2)} €
          </div>
        ),
      },
      {
        header: "Pagado",
        headerAlign: "right",
        cellAlign: "right",
        render: (f) => (
          <div className="text-emerald-600">
            {Number(f.ImportePagado ?? 0).toFixed(2)} €
          </div>
        ),
      },
      {
        header: "Pendiente",
        headerAlign: "right",
        cellAlign: "right",
        render: (f) => (
          <div className={f.ImportePendiente > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>
            {Number(f.ImportePendiente ?? 0).toFixed(2)} €
          </div>
        ),
      },
      {
        header: "Estado",
        headerAlign: "center",
        cellAlign: "center",
        render: (f) => {
          const estado = getEstadoFacturaCompra(f.Estado);
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${estado.color}`}>
              {estado.label}
            </span>
          );
        },
      },
      {
        header: "VeriFactu",
        render: (f) => (
          <VeriFactuBadge
            estado={f.VeriFactuEstado || "NO_ENVIADA"}
            csv={f.VeriFactuCSV}
            tipo="compra"
            idFactura={f.id}
            onEnviado={() => load()}
          />
        ),
      },
      {
        header: "Acciones",
        headerAlign: "right",
        cellAlign: "right",
        render: (f) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openModal("view", f.id)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Ver"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Estadisticas
  const stats = useMemo(() => {
    const pendiente = rows.reduce((sum, f) => sum + (f.ImportePendiente ?? 0), 0);
    const pagado = rows.reduce((sum, f) => sum + (f.ImportePagado ?? 0), 0);
    return { pendiente, pagado };
  }, [rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Facturas de Compra</h2>
          <p className="text-slate-500 text-sm">
            {loading ? "Cargando..." : `${total} facturas`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex gap-3 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
              <span className="text-amber-600 font-medium">Pendiente: {stats.pendiente.toFixed(2)} €</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-600 font-medium">Pagado: {stats.pagado.toFixed(2)} €</span>
            </div>
          </div>

          <button
            onClick={() => openModal("new")}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Factura
          </button>
        </div>
      </div>

      <FilterBar fields={filterFields} mdCols={8} />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      )}

      <DataTable<FacturaCompraListItem>
        columns={columns}
        data={rows}
        getRowKey={(f) => f.id}
        emptyText={loading ? "Cargando..." : "No hay facturas de compra."}
        onRowClick={(f) => openModal("view", f.id)}
      />

      {modalMode && (
        <FacturaCompraModal
          mode={modalMode}
          id={selectedId ?? undefined}
          proveedores={proveedores}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
