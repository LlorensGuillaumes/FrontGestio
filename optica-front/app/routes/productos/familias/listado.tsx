import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import { api } from "~/lib/api";

type Familia = {
  id: string;
  descripcion: string;
  activo?: boolean;
};

const sid = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function FamiliasListado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Ruta correcta del backend: /familias-productos
        const res = await api.get<any[]>("/familias-productos");
        if (!mounted) return;

        const data = (res.data ?? []).map((x: any) => ({
          id: sid(x.id),
          descripcion: x.descripcion ?? "",
          activo: x.activo ?? true,
        })) as Familia[];

        setRows(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Error cargando familias");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "q",
        label: "BUSCAR",
        type: "text",
        colSpan: 3,
        placeholder: "ID o descripción...",
      },
    ],
    []
  );

  const filtradas = useMemo(() => {
    if (!q) return rows;
    return rows.filter((f) => {
      const id = (f.id ?? "").toLowerCase();
      const desc = (f.descripcion ?? "").toLowerCase();
      return id.includes(q) || desc.includes(q);
    });
  }, [rows, q]);

  const columns = useMemo<ColumnDef<Familia>[]>(() => {
    return [
      {
        header: "ID",
        cellClassName: "font-mono text-slate-600",
        render: (f) => f.id,
      },
      {
        header: "Descripción",
        cellClassName: "font-semibold text-slate-900",
        render: (f) => f.descripcion || "—",
      },
      {
        header: "Estado",
        render: (f) =>
          f.activo === false ? (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              Inactiva
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              Activa
            </span>
          ),
      },
      {
        header: "Acciones",
        headerAlign: "right",
        cellAlign: "right",
        render: (f) => (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => navigate(`./${f.id}`)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Ver detalle"
            >
              Ver
            </button>

            <button
              type="button"
              onClick={() => navigate(`./${f.id}/editar`)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Editar"
            >
              Editar
            </button>
          </div>
        ),
      },
    ];
  }, [navigate]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Familias</h1>
          <p className="text-slate-500 text-sm">
            {loading ? "Cargando..." : `${filtradas.length} registros`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("./nueva")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          + Nueva familia
        </button>
      </div>

      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      ) : null}

      <FilterBar fields={filterFields} mdCols={8} preserveParams={[]} />

      <DataTable<Familia>
        columns={columns}
        data={filtradas}
        getRowKey={(f) => f.id}
        emptyText={loading ? "Cargando..." : "No hay familias."}
        onRowClick={(f) => navigate(`./${f.id}`)}
        showExpandColumn={false}
      />
    </div>
  );
}
