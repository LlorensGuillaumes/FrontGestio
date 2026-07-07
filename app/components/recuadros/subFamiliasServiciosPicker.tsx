// components/recuadros/subFamiliasServiciosPicker.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type FamiliaServicio = {
  id: number;
  descripcion: string;
  subfamilias: SubfamiliaServicio[];
};

type SubfamiliaServicio = {
  id: number;
  descripcion: string;
};

type Props = {
  disabled?: boolean;
  familias: FamiliaServicio[];
  selected: number[];
  onChangeSelected: (ids: number[]) => void;
  mode?: "view" | "edit";
};

export function SubfamiliasServiciosPicker({
  disabled,
  familias,
  selected,
  onChangeSelected,
  mode = "edit",
}: Props) {
  const { t } = useTranslation("common");
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [subSeleccionadaId, setSubSeleccionadaId] = useState<number | null>(null);
  const isView = mode === "view";

  // Selecciona la primera familia por defecto
  useEffect(() => {
    if (familiaId == null && familias.length) {
      setFamiliaId(familias[0].id);
    }
  }, [familias, familiaId]);

  // Si cambias la familia, limpia la subfamilia seleccionada
  useEffect(() => {
    setSubSeleccionadaId(null);
  }, [familiaId]);

  const subsFiltradas = useMemo(() => {
    if (familiaId == null) return [];
    const fam = familias.find((f) => f.id === familiaId);
    return (fam?.subfamilias ?? []).map((s) => ({
      id: s.id,
      nombre: s.descripcion,
    }));
  }, [familias, familiaId]);

  const selectedSet = useMemo(() => new Set<number>(selected), [selected]);

  // Build map of all subfamilias for lookup
  const allSubfamiliasMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const fam of familias) {
      for (const sf of fam.subfamilias) {
        map.set(sf.id, sf.descripcion);
      }
    }
    return map;
  }, [familias]);

  const selectedItems = useMemo(() => {
    return selected.map((id) => ({
      id,
      nombre: allSubfamiliasMap.get(id) ?? String(id),
    }));
  }, [selected, allSubfamiliasMap]);

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
          <div className="font-medium text-slate-900 mb-2">{t("picker.assignedSubfamilies")}</div>

          {selectedItems.length ? (
            <div className="space-y-2">
              {selectedItems.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm text-slate-800">{s.nombre}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">{t("picker.noSubfamiliesAssigned")}</div>
          )}
        </div>
      ) : (
        <>
          {/* 1) Familias */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-medium text-slate-900 mb-2">{t("picker.families")}</div>

            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={familiaId ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setFamiliaId(v === "" ? null : Number(v));
              }}
            >
              <option value="">{t("picker.selectFamily")}</option>
              {familias.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.descripcion}
                </option>
              ))}
            </select>

            <div className="text-xs text-slate-400 mt-2">
              {t("picker.chooseFamilyHint")}
            </div>
          </div>

          {/* 2) Subfamilias + Add */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-medium text-slate-900 mb-2">{t("picker.subfamilies")}</div>

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
                <option value="">{t("picker.selectSubfamily")}</option>
                {subsFiltradas.map((s) => (
                  <option key={s.id} value={s.id} disabled={selectedSet.has(s.id)}>
                    {s.nombre}
                    {selectedSet.has(s.id) ? t("picker.alreadyAddedSuffix") : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={disabled || subSeleccionadaId == null || selectedSet.has(subSeleccionadaId)}
                onClick={addSelected}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {t("picker.add")}
              </button>
            </div>

            <div className="text-xs text-slate-400 mt-2">
              {t("picker.assignHintService")}
            </div>
          </div>

          {/* 3) Seleccionadas */}
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-medium text-slate-900 mb-2">{t("picker.assignedSubfamilies")}</div>

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
                      {t("picker.remove")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">{t("picker.noSubfamiliesAssigned")}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
