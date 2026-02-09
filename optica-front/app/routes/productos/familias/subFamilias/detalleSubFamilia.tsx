import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

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

export default function DetalleSubFamilia() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subfamilia, setSubfamilia] = useState<Subfamilia | null>(null);
  const [familias, setFamilias] = useState<Familia[]>([]);

  // cargar datos
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Rutas correctas del backend
        const [sfRes, famRes] = await Promise.all([
          api.get<any>(`/subfamilias-productos/${id}`),
          api.get<any[]>(`/familias-productos`),
        ]);

        if (!mounted) return;

        const sf = sfRes.data;
        setSubfamilia({
          id: sid(sf.id),
          descripcion: sf.descripcion ?? "",
          idFamilia: sid(sf.idFamilia ?? sf.familiaId ?? sf.id_familia),
          activo: sf.activo ?? true,
        });

        setFamilias(
          (famRes.data ?? []).map((x: any) => ({
            id: sid(x.id),
            descripcion: x.descripcion ?? "",
            activo: x.activo ?? true,
          }))
        );
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Error cargando subfamilia");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const familiasById = useMemo(() => {
    const m = new Map<string, Familia>();
    familias.forEach((f) => m.set(String(f.id), f));
    return m;
  }, [familias]);

  const nombreFamilia = useMemo(() => {
    if (!subfamilia) return "—";
    return familiasById.get(String(subfamilia.idFamilia))?.descripcion ?? "—";
  }, [subfamilia, familiasById]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-sm text-slate-500">Cargando subfamilia…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-3">
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          onClick={() => navigate("/productos/familias/subFamilias")}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!subfamilia) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-3">
        <div className="text-sm text-slate-500">No existe la subfamilia.</div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          onClick={() => navigate("/productos/familias/subFamilias")}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">Subfamilia #{subfamilia.id}</div>
          <h1 className="text-2xl font-bold text-slate-900">{subfamilia.descripcion || "—"}</h1>
          <div className="text-sm text-slate-500 mt-1">
            Familia: <span className="text-slate-800">{nombreFamilia}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/productos/familias/subFamilias/${subfamilia.id}/editar`)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => navigate("/productos/familias/subFamilias")}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-3">
            <div className="text-xs font-bold text-slate-500">ID</div>
            <div className="mt-1 font-mono text-slate-800">{subfamilia.id}</div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="text-xs font-bold text-slate-500">Descripción</div>
            <div className="mt-1 text-slate-800">{subfamilia.descripcion || "—"}</div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="text-xs font-bold text-slate-500">Familia</div>
            <div className="mt-1 text-slate-800">{nombreFamilia}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
