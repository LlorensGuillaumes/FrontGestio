// app/routes/productos/listado.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import {
  fetchProductosFullPage,
  fetchFamiliasProductos,
  fetchSubfamiliasProductos,
  fetchMarcas,
  type ProductoListItem,
} from "~/lib/productosFullRest";
import type { ProductosOutletContext } from "./layout";

type Familia = { IdFamiliaProducto: number; Descripcion: string };
type Subfamilia = { IdSubFamiliaProducto: number; IdFamiliaProducto: number; Descripcion: string };
type Marca = { IdMarca: number; Descripcion: string };

export default function ProductosListado() {
  const { t } = useTranslation("productos");
  const { openProductoModal, refreshToken } = useOutletContext<ProductosOutletContext>();
  const [searchParams] = useSearchParams();

  // filtros por URL
  const q = (searchParams.get("q") ?? "").trim();
  const codigo = (searchParams.get("codigo") ?? "").trim();
  const idMarca = searchParams.get("idMarca") ? Number(searchParams.get("idMarca")) : undefined;
  const idFamilia = searchParams.get("idFamilia") ? Number(searchParams.get("idFamilia")) : undefined;
  const idSubfamilia = searchParams.get("idSubfamilia") ? Number(searchParams.get("idSubfamilia")) : undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductoListItem[]>([]);
  const [total, setTotal] = useState(0);

  // Lookups
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  // Load lookups
  useEffect(() => {
    Promise.all([
      fetchFamiliasProductos(),
      fetchSubfamiliasProductos(),
      fetchMarcas(),
    ]).then(([famRes, subRes, marcRes]) => {
      const fam = famRes ?? [];
      const sub = subRes ?? [];
      const mar = marcRes ?? [];
      setFamilias(fam);
      setSubfamilias(sub);
      setMarcas(mar);
    }).catch(console.error);
  }, []);

  // -------------------------
  // Carga REST
  // -------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchProductosFullPage(500, 0, {
        q: q || undefined,
        codigo: codigo || undefined,
        idMarca,
        idFamilia,
        idSubfamilia,
        soloActivos: true,
      });

      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Error cargando productos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, codigo, idMarca, idFamilia, idSubfamilia]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const anyFilter = Boolean(q) || Boolean(codigo) || Boolean(idMarca) || Boolean(idFamilia) || Boolean(idSubfamilia);

  // Subfamilias filtradas por familia seleccionada
  const subfamiliasFiltradas = useMemo(() => {
    if (!idFamilia) return subfamilias;
    return subfamilias.filter((s) => s.IdFamiliaProducto === idFamilia);
  }, [subfamilias, idFamilia]);

  // -------------------------
  // FilterBar
  // -------------------------
  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "q",
        label: t("common:buttons.search", { ns: "common" }).toUpperCase(),
        type: "text",
        colSpan: 2,
        placeholder: `${t("fields.name")}, ${t("fields.description")}...`,
      },
      {
        name: "codigo",
        label: t("fields.code").toUpperCase(),
        type: "text",
        colSpan: 1,
        placeholder: `${t("fields.code")}...`,
      },
      {
        name: "idMarca",
        label: t("fields.brand").toUpperCase(),
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: t("common:filters.all", { ns: "common" }) },
          ...marcas.map((m) => ({ value: String(m.IdMarca), label: m.Descripcion })),
        ],
      },
      {
        name: "idFamilia",
        label: t("families.title").toUpperCase(),
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: t("common:filters.all", { ns: "common" }) },
          ...familias.map((f) => ({ value: String(f.IdFamiliaProducto), label: f.Descripcion })),
        ],
      },
      {
        name: "idSubfamilia",
        label: t("families.subfamilies").toUpperCase(),
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: t("common:filters.all", { ns: "common" }) },
          ...subfamiliasFiltradas.map((s) => ({ value: String(s.IdSubFamiliaProducto), label: s.Descripcion })),
        ],
      },
    ],
    [marcas, familias, subfamiliasFiltradas, t]
  );

  // -------------------------
  // Columnas
  // -------------------------
  const columns = useMemo<ColumnDef<ProductoListItem>[]>(() => {
    return [
      {
        header: t("fields.code"),
        render: (p) => (
          <div className="min-w-24 font-mono text-sm text-slate-600">
            {p.Codigo || "—"}
          </div>
        ),
      },
      {
        header: t("title"),
        render: (p) => (
          <div className="min-w-64">
            <div className="font-medium text-slate-900">{p.Nombre}</div>
            <div className="text-xs text-slate-400">
              {p.NombreMarca ?? t("fields.noBrand")}
              {p.Activo === 0 ? ` · ${t("common:filters.inactive", { ns: "common" })}` : ""}
            </div>
          </div>
        ),
      },
      {
        header: t("families.title"),
        render: (p) => {
          const subs = p.subfamilias ?? [];
          if (!subs.length) return <span className="text-slate-400">—</span>;

          const visible = subs.slice(0, 2);
          const rest = subs.slice(2);
          const restNames = rest.map((s: any) => s.descripcion).join(", ");

          return (
            <div className="flex flex-wrap gap-1 max-w-40">
              {visible.map((s: any, i: number) => (
                <span
                  key={i}
                  className="inline-flex px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-600 truncate max-w-20"
                  title={s.descripcion}
                >
                  {s.descripcion}
                </span>
              ))}
              {rest.length > 0 && (
                <span
                  className="inline-flex px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 cursor-help"
                  title={restNames}
                >
                  +{rest.length}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: t("fields.stock"),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="min-w-20 text-sm text-slate-700">
            {p.Stock ?? 0}
          </div>
        ),
      },
      {
        header: t("common:fields.price", { ns: "common" }),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="min-w-24 text-sm text-slate-600">
            {p.PrecioCoste != null ? `${Number(p.PrecioCoste).toFixed(2)} EUR` : "—"}
          </div>
        ),
      },
      {
        header: t("fields.pvp"),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="min-w-24 text-sm font-medium text-slate-800">
            {p.PVP != null ? `${Number(p.PVP).toFixed(2)} EUR` : "—"}
          </div>
        ),
      },
      {
        header: t("clientes:columns.actions", { ns: "clientes" }),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="flex justify-end gap-1 min-w-20" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openProductoModal("view", String(p.id))}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
              title={t("detailProduct")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => openProductoModal("edit", String(p.id))}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
              title={t("editProduct")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        ),
      },
    ];
  }, [openProductoModal, t]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("common:messages.loading", { ns: "common" }) : `${total} ${t("title").toLowerCase()}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openProductoModal("new")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          + {t("newProduct")}
        </button>
      </div>

      <FilterBar fields={filterFields} mdCols={10} preserveParams={["modal", "mode", "id"]} />

      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      ) : null}

      <DataTable<ProductoListItem>
        columns={columns}
        data={rows}
        getRowKey={(p) => p.id}
        emptyText={
          loading
            ? t("common:messages.loading", { ns: "common" })
            : anyFilter
            ? t("common:messages.noResults", { ns: "common" })
            : t("common:messages.noRecords", { ns: "common" })
        }
        onRowClick={(p) => openProductoModal("view", String(p.id))}
        showExpandColumn={false}
      />
    </div>
  );
}
