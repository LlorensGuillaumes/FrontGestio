// app/routes/compras/ordenes/listado.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import {
  fetchOrdenesCompra,
  fetchProveedoresLookup,
  getEstadoOrden,
  ESTADOS_ORDEN,
  type OrdenCompraListItem,
  type ProveedorLookup,
} from "~/lib/comprasRest";
import OrdenCompraModal from "~/modales/ordenCompraModal";

export default function OrdenesCompraListado() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = (searchParams.get("q") ?? "").trim();
  const idProveedor = searchParams.get("idProveedor") ? Number(searchParams.get("idProveedor")) : undefined;
  const estado = searchParams.get("estado") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<OrdenCompraListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [proveedores, setProveedores] = useState<ProveedorLookup[]>([]);

  // Modal state
  const [modalMode, setModalMode] = useState<"new" | "view" | "edit" | null>(null);
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

  // Load ordenes
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrdenesCompra(100, 0, {
        q: q || undefined,
        idProveedor,
        estado: estado || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Error cargando ordenes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, idProveedor, estado]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (mode: "new" | "view" | "edit", id?: number) => {
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
          ...ESTADOS_ORDEN.filter(e => e.value !== "ANULADA").map((e) => ({ value: e.value, label: e.label })),
        ],
      },
    ],
    [proveedores]
  );

  // Columns
  const columns = useMemo<ColumnDef<OrdenCompraListItem>[]>(
    () => [
      {
        header: "Numero",
        render: (o) => (
          <div className="font-medium text-slate-900">{o.NumeroOrden}</div>
        ),
      },
      {
        header: "Proveedor",
        render: (o) => (
          <div className="min-w-48">
            <div className="font-medium text-slate-900">{o.NombreProveedor || "-"}</div>
          </div>
        ),
      },
      {
        header: "Fecha",
        render: (o) => (
          <div className="text-slate-600">
            {o.FechaOrden ? new Date(o.FechaOrden).toLocaleDateString("es-ES") : "-"}
          </div>
        ),
      },
      {
        header: "Entrega Prevista",
        render: (o) => (
          <div className="text-slate-500 text-sm">
            {o.FechaEntregaPrevista
              ? new Date(o.FechaEntregaPrevista).toLocaleDateString("es-ES")
              : "-"}
          </div>
        ),
      },
      {
        header: "Total",
        headerAlign: "right",
        cellAlign: "right",
        render: (o) => (
          <div className="font-medium text-slate-900">
            {Number(o.Total ?? 0).toFixed(2)} €
          </div>
        ),
      },
      {
        header: "Estado",
        headerAlign: "center",
        cellAlign: "center",
        render: (o) => {
          const estado = getEstadoOrden(o.Estado);
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${estado.color}`}>
              {estado.label}
            </span>
          );
        },
      },
      {
        header: "Acciones",
        headerAlign: "right",
        cellAlign: "right",
        render: (o) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openModal("view", o.id)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Ver"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            {o.Estado === "BORRADOR" && (
              <button
                onClick={() => openModal("edit", o.id)}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ordenes de Compra</h2>
          <p className="text-slate-500 text-sm">
            {loading ? "Cargando..." : `${total} ordenes`}
          </p>
        </div>

        <button
          onClick={() => openModal("new")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Orden
        </button>
      </div>

      <FilterBar fields={filterFields} mdCols={8} />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      )}

      <DataTable<OrdenCompraListItem>
        columns={columns}
        data={rows}
        getRowKey={(o) => o.id}
        emptyText={loading ? "Cargando..." : "No hay ordenes de compra."}
        onRowClick={(o) => openModal("view", o.id)}
      />

      {modalMode && (
        <OrdenCompraModal
          mode={modalMode}
          id={selectedId ?? undefined}
          proveedores={proveedores}
          onClose={closeModal}
          onSaved={handleSaved}
          onEdit={() => setModalMode("edit")}
        />
      )}
    </div>
  );
}
