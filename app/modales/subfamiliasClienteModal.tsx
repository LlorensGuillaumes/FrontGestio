// app/modales/gestionarFamiliasModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost } from "~/lib/apiClient";
import { ListEditorModal } from "~/modales/listEditorModal";
import type { Familia, Subfamilia } from "~/types/clientes/maestros";

type Props = {
  open: boolean;
  mode?: "view" | "edit";
  onClose: () => void;
  onChanged?: () => void;
};

// =====================
// AJUSTA ESTAS 3 COSAS
// =====================
const TIPO_DESCUENTO = 1;   // <-- id real en acciones_tipo
const TIPO_INCREMENTO = 2;  // <-- id real en acciones_tipo
const SUB_ACC_EP = "/subfamilias-clientes-acciones"; // <-- endpoint CRUD de subfamilias_clientes_acciones

// =====================
// Drafts
// =====================
type FamiliaDraft = { Nombre: string };

type SubfamiliaAccionDraft = {
  id_tipo_accion: number;
  id_campo: number | null;
  orden_dentro_fase: number;
  es_porcentaje: boolean;
  valor_accion: number;
  grupo_exclusion: string | null;
  activo: boolean;
};

type SubfamiliaDraft = {
  Nombre: string;
  prioridad: number;
  activa: boolean;
  acciones: SubfamiliaAccionDraft[]; // 2 filas: descuento + incremento
};

// =====================
// Helpers draft
// =====================
function defaultAccion(id_tipo_accion: number): SubfamiliaAccionDraft {
  return {
    id_tipo_accion,
    id_campo: null,
    orden_dentro_fase: 0,
    es_porcentaje: true,
    valor_accion: 0,
    grupo_exclusion: null,
    activo: true,
  };
}

function createEmptySub(): SubfamiliaDraft {
  return {
    Nombre: "",
    prioridad: 0,
    activa: true,
    acciones: [defaultAccion(TIPO_DESCUENTO), defaultAccion(TIPO_INCREMENTO)],
  };
}

function normalizeFamilias(items: FamiliaDraft[]) {
  return items
    .map((x) => ({ Nombre: String(x.Nombre ?? "").trim() }))
    .filter((x) => x.Nombre.length > 0);
}

function normalizeSubfamilias(items: SubfamiliaDraft[]) {
  return items
    .map((x) => ({
      ...x,
      Nombre: String(x.Nombre ?? "").trim(),
      prioridad: Number.isFinite(Number(x.prioridad)) ? Number(x.prioridad) : 0,
      activa: Boolean(x.activa),
      acciones: Array.isArray(x.acciones)
        ? x.acciones.map((a) => ({
            ...a,
            id_tipo_accion: Number(a.id_tipo_accion),
            id_campo: a.id_campo == null ? null : Number(a.id_campo),
            orden_dentro_fase: Number.isFinite(Number(a.orden_dentro_fase)) ? Number(a.orden_dentro_fase) : 0,
            es_porcentaje: Boolean(a.es_porcentaje),
            valor_accion: Number.isFinite(Number(a.valor_accion)) ? Number(a.valor_accion) : 0,
            grupo_exclusion: (a.grupo_exclusion ?? "").trim() || null,
            activo: Boolean(a.activo),
          }))
        : [defaultAccion(TIPO_DESCUENTO), defaultAccion(TIPO_INCREMENTO)],
    }))
    .filter((x) => x.Nombre.length > 0);
}

function getAccion(item: SubfamiliaDraft, id_tipo_accion: number) {
  return item.acciones.find((a) => a.id_tipo_accion === id_tipo_accion) ?? defaultAccion(id_tipo_accion);
}

function patchAccion(
  item: SubfamiliaDraft,
  update: (patch: Partial<SubfamiliaDraft>) => void,
  id_tipo_accion: number,
  patch: Partial<SubfamiliaAccionDraft>
) {
  const exists = item.acciones.some((a) => a.id_tipo_accion === id_tipo_accion);
  const next = exists
    ? item.acciones.map((a) => (a.id_tipo_accion === id_tipo_accion ? { ...a, ...patch } : a))
    : [...item.acciones, { ...defaultAccion(id_tipo_accion), ...patch }];

  update({ acciones: next });
}

