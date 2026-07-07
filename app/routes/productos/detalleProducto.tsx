import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import { api } from "~/lib/api";

type Producto = {
  id: string;
  codigo: string;
  modelo: string;
  precioCoste: number;
  pvp: number;
  idProveedor: string;
  idSubfamilias: string[];
  idMarca: string;
  codigoProveedor: string;
};

type Subfamilia = {
  id: string;
  descripcion: string;
  idFamilia: string;
};

type Proveedor = any;
type Marca = any;
type Familia = any;

const sid = (v: any) => (v === null || v === undefined ? "" : String(v));
const money = (n: number) => `${Number(n ?? 0).toFixed(2)} €`;

export default function DetalleProducto() {
  const { t } = useTranslation("productos");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [producto, setProducto] = useState<Producto | null>(null);

  // Catálogos para resolver nombres
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Rutas correctas del backend
        const [prodRes, provRes, mRes, fRes, sfRes] = await Promise.all([
          api.get<any>(`/productos/${id}`),
          api.get<any[]>("/proveedores"),
          api.get<any[]>("/marcas"),
          api.get<any[]>("/familias-productos"),
          api.get<any[]>("/subfamilias-productos"),
        ]);

        if (!mounted) return;

        const x = prodRes.data;

        const p: Producto = {
          id: sid(x.id),
          codigo: x.codigo ?? "",
          modelo: x.modelo ?? "",
          precioCoste: Number(x.precioCoste ?? x.precio_coste ?? 0),
          pvp: Number(x.pvp ?? 0),
          idProveedor: sid(x.idProveedor ?? x.id_proveedor),
          idMarca: sid(x.idMarca ?? x.id_marca),
          codigoProveedor: x.codigoProveedor ?? x.codigo_proveedor ?? "",
          idSubfamilias: Array.isArray(x.idSubfamilias ?? x.id_subfamilias)
            ? (x.idSubfamilias ?? x.id_subfamilias).map(sid)
            : typeof (x.idSubfamilias ?? x.id_subfamilias) === "string"
            ? String(x.idSubfamilias ?? x.id_subfamilias)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        };

        setProducto(p);

        setProveedores(provRes.data ?? []);
        setMarcas(mRes.data ?? []);
        setFamilias(fRes.data ?? []);
        setSubfamilias(
          (sfRes.data ?? []).map((sf: any) => ({
            id: sid(sf.id),
            descripcion: sf.descripcion ?? "",
            idFamilia: sid(sf.idFamilia ?? sf.id_familia),
          }))
        );
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? t("detalle.loadError"));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const proveedoresById = useMemo(() => {
    const m = new Map<string, any>();
    proveedores.forEach((p: any) => m.set(sid(p.id), p));
    return m;
  }, [proveedores]);

  const marcasById = useMemo(() => {
    const m = new Map<string, any>();
    marcas.forEach((x: any) => m.set(sid(x.id), x));
    return m;
  }, [marcas]);

  const familiasById = useMemo(() => {
    const m = new Map<string, any>();
    familias.forEach((f: any) => m.set(sid(f.id), f));
    return m;
  }, [familias]);

  const subfamiliasById = useMemo(() => {
    const m = new Map<string, Subfamilia>();
    subfamilias.forEach((sf) => m.set(sid(sf.id), sf));
    return m;
  }, [subfamilias]);

  const getNombreProveedor = (idProveedor: string) => {
    const p = proveedoresById.get(sid(idProveedor));
    if (!p) return t("detalle.unknownProvider");
    if (p.razonSocial && String(p.razonSocial).trim() !== "") return p.razonSocial;
    return `${p.nombre ?? ""} ${p.apellido1 ?? ""} ${p.apellido2 ?? ""}`.trim() || t("detalle.unknownProvider");
  };

  const getNombreMarca = (idMarca: string) => marcasById.get(sid(idMarca))?.descripcion ?? t("detalle.unknownBrand");
  const getNombreFamilia = (idFamilia: string) => familiasById.get(sid(idFamilia))?.descripcion ?? "—";

  const subfamiliasRows = useMemo(() => {
    if (!producto) return [];
    return (producto.idSubfamilias ?? [])
      .map((sfid) => subfamiliasById.get(sid(sfid)))
      .filter(Boolean) as Subfamilia[];
  }, [producto, subfamiliasById]);

  const subCols = useMemo<ColumnDef<Subfamilia>[]>(() => {
    return [
      { header: t("detalle.colId"), cellClassName: "font-mono text-slate-400", render: (sf) => sf.id },
      { header: t("detalle.colFamily"), render: (sf) => <span className="text-slate-600">{getNombreFamilia(sf.idFamilia)}</span> },
      { header: t("detalle.colSubfamily"), cellClassName: "font-semibold text-slate-900", render: (sf) => sf.descripcion },
    ];
  }, [familiasById, t]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-sm text-slate-500">{t("detalle.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          onClick={() => navigate("/productos")}
        >
          {t("detalle.back")}
        </button>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        <div className="text-sm text-slate-500">{t("detalle.notFound")}</div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          onClick={() => navigate("/productos")}
        >
          {t("detalle.back")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{t("detalle.productNumber", { id: producto.id })}</div>
          <h1 className="text-2xl font-bold text-slate-900">
            {producto.codigo} · {producto.modelo || "—"}
          </h1>
          <div className="text-sm text-slate-500 mt-1">
            {t("detalle.brandLabel")} <span className="text-slate-800 font-medium">{getNombreMarca(producto.idMarca)}</span> ·{" "}
            {t("detalle.providerLabel")}{" "}
            <button
              type="button"
              className="text-blue-700 hover:underline font-medium"
              onClick={() => navigate(`/proveedores/${producto.idProveedor}`)}
              title={t("detalle.viewProvider")}
            >
              {getNombreProveedor(producto.idProveedor)}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/productos/${producto.id}/editar`)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            {t("detalle.edit")}
          </button>

          <button
            type="button"
            onClick={() => navigate("/productos")}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          >
            {t("detalle.back")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <div className="text-xs font-bold text-slate-500">{t("detalle.code")}</div>
            <div className="mt-1 font-mono text-slate-800">{producto.codigo || "—"}</div>
          </div>

          <div className="col-span-12 md:col-span-8">
            <div className="text-xs font-bold text-slate-500">{t("detalle.model")}</div>
            <div className="mt-1 text-slate-800">{producto.modelo || "—"}</div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs font-bold text-slate-500">{t("detalle.cost")}</div>
            <div className="mt-1 font-mono text-slate-800">{money(producto.precioCoste)}</div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs font-bold text-slate-500">{t("detalle.pvp")}</div>
            <div className="mt-1 font-mono font-semibold text-slate-900">{money(producto.pvp)}</div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="text-xs font-bold text-slate-500">{t("detalle.providerCode")}</div>
            <div className="mt-1 font-mono text-slate-800">{producto.codigoProveedor || "—"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-slate-900">{t("detalle.subfamilies")}</div>
          <div className="text-xs text-slate-500">{t("detalle.records", { count: subfamiliasRows.length })}</div>
        </div>

        <div className="p-4">
          <DataTable<Subfamilia>
            columns={subCols}
            data={subfamiliasRows}
            getRowKey={(sf) => sf.id}
            emptyText={t("detalle.noSubfamilies")}
            showExpandColumn={false}
            wrapperClassName="bg-white rounded border border-slate-200 overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
}
