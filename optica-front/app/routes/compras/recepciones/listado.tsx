// app/routes/compras/recepciones/listado.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import {
  fetchRecepcionesCompra,
  fetchProveedoresLookup,
  getEstadoRecepcion,
  ESTADOS_RECEPCION,
  type RecepcionCompraListItem,
  type RecepcionCompraFull,
  type ProveedorLookup,
} from "~/lib/comprasRest";
import RecepcionCompraModal from "~/modales/recepcionCompraModal";
import FacturaCompraModal from "~/modales/facturaCompraModal";

export default function RecepcionesCompraListado() {
  const { t } = useTranslation(["compras", "common"]);
  const [searchParams] = useSearchParams();

  const q = (searchParams.get("q") ?? "").trim();
  const idProveedor = searchParams.get("idProveedor") ? Number(searchParams.get("idProveedor")) : undefined;
  const estado = searchParams.get("estado") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RecepcionCompraListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [proveedores, setProveedores] = useState<ProveedorLookup[]>([]);

  // Modal state - Recepciones
  const [modalMode, setModalMode] = useState<"new" | "view" | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Modal state - Facturas
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [recepcionParaFactura, setRecepcionParaFactura] = useState<RecepcionCompraFull | null>(null);

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

  // Load recepciones
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRecepcionesCompra(100, 0, {
        q: q || undefined,
        idProveedor,
        estado: estado || undefined,
      });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Error cargando recepciones");
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

  // Handler para crear factura desde recepción
  const handleCreateFactura = (recepcion: RecepcionCompraFull) => {
    closeModal(); // Cerrar modal de recepción
    setRecepcionParaFactura(recepcion);
    setShowFacturaModal(true);
  };

  const closeFacturaModal = () => {
    setShowFacturaModal(false);
    setRecepcionParaFactura(null);
  };

  const handleFacturaSaved = () => {
    load(); // Refrescar para ver que la recepción pasó a FACTURADA
    closeFacturaModal();
  };

  // Filter fields
  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "q",
        label: t("recepcionesList.filtros.buscar"),
        type: "text",
        colSpan: 3,
        placeholder: t("recepcionesList.filtros.buscarPlaceholder"),
      },
      {
        name: "idProveedor",
        label: t("recepcionesList.filtros.proveedor"),
        type: "select",
        colSpan: 3,
        options: [
          { value: "", label: t("recepcionesList.filtros.todosProveedores") },
          ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre })),
        ],
      },
      {
        name: "estado",
        label: t("recepcionesList.filtros.estado"),
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: t("recepcionesList.filtros.todos") },
          ...ESTADOS_RECEPCION.filter(e => e.value !== "ANULADA").map((e) => ({ value: e.value, label: e.label })),
        ],
      },
    ],
    [proveedores, t]
  );

  // Columns
  const columns = useMemo<ColumnDef<RecepcionCompraListItem>[]>(
    () => [
      {
        header: t("recepcionesList.columnas.numero"),
        render: (r) => (
          <div className="font-medium text-slate-900">{r.NumeroRecepcion}</div>
        ),
      },
      {
        header: t("recepcionesList.columnas.albaranProveedor"),
        render: (r) => (
          <div className="text-slate-600">{r.NumeroAlbaranProveedor || "-"}</div>
        ),
      },
      {
        header: t("recepcionesList.columnas.proveedor"),
        render: (r) => (
          <div className="min-w-40">
            <div className="font-medium text-slate-900">{r.NombreProveedor || "-"}</div>
          </div>
        ),
      },
      {
        header: t("recepcionesList.columnas.orden"),
        render: (r) => (
          <div className="text-slate-500 text-sm">{r.NumeroOrden || "-"}</div>
        ),
      },
      {
        header: t("recepcionesList.columnas.fecha"),
        render: (r) => (
          <div className="text-slate-600">
            {r.FechaRecepcion ? new Date(r.FechaRecepcion).toLocaleDateString("es-ES") : "-"}
          </div>
        ),
      },
      {
        header: t("recepcionesList.columnas.total"),
        headerAlign: "right",
        cellAlign: "right",
        render: (r) => (
          <div className="font-medium text-slate-900">
            {Number(r.Total ?? 0).toFixed(2)} €
          </div>
        ),
      },
      {
        header: t("recepcionesList.columnas.estado"),
        headerAlign: "center",
        cellAlign: "center",
        render: (r) => {
          const estado = getEstadoRecepcion(r.Estado);
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${estado.color}`}>
              {estado.label}
            </span>
          );
        },
      },
      {
        header: t("recepcionesList.columnas.acciones"),
        headerAlign: "right",
        cellAlign: "right",
        render: (r) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openModal("view", r.id)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              title={t("recepcionesList.ver")}
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
    [t]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("recepcionesList.titulo")}</h2>
          <p className="text-slate-500 text-sm">
            {loading ? t("recepcionesList.cargando") : t("recepcionesList.totalRecepciones", { total })}
          </p>
        </div>

        <button
          onClick={() => openModal("new")}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("recepcionesList.nuevaRecepcion")}
        </button>
      </div>

      <FilterBar fields={filterFields} mdCols={8} />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      )}

      <DataTable<RecepcionCompraListItem>
        columns={columns}
        data={rows}
        getRowKey={(r) => r.id}
        emptyText={loading ? t("recepcionesList.cargando") : t("recepcionesList.sinRecepciones")}
        onRowClick={(r) => openModal("view", r.id)}
      />

      {modalMode && (
        <RecepcionCompraModal
          mode={modalMode}
          id={selectedId ?? undefined}
          proveedores={proveedores}
          onClose={closeModal}
          onSaved={handleSaved}
          onCreateFactura={handleCreateFactura}
        />
      )}

      {showFacturaModal && (
        <FacturaCompraModal
          mode="new"
          proveedores={proveedores}
          recepcionPreseleccionada={recepcionParaFactura ?? undefined}
          onClose={closeFacturaModal}
          onSaved={handleFacturaSaved}
        />
      )}
    </div>
  );
}
