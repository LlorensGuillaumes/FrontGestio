// app/modales/familiasProductoModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFamiliasProductos,
  fetchSubfamiliasProductos,
  fetchMarcas,
  createFamiliaProducto,
  updateFamiliaProducto,
  deleteFamiliaProducto,
  createSubfamiliaProducto,
  updateSubfamiliaProducto,
  deleteSubfamiliaProducto,
  createMarca,
  updateMarca,
  deleteMarca,
} from "~/lib/productosFullRest";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

type Familia = { IdFamiliaProducto: number; Descripcion: string; Activa?: number };
type Subfamilia = { IdSubFamiliaProducto: number; IdFamiliaProducto: number; Descripcion: string; Activa?: number };
type Marca = { IdMarca: number; Descripcion: string; Activa?: number };

type Tab = "familias" | "marcas";

export function GestionarFamiliasProductoModal({ open, onClose, onChanged }: Props) {
  const { t } = useTranslation(["productos", "common"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("familias");

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [familiaId, setFamiliaId] = useState<number | null>(null);

  const [qFam, setQFam] = useState("");
  const [qSub, setQSub] = useState("");
  const [qMarca, setQMarca] = useState("");

  // Estados para anadir/editar
  const [editingFamilia, setEditingFamilia] = useState<Familia | null>(null);
  const [editingSubfamilia, setEditingSubfamilia] = useState<Subfamilia | null>(null);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [newFamiliaNombre, setNewFamiliaNombre] = useState("");
  const [newSubfamiliaNombre, setNewSubfamiliaNombre] = useState("");
  const [newMarcaNombre, setNewMarcaNombre] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [famRes, subRes, marRes] = await Promise.all([
        fetchFamiliasProductos(),
        fetchSubfamiliasProductos(),
        fetchMarcas(),
      ]);
      const fam = famRes ?? [];
      const sub = subRes ?? [];
      const mar = marRes ?? [];
      setFamilias(fam);
      setSubfamilias(sub);
      setMarcas(mar);
      if (familiaId == null && fam?.length) {
        setFamiliaId(fam[0].IdFamiliaProducto);
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
    let subs = subfamilias.filter((s) => s.IdFamiliaProducto === familiaId);
    const q = qSub.trim().toLowerCase();
    if (q) subs = subs.filter((s) => s.Descripcion?.toLowerCase().includes(q));
    return subs;
  }, [subfamilias, familiaId, qSub]);

  const marcasFiltradas = useMemo(() => {
    const q = qMarca.trim().toLowerCase();
    if (!q) return marcas;
    return marcas.filter((m) => m.Descripcion?.toLowerCase().includes(q));
  }, [marcas, qMarca]);

  // CRUD Familias
  const handleAddFamilia = async () => {
    if (!newFamiliaNombre.trim()) return;
    try {
      await createFamiliaProducto({ Descripcion: newFamiliaNombre.trim(), Activa: 1 });
      setNewFamiliaNombre("");
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorCreatingFamily"));
    }
  };

  const handleUpdateFamilia = async () => {
    if (!editingFamilia || !newFamiliaNombre.trim()) return;
    try {
      await updateFamiliaProducto(editingFamilia.IdFamiliaProducto, { Descripcion: newFamiliaNombre.trim() });
      setEditingFamilia(null);
      setNewFamiliaNombre("");
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorUpdatingFamily"));
    }
  };

  const handleDeleteFamilia = async (id: number) => {
    if (!confirm(t("catalog.confirmDeleteFamily"))) return;
    try {
      await deleteFamiliaProducto(id);
      if (familiaId === id) setFamiliaId(null);
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorDeletingFamily"));
    }
  };

  // CRUD Subfamilias
  const handleAddSubfamilia = async () => {
    if (!newSubfamiliaNombre.trim() || familiaId == null) return;
    try {
      await createSubfamiliaProducto({
        IdFamiliaProducto: familiaId,
        Descripcion: newSubfamiliaNombre.trim(),
        Activa: 1
      });
      setNewSubfamiliaNombre("");
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorCreatingSubfamily"));
    }
  };

  const handleUpdateSubfamilia = async () => {
    if (!editingSubfamilia || !newSubfamiliaNombre.trim()) return;
    try {
      await updateSubfamiliaProducto(editingSubfamilia.IdSubFamiliaProducto, { Descripcion: newSubfamiliaNombre.trim() });
      setEditingSubfamilia(null);
      setNewSubfamiliaNombre("");
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorUpdatingSubfamily"));
    }
  };

  const handleDeleteSubfamilia = async (id: number) => {
    if (!confirm(t("catalog.confirmDeleteSubfamily"))) return;
    try {
      await deleteSubfamiliaProducto(id);
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorDeletingSubfamily"));
    }
  };

  // CRUD Marcas
  const handleAddMarca = async () => {
    if (!newMarcaNombre.trim()) return;
    try {
      await createMarca({ Descripcion: newMarcaNombre.trim(), Activa: 1 });
      setNewMarcaNombre("");
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorCreatingBrand"));
    }
  };

  const handleUpdateMarca = async () => {
    if (!editingMarca || !newMarcaNombre.trim()) return;
    try {
      await updateMarca(editingMarca.IdMarca, { Descripcion: newMarcaNombre.trim() });
      setEditingMarca(null);
      setNewMarcaNombre("");
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorUpdatingBrand"));
    }
  };

  const handleDeleteMarca = async (id: number) => {
    if (!confirm(t("catalog.confirmDeleteBrand"))) return;
    try {
      await deleteMarca(id);
      await loadData();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorDeletingBrand"));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">{t("catalog.title")}</div>
              <div className="text-xs text-slate-500">{t("catalog.subtitle")}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              {t("common:buttons.close")}
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 py-2 border-b border-slate-200 flex gap-2">
            <button
              onClick={() => setTab("familias")}
              className={`px-4 py-2 text-sm rounded-lg ${
                tab === "familias" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("catalog.familiesAndSubfamilies")}
            </button>
            <button
              onClick={() => setTab("marcas")}
              className={`px-4 py-2 text-sm rounded-lg ${
                tab === "marcas" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("catalog.brands")}
            </button>
          </div>

          <div className="p-6 max-h-[65vh] overflow-auto">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                {error}
                <button className="ml-2 underline" onClick={() => setError(null)}>{t("common:buttons.close")}</button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-slate-500">{t("common:loading")}</div>
            ) : tab === "familias" ? (
              <div className="grid grid-cols-2 gap-6">
                {/* FAMILIAS */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-bold text-slate-700 mb-3">{t("catalog.families")}</div>

                  <input
                    type="text"
                    placeholder={t("catalog.searchFamily")}
                    className="w-full mb-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={qFam}
                    onChange={(e) => setQFam(e.target.value)}
                  />

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder={editingFamilia ? t("catalog.editName") : t("catalog.newFamily")}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={newFamiliaNombre}
                      onChange={(e) => setNewFamiliaNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          editingFamilia ? handleUpdateFamilia() : handleAddFamilia();
                        }
                      }}
                    />
                    {editingFamilia ? (
                      <>
                        <button onClick={handleUpdateFamilia} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{t("common:buttons.save")}</button>
                        <button onClick={() => { setEditingFamilia(null); setNewFamiliaNombre(""); }} className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">{t("common:buttons.cancel")}</button>
                      </>
                    ) : (
                      <button onClick={handleAddFamilia} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{t("common:buttons.add")}</button>
                    )}
                  </div>

                  <div className="space-y-1 max-h-52 overflow-auto">
                    {familiasFiltradas.map((f) => (
                      <div
                        key={f.IdFamiliaProducto}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          familiaId === f.IdFamiliaProducto ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50"
                        }`}
                        onClick={() => setFamiliaId(f.IdFamiliaProducto)}
                      >
                        <span className="text-sm text-slate-700">{f.Descripcion}</span>
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setEditingFamilia(f); setNewFamiliaNombre(f.Descripcion); }} className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100">{t("common:buttons.edit")}</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFamilia(f.IdFamiliaProducto); }} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">X</button>
                        </div>
                      </div>
                    ))}
                    {familiasFiltradas.length === 0 && <div className="text-sm text-slate-500 text-center py-4">{t("catalog.noFamilies")}</div>}
                  </div>
                </div>

                {/* SUBFAMILIAS */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-bold text-slate-700 mb-3">
                    {t("catalog.subfamilies")} {familiaId ? `(${familias.find(f => f.IdFamiliaProducto === familiaId)?.Descripcion})` : ""}
                  </div>

                  {familiaId == null ? (
                    <div className="text-sm text-slate-500 text-center py-8">{t("catalog.selectFamily")}</div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder={t("catalog.searchSubfamily")}
                        className="w-full mb-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={qSub}
                        onChange={(e) => setQSub(e.target.value)}
                      />

                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          placeholder={editingSubfamilia ? t("catalog.editName") : t("catalog.newSubfamily")}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={newSubfamiliaNombre}
                          onChange={(e) => setNewSubfamiliaNombre(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              editingSubfamilia ? handleUpdateSubfamilia() : handleAddSubfamilia();
                            }
                          }}
                        />
                        {editingSubfamilia ? (
                          <>
                            <button onClick={handleUpdateSubfamilia} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{t("common:buttons.save")}</button>
                            <button onClick={() => { setEditingSubfamilia(null); setNewSubfamiliaNombre(""); }} className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">{t("common:buttons.cancel")}</button>
                          </>
                        ) : (
                          <button onClick={handleAddSubfamilia} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{t("common:buttons.add")}</button>
                        )}
                      </div>

                      <div className="space-y-1 max-h-52 overflow-auto">
                        {subfamiliasFiltradas.map((s) => (
                          <div key={s.IdSubFamiliaProducto} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                            <span className="text-sm text-slate-700">{s.Descripcion}</span>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingSubfamilia(s); setNewSubfamiliaNombre(s.Descripcion); }} className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100">{t("common:buttons.edit")}</button>
                              <button onClick={() => handleDeleteSubfamilia(s.IdSubFamiliaProducto)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">X</button>
                            </div>
                          </div>
                        ))}
                        {subfamiliasFiltradas.length === 0 && <div className="text-sm text-slate-500 text-center py-4">{t("catalog.noSubfamilies")}</div>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* MARCAS */
              <div className="max-w-md mx-auto border border-slate-200 rounded-xl p-4">
                <div className="text-sm font-bold text-slate-700 mb-3">{t("catalog.brands")}</div>

                <input
                  type="text"
                  placeholder={t("catalog.searchBrand")}
                  className="w-full mb-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={qMarca}
                  onChange={(e) => setQMarca(e.target.value)}
                />

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder={editingMarca ? t("catalog.editName") : t("catalog.newBrand")}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={newMarcaNombre}
                    onChange={(e) => setNewMarcaNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editingMarca ? handleUpdateMarca() : handleAddMarca();
                      }
                    }}
                  />
                  {editingMarca ? (
                    <>
                      <button onClick={handleUpdateMarca} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{t("common:buttons.save")}</button>
                      <button onClick={() => { setEditingMarca(null); setNewMarcaNombre(""); }} className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">{t("common:buttons.cancel")}</button>
                    </>
                  ) : (
                    <button onClick={handleAddMarca} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{t("common:buttons.add")}</button>
                  )}
                </div>

                <div className="space-y-1 max-h-60 overflow-auto">
                  {marcasFiltradas.map((m) => (
                    <div key={m.IdMarca} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                      <span className="text-sm text-slate-700">{m.Descripcion}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingMarca(m); setNewMarcaNombre(m.Descripcion); }} className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100">{t("common:buttons.edit")}</button>
                        <button onClick={() => handleDeleteMarca(m.IdMarca)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">X</button>
                      </div>
                    </div>
                  ))}
                  {marcasFiltradas.length === 0 && <div className="text-sm text-slate-500 text-center py-4">{t("catalog.noBrands")}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