export function GestionarFamiliasModal({ open, mode = "edit", onClose, onChanged }: Props) {
  const { t } = useTranslation(["clientes", "common"]);
  const isView = mode === "view";
  const disabled = isView;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [subfamiliaId, setSubfamiliaId] = useState<number | null>(null);

  const [qFam, setQFam] = useState("");
  const [qSub, setQSub] = useState("");

  const [openAddFam, setOpenAddFam] = useState(false);
  const [openAddSub, setOpenAddSub] = useState(false);

  // Acciones de la subfamilia seleccionada
  const [acciones, setAcciones] = useState<any[]>([]);
  const [tiposAccion, setTiposAccion] = useState<any[]>([]);
  const [loadingAcciones, setLoadingAcciones] = useState(false);

  const loadCatalogo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fam, sub, tipos] = await Promise.all([
        apiGet<{ rows: Familia[] }>("/familias-clientes?take=5000&offset=0"),
        apiGet<{ rows: Subfamilia[] }>("/subfamilias-clientes?take=5000&offset=0"),
        apiGet<{ rows: any[] }>("/acciones-tipo?take=5000&offset=0"),
      ]);

      const famRows = fam.rows ?? [];
      const subRows = sub.rows ?? [];
      const tiposRows = tipos.rows ?? [];

      setFamilias(famRows);
      setSubfamilias(subRows);
      setTiposAccion(tiposRows);

      if (familiaId == null && famRows.length) {
        setFamiliaId(Number(famRows[0].id));
      }
    } catch (e: any) {
      setError(e?.message ?? t("catalog.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const loadAccionesSubfamilia = async (idSub: number) => {
    setLoadingAcciones(true);
    try {
      const res = await apiGet<{ rows: any[] }>(`/subfamilias-clientes-acciones?take=100&offset=0&id_subfamilia=${idSub}`);
      setAcciones(res.rows ?? []);
    } catch (e: any) {
      console.error("Error cargando acciones:", e);
      setAcciones([]);
    } finally {
      setLoadingAcciones(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadCatalogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (subfamiliaId != null) {
      void loadAccionesSubfamilia(subfamiliaId);
    } else {
      setAcciones([]);
    }
  }, [subfamiliaId]);

  // Reset subfamilia cuando cambia la familia
  useEffect(() => {
    setSubfamiliaId(null);
    setAcciones([]);
  }, [familiaId]);

  const familiasFiltradas = useMemo(() => {
    const q = qFam.trim().toLowerCase();
    if (!q) return familias;
    return familias.filter((f) => String(f.descripcion ?? "").toLowerCase().includes(q));
  }, [familias, qFam]);

  const subfamiliasFiltradas = useMemo(() => {
    if (familiaId == null) return [];
    const q = qSub.trim().toLowerCase();

    return subfamilias
      .filter((s: any) => Number((s as any).id_familia ?? -1) === familiaId)
      .filter((s: any) => (q ? String((s as any).descripcion ?? "").toLowerCase().includes(q) : true))
      .map((s: any) => ({
        id: Number(s.id),
        nombre: s.descripcion ?? String(s.id),
      }));
  }, [subfamilias, familiaId, qSub]);

  // Mapa de tipos de acción por ID
  const tiposAccionById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tiposAccion) {
      m.set(Number(t.id), t.accion ?? t.descripcion ?? `Tipo ${t.id}`);
    }
    return m;
  }, [tiposAccion]);

  // Nombre de la subfamilia seleccionada
  const subfamiliaSeleccionada = useMemo(() => {
    return subfamiliasFiltradas.find((s) => s.id === subfamiliaId);
  }, [subfamiliasFiltradas, subfamiliaId]);

  const crearFamilias = async (items: FamiliaDraft[]) => {
    const clean = normalizeFamilias(items);
    if (!clean.length) return;

    setLoading(true);
    setError(null);
    try {
      for (const f of clean) {
        await apiPost("/familias-clientes", { descripcion: f.Nombre });
      }
      await loadCatalogo();
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
        // 1) Crear subfamilia
        const created = await apiPost<any>("/subfamilias-clientes", {
          id_familia: familiaId,
          descripcion: s.Nombre,
          activa: s.activa,
          prioridad: s.prioridad,
        });

        // intenta sacar el id devuelto por tu crud
        const idSub = Number(created?.id ?? created?.Id ?? created?.id_subfamilia ?? created?.idSubfamilia ?? 0);
        if (!idSub) throw new Error("No se recibió el id de la subfamilia creada.");

        // 2) Crear sus acciones asociadas
        for (const a of s.acciones) {
          await apiPost(SUB_ACC_EP, {
            id_subfamilia: idSub,
            id_tipo_accion: a.id_tipo_accion,
            id_campo: a.id_campo,
            orden_dentro_fase: a.orden_dentro_fase,
            es_porcentaje: a.es_porcentaje,
            valor_accion: a.valor_accion,
            grupo_exclusion: a.grupo_exclusion,
            activo: a.activo,
          });
        }
      }

      await loadCatalogo();
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
          className="w-[96vw] max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">{t("catalog.title")}</div>
              <div className="text-sm text-slate-500">
                {isView ? t("common:modes.reading") : t("catalog.subtitle")}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1) Familias */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-medium text-slate-900">{t("catalog.families")}</div>
                  {!isView ? (
                    <button
                      type="button"
                      onClick={() => setOpenAddFam(true)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50"
                      disabled={disabled}
                    >
                      {t("catalog.addFamily")}
                    </button>
                  ) : null}
                </div>

                <input
                  value={qFam}
                  onChange={(e) => setQFam(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-3"
                  placeholder={t("catalog.searchFamily")}
                  disabled={disabled}
                />

                <div className="space-y-1 max-h-80 overflow-auto pr-1">
                  {familiasFiltradas.map((f) => {
                    const id = Number(f.id);
                    const active = id === familiaId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFamiliaId(id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                          active ? "border-slate-300 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {f.descripcion ?? `Familia ${id}`}
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
                  {!isView ? (
                    <button
                      type="button"
                      onClick={() => setOpenAddSub(true)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50"
                      disabled={disabled || familiaId == null}
                      title={familiaId == null ? t("catalog.selectFamily") : ""}
                    >
                      {t("catalog.addSubfamily")}
                    </button>
                  ) : null}
                </div>

                <input
                  value={qSub}
                  onChange={(e) => setQSub(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-3"
                  placeholder={t("catalog.searchSubfamily")}
                  disabled={disabled || familiaId == null}
                />

                <div className="space-y-1 max-h-80 overflow-auto pr-1">
                  {subfamiliasFiltradas.map((s) => {
                    const active = s.id === subfamiliaId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubfamiliaId(s.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                          active ? "border-slate-300 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {s.nombre}
                      </button>
                    );
                  })}

                  {!subfamiliasFiltradas.length ? (
                    <div className="text-sm text-slate-400">
                      {familiaId == null ? t("catalog.selectFamily") : t("catalog.noSubfamiliesInFamily")}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 3) Acciones de la subfamilia seleccionada */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="font-medium text-slate-900 mb-2">
                  {subfamiliaSeleccionada
                    ? t("catalog.actionsFor", { name: subfamiliaSeleccionada.nombre })
                    : t("catalog.actions")}
                </div>

                {subfamiliaId == null ? (
                  <div className="text-sm text-slate-400">
                    {t("catalog.selectSubfamily")}
                  </div>
                ) : loadingAcciones ? (
                  <div className="text-sm text-slate-500">{t("catalog.loadingActions")}</div>
                ) : acciones.length === 0 ? (
                  <div className="text-sm text-slate-400">
                    {t("catalog.noActions")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {acciones.map((a: any) => {
                      const tipoNombre = tiposAccionById.get(Number(a.id_tipo_accion)) ?? `Tipo ${a.id_tipo_accion}`;
                      const valor = Number(a.valor_accion ?? 0);
                      const esPorcentaje = Boolean(a.es_porcentaje);
                      const activo = Boolean(a.activo);

                      return (
                        <div
                          key={a.id}
                          className={`rounded-lg border p-2 ${activo ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-800 text-sm">{tipoNombre}</div>
                            <div className={`text-xs px-2 py-0.5 rounded ${activo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                              {activo ? t("catalog.activeStatus") : t("catalog.inactiveStatus")}
                            </div>
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {t("catalog.value")}: <span className="font-mono font-medium">{valor}{esPorcentaje ? "%" : "€"}</span>
                            {a.orden_dentro_fase != null && (
                              <span className="ml-3 text-xs text-slate-400">{t("catalog.order")}: {a.orden_dentro_fase}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
        maxWidthClassName="max-w-3xl"
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

      {/* Alta subfamilias + acciones */}
      <ListEditorModal<SubfamiliaDraft>
        open={openAddSub}
        title={t("catalog.addSubfamiliesTitle")}
        subtitle={t("catalog.addSubfamiliesSubtitle")}
        value={[]}
        onChange={(items) => void crearSubfamilias(items)}
        createEmpty={createEmptySub}
        normalize={normalizeSubfamilias}
        disabled={false}
        maxWidthClassName="max-w-6xl"
        onClose={() => setOpenAddSub(false)}
        renderRow={(item, _idx, update, isDis) => {
          const desc = getAccion(item, TIPO_DESCUENTO);
          const inc = getAccion(item, TIPO_INCREMENTO);

          return (
            <div className="space-y-4">
              {/* Datos subfamilia */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7">
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.name")}</label>
                  <input
                    value={item.Nombre ?? ""}
                    onChange={(e) => update({ Nombre: e.target.value })}
                    disabled={isDis}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("catalog.subfamilyPlaceholder")}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.priority")}</label>
                  <input
                    type="number"
                    value={Number(item.prioridad ?? 0)}
                    onChange={(e) => update({ prioridad: Number(e.target.value) })}
                    disabled={isDis}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(item.activa)}
                      onChange={(e) => update({ activa: e.target.checked })}
                      disabled={isDis}
                      className="rounded border-slate-300"
                    />
                    {t("catalog.active")}
                  </label>
                </div>
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* DESCUENTO */}
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-slate-900">{t("catalog.discount")}</div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(desc.activo)}
                        onChange={(e) => patchAccion(item, update, TIPO_DESCUENTO, { activo: e.target.checked })}
                        disabled={isDis}
                        className="rounded border-slate-300"
                      />
                      {t("catalog.active")}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.type")}</label>
                      <select
                        value={desc.es_porcentaje ? "P" : "V"}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_DESCUENTO, { es_porcentaje: e.target.value === "P" })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="P">{t("catalog.typePercent")}</option>
                        <option value="V">{t("catalog.typeValue")}</option>
                      </select>
                      <div className="text-[11px] text-slate-500 mt-1">{t("catalog.actionTypeId", { id: TIPO_DESCUENTO })}</div>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.value")}</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={Number(desc.valor_accion ?? 0)}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_DESCUENTO, { valor_accion: Number(e.target.value) })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.order")}</label>
                      <input
                        type="number"
                        value={Number(desc.orden_dentro_fase ?? 0)}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_DESCUENTO, { orden_dentro_fase: Number(e.target.value) })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.fieldIdOptional")}</label>
                      <input
                        type="number"
                        value={desc.id_campo ?? ""}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_DESCUENTO, {
                            id_campo: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="null"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.exclusionGroup")}</label>
                      <input
                        value={desc.grupo_exclusion ?? ""}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_DESCUENTO, { grupo_exclusion: e.target.value || null })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder={t("common:fields.optional")}
                      />
                    </div>
                  </div>
                </div>

                {/* INCREMENTO */}
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-slate-900">{t("catalog.increment")}</div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(inc.activo)}
                        onChange={(e) => patchAccion(item, update, TIPO_INCREMENTO, { activo: e.target.checked })}
                        disabled={isDis}
                        className="rounded border-slate-300"
                      />
                      {t("catalog.active")}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.type")}</label>
                      <select
                        value={inc.es_porcentaje ? "P" : "V"}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_INCREMENTO, { es_porcentaje: e.target.value === "P" })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="P">{t("catalog.typePercent")}</option>
                        <option value="V">{t("catalog.typeValue")}</option>
                      </select>
                      <div className="text-[11px] text-slate-500 mt-1">{t("catalog.actionTypeId", { id: TIPO_INCREMENTO })}</div>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.value")}</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={Number(inc.valor_accion ?? 0)}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_INCREMENTO, { valor_accion: Number(e.target.value) })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.order")}</label>
                      <input
                        type="number"
                        value={Number(inc.orden_dentro_fase ?? 0)}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_INCREMENTO, { orden_dentro_fase: Number(e.target.value) })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.fieldIdOptional")}</label>
                      <input
                        type="number"
                        value={inc.id_campo ?? ""}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_INCREMENTO, {
                            id_campo: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="null"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-slate-600 mb-1">{t("catalog.exclusionGroup")}</label>
                      <input
                        value={inc.grupo_exclusion ?? ""}
                        onChange={(e) =>
                          patchAccion(item, update, TIPO_INCREMENTO, { grupo_exclusion: e.target.value || null })
                        }
                        disabled={isDis}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder={t("common:fields.optional")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
