// components/recuadros/subFamiliasProveedoresPicker.tsx
import React, { useEffect, useMemo, useState } from "react";

type FamiliaProveedor = {
  IdFamiliaProveedor: number;
  Descripcion: string;
};

type SubfamiliaProveedor = {
  IdSubFamiliaProveedor: number;
  IdFamiliaProveedor: number;
  Descripcion: string;
};

type Props = {
  disabled?: boolean;
  familias: FamiliaProveedor[];
  subfamilias: SubfamiliaProveedor[];
  selected: number[];
  onChangeSelected: (ids: number[]) => void;
  mode?: "view" | "edit";
};

export function SubfamiliasProveedoresPicker({
  disabled,
  familias,
  subfamilias,
  selected,
  onChangeSelected,
  mode = "edit",
}: Props) {
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [subSeleccionadaId, setSubSeleccionadaId] = useState<number | null>(null);
  const isView = mode === "view";

  // Selecciona la primera familia por defecto
  useEffect(() => {
    if (familiaId == null && familias.length) {
      setFamiliaId(familias[0].IdFamiliaProveedor);
    }
  }, [familias, familiaId]);

  // Si cambias la familia, limpia la subfamilia seleccionada
  useEffect(() => {
    setSubSeleccionadaId(null);
  }, [familiaId]);

  const subsFiltradas = useMemo(() => {
    if (familiaId == null) return [];
    return subfamilias
      .filter((s) => s.IdFamiliaProveedor === familiaId)
      .map((s) => ({
        id: s.IdSubFamiliaProveedor,
        nombre: s.Descripcion,
      }));
  }, [subfamilias, familiaId]);

  const selectedSet = useMemo(() => new Set<number>(selected), [selected]);

  const selectedItems = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of subfamilias) {
      map.set(s.IdSubFamiliaProveedor, s.Descripcion);
    }
    return selected.map((id) => ({
      id,
      nombre: map.get(id) ?? String(id),
    }));
  }, [selected, subfamilias]);

  const addSelected = () => {
    if (subSeleccionadaId == null) return;
    if (selectedSet.has(subSeleccionadaId)) return;
    onChangeSelected([...selected, subSeleccionadaId]);
    setSubSeleccionadaId(null);
  };

  const removeSelected = (id: number) => {
    onChangeSelected(selected.filter((x) => x !== id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {isView ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-3">
          <div className="font-medium text-slate-900 mb-2">Subfamilias asignadas</div>

          {selectedItems.length ? (
            <div className="space-y-2">
              {selectedItems.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm text-slate-800">{s.nombre}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">No hay subfamilias asignadas.</div>
          )}
        </div>
      ) : (
        <>
          {/* 1) Familias */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-medium text-slate-900 mb-2">Familias</div>

            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={familiaId ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setFamiliaId(v === "" ? null : Number(v));
              }}
            >
              <option value="">— Selecciona familia —</option>
              {familias.map((f) => (
                <option key={f.IdFamiliaProveedor} value={f.IdFamiliaProveedor}>
                  {f.Descripcion}
                </option>
              ))}
            </select>

            <div className="text-xs text-slate-400 mt-2">
              Elige una familia para ver sus subfamilias.
            </div>
          </div>

          {/* 2) Subfamilias + Add */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-medium text-slate-900 mb-2">Subfamilias</div>

            <div className="flex gap-2">
              <select
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={subSeleccionadaId ?? ""}
                disabled={disabled || familiaId == null}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setSubSeleccionadaId(v === "" ? null : Number(v));
                }}
              >
                <option value="">— Selecciona subfamilia —</option>
                {subsFiltradas.map((s) => (
                  <option key={s.id} value={s.id} disabled={selectedSet.has(s.id)}>
                    {s.nombre}
                    {selectedSet.has(s.id) ? " (ya añadida)" : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={disabled || subSeleccionadaId == null || selectedSet.has(subSeleccionadaId)}
                onClick={addSelected}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                + Add
              </button>
            </div>

            <div className="text-xs text-slate-400 mt-2">
              Selecciona y pulsa Add para asignar al proveedor.
            </div>
          </div>

          {/* 3) Seleccionadas */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-medium text-slate-900 mb-2">Subfamilias asignadas</div>

            {selectedItems.length ? (
              <div className="space-y-2">
                {selectedItems.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="text-sm text-slate-800">{s.nombre}</div>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeSelected(s.id)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No hay subfamilias asignadas.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
