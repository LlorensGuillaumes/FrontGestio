import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { api } from "~/lib/api";

type Familia = {
  id: string;
  descripcion: string;
  activo?: boolean;
};

const sid = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function DetalleFamilia() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familia, setFamilia] = useState<Familia | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Ruta correcta del backend: /familias-productos/:id
        const res = await api.get<any>(`/familias-productos/${id}`);
        if (!mounted) return;

        const x = res.data;

        setFamilia({
          id: sid(x.id),
          descripcion: x.descripcion ?? "",
          activo: x.activo ?? true,
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Error cargando familia");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const estado = useMemo(() => {
    if (!familia) return "—";
    return familia.activo === false ? "Inactiva" : "Activa";
  }, [familia]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-sm text-slate-500">Cargando familia…</div>
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
          onClick={() => navigate("/productos/familias")}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!familia) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-3">
        <div className="text-sm text-slate-500">No existe la familia.</div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
          onClick={() => navigate("/productos/familias")}
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
          <div className="text-xs text-slate-500">Familia #{familia.id}</div>
          <h1 className="text-2xl font-bold text-slate-900">{familia.descripcion || "—"}</h1>
          <div className="text-sm text-slate-500 mt-1">
            Estado:{" "}
            {familia.activo === false ? (
              <span className="text-slate-700">Inactiva</span>
            ) : (
              <span className="text-emerald-700">Activa</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/productos/familias/${familia.id}/editar`)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => navigate("/productos/familias")}
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
            <div className="mt-1 font-mono text-slate-800">{familia.id}</div>
          </div>

          <div className="col-span-12 md:col-span-7">
            <div className="text-xs font-bold text-slate-500">Descripción</div>
            <div className="mt-1 text-slate-800">{familia.descripcion || "—"}</div>
          </div>

          <div className="col-span-12 md:col-span-2">
            <div className="text-xs font-bold text-slate-500">Estado</div>
            <div className="mt-1 text-slate-800">{estado}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
