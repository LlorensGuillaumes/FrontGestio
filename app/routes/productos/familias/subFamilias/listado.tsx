import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import { api } from "~/lib/api";

type Familia = {
  id: string;
  descripcion: string;
  activo?: boolean;
};

type Subfamilia = {
  id: string;
  descripcion: string;
  idFamilia: string;
  activo?: boolean;
};

const sid = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function SubFamiliasListado() {
  const { t } = useTranslation(["productos", "common"]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros por URL
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const familiaId = (searchParams.get("familiaId") ?? "").trim();

  // maps
  const familiasById = useMemo(() => {
    const m = new Map<string, Familia>();
    familias.forEach((f) => m.set(String(f.id), f));
    return m;
  }, [familias]);

  const getNombreFamilia = (idFamilia: string) => familiasById.get(idFamilia)?.descripcion ?? "—";

  // carga inicial
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Rutas correctas del backend
        const [famRes, subRes] = await Promise.all([
          api.get<any[]>("/familias-productos"),
          api.get<any[]>("/subfamilias-productos"),
        ]);

        if (!mounted) return;

        setFamilias(
          (famRes.data ?? []).map((x: any) => ({
            id: sid(x.id),
            descripcion: x.descripcion ?? "",
            activo: x.activo ?? true,
          }))
        );

        setSubfamilias(
          (subRes.data ?? []).map((x: any) => ({
            id: sid(x.id),
            descripcion: x.descripcion ?? "",
            idFamilia: sid(x.idFamilia ?? x.familiaId ?? x.id_familia),
            activo: x.activo ?? true,
          }))
        );
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? t("subfamiliasList.errorCargando"));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // FilterBar fields
  const filterFields = useMemo<FilterField[]>(() => {
    const familiaOptions = familias.map((f) => ({
      value: String(f.id),
      label: `${f.id} · ${f.descripcion}`,
    }));

    return [
      {
        name: "q",
        label: t("subfamiliasList.buscarLabel"),
        type: "text",
        colSpan: 3,
        placeholder: t("subfamiliasList.buscarPlaceholder"),
      },
      {
        name: "familiaId",
        label: t("common:breadcrumb.familia"),
        type: "select",
        colSpan: 2,
        options: familiaOptions,
        allowEmpty: true,
        emptyLabel: t("subfamiliasList.todas"),
      },
    ];
  }, [familias, t]);

  // filtradas
  const filtradas = useMemo(() => {
    return subfamilias.filter((sf) => {
      if (familiaId && String(sf.idFamilia) !== String(familiaId)) return false;

      if (!q) return true;
      const id = (sf.id ?? "").toLowerCase();
      const desc = (sf.descripcion ?? "").toLowerCase();
      const fam = getNombreFamilia(sf.idFamilia).toLowerCase();
      return id.includes(q) || desc.includes(q) || fam.includes(q);
    });
  }, [subfamilias, familiaId, q, familiasById]);

  const columns = useMemo<ColumnDef<Subfamilia>[]>(() => {
    return [
      {
        header: t("subfamiliasList.colId"),
        cellClassName: "font-mono text-slate-600",
        render: (sf) => sf.id,
      },
      {
        header: t("common:breadcrumb.familia"),
        render: (sf) => (
          <span className="text-slate-700">{getNombreFamilia(sf.idFamilia)}</span>
        ),
      },
      {
        header: t("common:breadcrumb.subfamilia"),
        cellClassName: "font-semibold text-slate-900",
        render: (sf) => sf.descripcion || "—",
      },
      {
        header: t("subfamiliasList.colAcciones"),
        headerAlign: "right",
        cellAlign: "right",
        render: (sf) => (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => navigate(`./${sf.id}`)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              {t("common:breadcrumb.ver")}
            </button>
            <button
              type="button"
              onClick={() => navigate(`./${sf.id}/editar`)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              {t("common:breadcrumb.editar")}
            </button>
          </div>
        ),
      },
    ];
  }, [navigate, familiasById, t]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("subfamiliasList.titulo")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("subfamiliasList.cargando") : t("subfamiliasList.registros", { count: filtradas.length })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("./nueva")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          {t("subfamiliasList.nuevaSubfamilia")}
        </button>
      </div>

      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      ) : null}

      <FilterBar fields={filterFields} mdCols={8} preserveParams={[]} />

      <DataTable<Subfamilia>
        columns={columns}
        data={filtradas}
        getRowKey={(sf) => sf.id}
        emptyText={loading ? t("subfamiliasList.cargando") : t("subfamiliasList.sinSubfamilias")}
        onRowClick={(sf) => navigate(`./${sf.id}`)}
        showExpandColumn={false}
      />
    </div>
  );
}
