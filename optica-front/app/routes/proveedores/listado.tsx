// app/routes/proveedores/listado.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext, useSearchParams } from "react-router";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import {
  fetchProveedoresFullPage,
  fetchProveedorProductos,
  type ProveedorListItem,
} from "~/lib/proveedoresRest";
import type { ProveedoresOutletContext } from "./layout";

type ProductoProveedor = {
  id: number;
  Nombre: string;
  Codigo?: string;
  PVP?: number;
  PrecioCoste?: number;
  ReferenciaProveedor?: string;
  PrecioProveedor?: number;
  Marca?: string;
};

export default function ProveedoresListado() {
  const { openProveedorModal, refreshToken } = useOutletContext<ProveedoresOutletContext>();
  const [searchParams] = useSearchParams();

  // filtros por URL
  const q = (searchParams.get("q") ?? "").trim();
  const nifQ = (searchParams.get("nif") ?? "").trim();
  const emailQ = (searchParams.get("email") ?? "").trim();
  const telQ = (searchParams.get("telefono") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProveedorListItem[]>([]);
  const [total, setTotal] = useState(0);

  // Estados para filas expandidas
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [productosCache, setProductosCache] = useState<Record<number, ProductoProveedor[]>>({});
  const [loadingProductos, setLoadingProductos] = useState<Set<number>>(new Set());

  // -------------------------
  // Carga REST
  // -------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchProveedoresFullPage(500, 0, {
        q: q || undefined,
        nif: nifQ || undefined,
        email: emailQ || undefined,
        telefono: telQ || undefined,
        soloActivos: true,
      });

      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Error cargando proveedores");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, nifQ, emailQ, telQ]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const anyFilter = Boolean(q) || Boolean(nifQ) || Boolean(emailQ) || Boolean(telQ);

  // -------------------------
  // Cargar productos de un proveedor
  // -------------------------
  const loadProductos = useCallback(async (proveedorId: number) => {
    if (productosCache[proveedorId] || loadingProductos.has(proveedorId)) return;

    setLoadingProductos((prev) => new Set(prev).add(proveedorId));
    try {
      const productos = await fetchProveedorProductos(proveedorId);
      setProductosCache((prev) => ({ ...prev, [proveedorId]: productos ?? [] }));
    } catch (e) {
      setProductosCache((prev) => ({ ...prev, [proveedorId]: [] }));
    } finally {
      setLoadingProductos((prev) => {
        const next = new Set(prev);
        next.delete(proveedorId);
        return next;
      });
    }
  }, [productosCache, loadingProductos]);

  // -------------------------
  // Toggle expand
  // -------------------------
  const handleToggleExpand = useCallback((row: ProveedorListItem) => {
    const id = row.id;
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        loadProductos(id);
      }
      return next;
    });
  }, [loadProductos]);

  // -------------------------
  // FilterBar
  // -------------------------
  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "q",
        label: "BUSCAR",
        type: "text",
        colSpan: 3,
        placeholder: "Nombre, razón social...",
      },
      {
        name: "nif",
        label: "NIF/CIF",
        type: "text",
        colSpan: 2,
        placeholder: "NIF/CIF...",
      },
      {
        name: "email",
        label: "EMAIL",
        type: "text",
        colSpan: 2,
        placeholder: "correo@...",
      },
      {
        name: "telefono",
        label: "TELÉFONO",
        type: "text",
        colSpan: 1,
        placeholder: "Tel / móvil...",
      },
    ],
    []
  );

  const getDisplayName = (p: ProveedorListItem) => {
    const nombre = p.Nombre?.trim();
    if (nombre) return nombre;
    const comercial = p.NombreComercial?.trim();
    if (comercial) return comercial;
    return "—";
  };

  const getPrimaryPhone = (p: ProveedorListItem) => {
    if (!p.telefonos?.length) return "—";
    return p.telefonos[0].telefono;
  };

  // -------------------------
  // Columnas
  // -------------------------
  const columns = useMemo<ColumnDef<ProveedorListItem>[]>(() => {
    return [
      {
        header: "Proveedor",
        render: (p) => (
          <div className="min-w-72">
            <div className="font-medium text-slate-900">{getDisplayName(p)}</div>
            <div className="text-xs text-slate-400">
              {p.NIF ?? "—"}
              {p.Activo === 0 ? " · Inactivo" : ""}
            </div>
          </div>
        ),
      },
      {
        header: "Contacto",
        render: (p) => (
          <div className="min-w-64 text-sm text-slate-700">
            <div className="truncate">{p.Email ?? "—"}</div>
            <div className="text-xs text-slate-400 truncate">
              {p.subfamilias?.length
                ? p.subfamilias.map((s) => s.descripcion).join(", ")
                : "Sin familias"}
            </div>
          </div>
        ),
      },
      {
        header: "Teléfono",
        render: (p) => (
          <div className="min-w-40 text-sm text-slate-700">
            {getPrimaryPhone(p)}
          </div>
        ),
      },
      {
        header: "Acciones",
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openProveedorModal("view", String(p.id))}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
              title="Ver proveedor"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => openProveedorModal("edit", String(p.id))}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
              title="Editar proveedor"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        ),
      },
    ];
  }, [openProveedorModal]);

  // -------------------------
  // Render subgrid de productos
  // -------------------------
  const renderExpandedRow = useCallback((p: ProveedorListItem) => {
    const productos = productosCache[p.id];
    const isLoading = loadingProductos.has(p.id);

    if (isLoading) {
      return (
        <div className="text-sm text-slate-500 py-4">
          Cargando productos...
        </div>
      );
    }

    if (!productos || productos.length === 0) {
      return (
        <div className="text-sm text-slate-400 py-4">
          Este proveedor no tiene productos asociados.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase mb-2">
          Productos suministrados ({productos.length})
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200">
              <th className="text-left py-2 px-2 font-medium">Código</th>
              <th className="text-left py-2 px-2 font-medium">Producto</th>
              <th className="text-left py-2 px-2 font-medium">Ref. Proveedor</th>
              <th className="text-right py-2 px-2 font-medium">Precio Coste</th>
              <th className="text-right py-2 px-2 font-medium">PVP</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => (
              <tr key={prod.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-2 text-slate-600">{prod.Codigo || "—"}</td>
                <td className="py-2 px-2 text-slate-800 font-medium">{prod.Nombre}</td>
                <td className="py-2 px-2 text-slate-500">{prod.ReferenciaProveedor || "—"}</td>
                <td className="py-2 px-2 text-right text-slate-600">
                  {prod.PrecioProveedor != null ? `${prod.PrecioProveedor.toFixed(2)} €` : "—"}
                </td>
                <td className="py-2 px-2 text-right text-slate-600">
                  {prod.PVP != null ? `${prod.PVP.toFixed(2)} €` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [productosCache, loadingProductos]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-slate-500 text-sm">
            {loading ? "Cargando..." : `${total} proveedores`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openProveedorModal("new")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          + Nuevo proveedor
        </button>
      </div>

      <FilterBar fields={filterFields} mdCols={8} preserveParams={["modal", "mode", "id"]} />

      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      ) : null}

      <DataTable<ProveedorListItem>
        columns={columns}
        data={rows}
        getRowKey={(p) => p.id}
        emptyText={
          loading
            ? "Cargando..."
            : anyFilter
            ? "No se han encontrado proveedores con esos filtros."
            : "No hay proveedores."
        }
        onRowClick={(p) => openProveedorModal("view", String(p.id))}
        showExpandColumn={true}
        isRowExpandable={() => true}
        isRowExpanded={(p) => expandedRows.has(p.id)}
        onToggleExpand={(p) => handleToggleExpand(p)}
        renderExpandedRow={renderExpandedRow}
        disableRowClickWhenExpanded={false}
      />
    </div>
  );
}
