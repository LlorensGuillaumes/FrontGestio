// app/modales/familiasProveedorModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFamiliasProveedores,
  fetchSubfamiliasProveedores,
  createFamiliaProveedor,
  createSubfamiliaProveedor,
} from "~/lib/proveedoresRest";
import { ListEditorModal } from "~/modales/listEditorModal";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

type Familia = { IdFamiliaProveedor: number; Descripcion: string; Activa?: number };
type Subfamilia = { IdSubFamiliaProveedor: number; IdFamiliaProveedor: number; Descripcion: string; Activa?: number };

type FamiliaDraft = { Nombre: string };
type SubfamiliaDraft = { Nombre: string };

function normalizeFamilias(items: FamiliaDraft[]) {
  return items
    .map((x) => ({ Nombre: String(x.Nombre ?? "").trim() }))
    .filter((x) => x.Nombre.length > 0);
}

function normalizeSubfamilias(items: SubfamiliaDraft[]) {
  return items
    .map((x) => ({ Nombre: String(x.Nombre ?? "").trim() }))
    .filter((x) => x.Nombre.length > 0);
}

export function GestionarFamiliasProveedorModal({ open, onClose, onChanged }: Props) {
  const { t } = useTranslation(["proveedores", "common"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [familiaId, setFamiliaId] = useState<number | null>(null);

  const [qFam, setQFam] = useState("");
  const [qSub, setQSub] = useState("");

  const [openAddFam, setOpenAddFam] = useState(false);
  const [openAddSub, setOpenAddSub] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [famRes, subRes] = await Promise.all([
        fetchFamiliasProveedores(),
        fetchSubfamiliasProveedores(),
      ]);
      const fam = famRes ?? [];
      const sub = subRes ?? [];
      setFamilias(fam);
      setSubfamilias(sub);
      if (familiaId == null && fam?.length) {
        setFamiliaId(fam[0].IdFamiliaProveedor);
      }
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open]);

  const familiasFiltradas = useMemo(() => {
    const q = qFam.trim().toLowerCase();
    if (!q) return familias;
    return familias.filter((f) => f.Descripcion?.toLowerCase().includes(q));
  }, [familias, qFam]);

  const subfamiliasFiltradas = useMemo(() => {
    if (familiaId == null) return [];
    let subs = subfamilias.filter((s) => s.IdFamiliaProveedor === familiaId);
    const q = qSub.trim().toLowerCase();
    if (q) subs = subs.filter((s) => s.Descripcion?.toLowerCase().includes(q));
    return subs;
  }, [subfamilias, familiaId, qSub]);

  const crearFamilias = async (items: FamiliaDraft[]) => {
    const clean = normalizeFamilias(items);
    if (!clean.length) return;

    setLoading(true);
    setError(null);
    try {
      for (const f of clean) {
        await createFamiliaProveedor({ Descripcion: f.Nombre, Activa: 1 });
      }
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorCreatingFamilies"));
    } finally {
      setLoading(false);
    }
  };

  const crearSubfamilias = async (items: SubfamiliaDraft[]) => {
    const clean = normalizeSubfamilias(items);
    if (!clean.length) return;

    if (familiaId == null) {
      setError(t("catalog.selectFamilyFirst"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      for (const s of clean) {
        await createSubfamiliaProveedor({
          IdFamiliaProveedor: familiaId,
          Descripcion: s.Nombre,
          Activa: 1,
        });
      }
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorCreatingSubfamilies"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-[96vw] max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">{t("catalog.title")}</div>
              <div className="text-sm text-slate-500">
                {t("catalog.subtitle")}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
              disabled={loading}
            >
              {t("common:buttons.close")}
            </button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-auto">
            {error ? (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
            ) : null}

            {loading ? (
              <div className="p-3 rounded-lg bg-slate-50 text-slate-600 text-sm border border-slate-200">{t("common:loading")}</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1) Familias */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-medium text-slate-900">{t("catalog.families")}</div>
                  <button
                    type="button"
                    onClick={() => setOpenAddFam(true)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50"
                  >
                    {t("catalog.addFamily")}
                  </button>
                </div>

                <input
                  value={qFam}
                  onChange={(e) => setQFam(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-3"
                  placeholder={t("catalog.searchFamily")}
                />

                <div className="space-y-1 max-h-80 overflow-auto pr-1">
                  {familiasFiltradas.map((f) => {
                    const active = f.IdFamiliaProveedor === familiaId;
                    return (
                      <button
                        key={f.IdFamiliaProveedor}
                        type="button"
                        onClick={() => setFamiliaId(f.IdFamiliaProveedor)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                          active ? "border-slate-300 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {f.Descripcion}
                      </button>
                    );
                  })}

                  {!familiasFiltradas.length ? <div className="text-sm text-slate-400">{t("catalog.noFamilies")}</div> : null}
                </div>
              </div>

              {/* 2) Subfamilias */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-medium text-slate-900">{t("catalog.subfamilies")}</div>
                  <button
                    type="button"
                    onClick={() => setOpenAddSub(true)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50"
                    disabled={familiaId == null}
                    title={familiaId == null ? t("catalog.selectFamily") : ""}
                  >
                    {t("catalog.addSubfamily")}
                  </button>
                </div>

                <input
                  value={qSub}
                  onChange={(e) => setQSub(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-3"
                  placeholder={t("catalog.searchSubfamily")}
                  disabled={familiaId == null}
                />

                <div className="space-y-1 max-h-80 overflow-auto pr-1">
                  {subfamiliasFiltradas.map((s) => (
                    <div
                      key={s.IdSubFamiliaProveedor}
                      className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                      {s.Descripcion}
                    </div>
                  ))}

                  {!subfamiliasFiltradas.length ? (
                    <div className="text-sm text-slate-400">
                      {familiaId == null ? t("catalog.selectFamily") : t("catalog.noSubfamiliesInFamily")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alta familias */}
      <ListEditorModal<FamiliaDraft>
        open={openAddFam}
        title={t("catalog.addFamiliesTitle")}
        subtitle={t("catalog.addFamiliesSubtitle")}
        value={[]}
        onChange={(items) => void crearFamilias(items)}
        createEmpty={() => ({ Nombre: "" })}
        normalize={normalizeFamilias}
        disabled={false}
        maxWidthClassName="max-w-2xl"
        onClose={() => setOpenAddFam(false)}
        renderRow={(item, _idx, update, isDis) => (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.name")}</label>
            <input
              value={item.Nombre ?? ""}
              onChange={(e) => update({ Nombre: e.target.value })}
              disabled={isDis}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("catalog.familyPlaceholder")}
            />
          </div>
        )}
      />

      {/* Alta subfamilias */}
      <ListEditorModal<SubfamiliaDraft>
        open={openAddSub}
        title={t("catalog.addSubfamiliesTitle")}
        subtitle={t("catalog.addSubfamiliesSubtitle")}
        value={[]}
        onChange={(items) => void crearSubfamilias(items)}
        createEmpty={() => ({ Nombre: "" })}
        normalize={normalizeSubfamilias}
        disabled={false}
        maxWidthClassName="max-w-2xl"
        onClose={() => setOpenAddSub(false)}
        renderRow={(item, _idx, update, isDis) => (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.name")}</label>
            <input
              value={item.Nombre ?? ""}
              onChange={(e) => update({ Nombre: e.target.value })}
              disabled={isDis}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("catalog.subfamilyPlaceholder")}
            />
          </div>
        )}
      />
    </div>
  );
}
