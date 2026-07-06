// app/routes/productos/stock/listado.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext, useSearchParams } from "react-router";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import {
  fetchProductosStock,
  getEstadoStock,
  type ProductoStockItem,
} from "~/lib/stockRest";
import { fetchFamiliasProductos } from "~/lib/productosFullRest";
import type { StockOutletContext } from "./layout";

type Familia = { IdFamiliaProducto: number; Descripcion: string; subfamilias?: Subfamilia[] };
type Subfamilia = { IdSubFamiliaProducto: number; IdFamiliaProducto: number; Descripcion: string };

export default function StockListado() {
  const { t } = useTranslation(["productos", "common"]);
  const { openHistorialModal, refreshToken } = useOutletContext<StockOutletContext>();
  const [searchParams] = useSearchParams();

  // Filtros por URL
  const q = (searchParams.get("q") ?? "").trim();
  const idFamilia = searchParams.get("idFamilia") ? Number(searchParams.get("idFamilia")) : undefined;
  const idSubfamilia = searchParams.get("idSubfamilia") ? Number(searchParams.get("idSubfamilia")) : undefined;
  const stockBajo = searchParams.get("stockBajo") === "1";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductoStockItem[]>([]);
  const [total, setTotal] = useState(0);

  // Lookups
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);

  // Load lookups
  useEffect(() => {
    fetchFamiliasProductos()
      .then((famRes) => {
        const fam = famRes ?? [];
        setFamilias(fam);

        // Extraer subfamilias de las familias
        const allSubfamilias: Subfamilia[] = [];
        fam.forEach((f: any) => {
          (f.subfamilias ?? []).forEach((sf: any) => {
            allSubfamilias.push({
              IdSubFamiliaProducto: sf.IdSubFamiliaProducto,
              IdFamiliaProducto: f.IdFamiliaProducto,
              Descripcion: sf.Descripcion,
            });
          });
        });
        setSubfamilias(allSubfamilias);
      })
      .catch(console.error);
  }, []);

  // Carga REST
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchProductosStock(500, 0, {
        q: q || undefined,
        idFamilia,
        idSubfamilia,
        stockBajo: stockBajo || undefined,
      });

      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? "Error cargando stock");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, idFamilia, idSubfamilia, stockBajo]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const anyFilter = Boolean(q) || Boolean(idFamilia) || Boolean(idSubfamilia) || stockBajo;

  // Subfamilias filtradas por familia seleccionada
  const subfamiliasFiltradas = useMemo(() => {
    if (!idFamilia) return subfamilias;
    return subfamilias.filter((s) => s.IdFamiliaProducto === idFamilia);
  }, [subfamilias, idFamilia]);

  // FilterBar
  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "q",
        label: t("stockList.filtros.buscar"),
        type: "text",
        colSpan: 3,
        placeholder: t("stockList.filtros.buscarPlaceholder"),
      },
      {
        name: "idFamilia",
        label: t("stockList.filtros.familia"),
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: t("stockList.filtros.todasFamilias") },
          ...familias.map((f) => ({ value: String(f.IdFamiliaProducto), label: f.Descripcion })),
        ],
      },
      {
        name: "idSubfamilia",
        label: t("stockList.filtros.subfamilia"),
        type: "select",
        colSpan: 2,
        options: [
          { value: "", label: t("stockList.filtros.todasSubfamilias") },
          ...subfamiliasFiltradas.map((s) => ({ value: String(s.IdSubFamiliaProducto), label: s.Descripcion })),
        ],
      },
      {
        name: "stockBajo",
        label: t("stockList.filtros.soloStockBajo"),
        type: "checkbox",
        colSpan: 2,
      },
    ],
    [familias, subfamiliasFiltradas, t]
  );

  // Columnas
  const columns = useMemo<ColumnDef<ProductoStockItem>[]>(() => {
    return [
      {
        header: t("stockList.cols.codigo"),
        render: (p) => (
          <div className="min-w-24 font-mono text-sm text-slate-600">
            {p.Codigo || "-"}
          </div>
        ),
      },
      {
        header: t("stockList.cols.producto"),
        render: (p) => (
          <div className="min-w-64">
            <div className="font-medium text-slate-900">{p.Nombre}</div>
            <div className="text-xs text-slate-400">
              {p.NombreMarca ?? t("stockList.sinMarca")}
            </div>
          </div>
        ),
      },
      {
        header: t("stockList.cols.familias"),
        render: (p) => {
          const subs = p.subfamilias ?? [];
          if (!subs.length) return <span className="text-slate-400">-</span>;

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
        header: t("stockList.cols.stock"),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="min-w-20 text-sm font-medium text-slate-900">
            {p.Stock ?? 0}
          </div>
        ),
      },
      {
        header: t("stockList.cols.stockMin"),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="min-w-20 text-sm text-slate-500">
            {p.StockMinimo ?? 0}
          </div>
        ),
      },
      {
        header: t("stockList.cols.estado"),
        headerAlign: "center",
        cellAlign: "center",
        render: (p) => {
          const estado = getEstadoStock(p.Stock ?? 0, p.StockMinimo ?? 0);
          const badgeClasses = {
            ok: "bg-emerald-100 text-emerald-700",
            bajo: "bg-amber-100 text-amber-700",
            agotado: "bg-red-100 text-red-700",
          };
          const badgeLabels = {
            ok: t("stockList.estado.ok"),
            bajo: t("stockList.estado.bajo"),
            agotado: t("stockList.estado.agotado"),
          };
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeClasses[estado]}`}>
              {badgeLabels[estado]}
            </span>
          );
        },
      },
      {
        header: t("stockList.cols.acciones"),
        headerAlign: "right",
        cellAlign: "right",
        render: (p) => (
          <div className="flex justify-end gap-1 min-w-20" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openHistorialModal(p.id, p.Nombre)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
              title={t("stockList.verHistorial")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        ),
      },
    ];
  }, [openHistorialModal, t]);

  // Estadisticas
  const stats = useMemo(() => {
    const agotados = rows.filter((p) => (p.Stock ?? 0) <= 0).length;
    const bajos = rows.filter((p) => {
      const stock = p.Stock ?? 0;
      const min = p.StockMinimo ?? 0;
      return stock > 0 && stock <= min;
    }).length;
    const ok = rows.filter((p) => (p.Stock ?? 0) > (p.StockMinimo ?? 0)).length;
    return { agotados, bajos, ok };
  }, [rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("stockList.titulo")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("stockList.cargando") : t("stockList.contador", { count: total })}
          </p>
        </div>

        {/* Estadisticas */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-emerald-700 font-medium">{stats.ok} {t("stockList.estado.ok")}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm text-amber-700 font-medium">{stats.bajos} {t("stockList.estado.bajo")}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-red-700 font-medium">{stats.agotados} {t("stockList.estado.agotado")}</span>
          </div>
        </div>
      </div>

      <FilterBar fields={filterFields} mdCols={10} preserveParams={["modal", "idProducto", "nombreProducto"]} />

      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      ) : null}

      <DataTable<ProductoStockItem>
        columns={columns}
        data={rows}
        getRowKey={(p) => p.id}
        emptyText={
          loading
            ? t("stockList.cargando")
            : anyFilter
            ? t("stockList.emptyConFiltros")
            : t("stockList.empty")
        }
        onRowClick={(p) => openHistorialModal(p.id, p.Nombre)}
        showExpandColumn={false}
      />
    </div>
  );
}
