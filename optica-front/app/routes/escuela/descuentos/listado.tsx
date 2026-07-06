import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchDescuentos,
  createFamilia,
  updateFamilia,
  deleteFamilia,
  createSub,
  updateSub,
  deleteSub,
  type FamiliaDescuento,
} from "~/lib/descuentosRest";

export default function DescuentosListado() {
  const { t } = useTranslation(["escola", "common"]);
  const [familias, setFamilias] = useState<FamiliaDescuento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal familia
  const [famModal, setFamModal] = useState<{ id?: number; nombre: string; aplicaCuota: boolean; aplicaMatricula: boolean } | null>(null);
  // Modal subfamilia
  const [subModal, setSubModal] = useState<{ id?: number; idFamilia: number; nombre: string; descuentoPorcentaje: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setFamilias(await fetchDescuentos()); }
    catch (e: any) { setError(e?.response?.data?.error ?? t("escola:descuentos.errorCargando")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveFamilia = async () => {
    if (!famModal?.nombre.trim()) return;
    setSaving(true);
    try {
      if (famModal.id) await updateFamilia(famModal.id, famModal);
      else await createFamilia(famModal);
      setFamModal(null); load();
    } catch (e: any) { alert(e?.response?.data?.error ?? t("escola:descuentos.error")); }
    finally { setSaving(false); }
  };
  const saveSub = async () => {
    if (!subModal?.nombre.trim()) return;
    setSaving(true);
    try {
      if (subModal.id) await updateSub(subModal.id, subModal);
      else await createSub(subModal);
      setSubModal(null); load();
    } catch (e: any) { alert(e?.response?.data?.error ?? t("escola:descuentos.error")); }
    finally { setSaving(false); }
  };

  const fld = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("escola:descuentos.titulo")}</h1>
          <p className="text-slate-500 text-sm">{t("escola:descuentos.subtitulo")}</p>
        </div>
        <button onClick={() => setFamModal({ nombre: "", aplicaCuota: true, aplicaMatricula: false })} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t("escola:descuentos.nuevaFamilia")}</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {loading && <p className="text-slate-500 text-sm">{t("escola:descuentos.cargando")}</p>}
      {familias.length === 0 && !loading && <p className="text-slate-500 text-sm">{t("escola:descuentos.sinFamilias")}</p>}

      {familias.map((f) => (
        <div key={f.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{f.nombre}</span>
              {f.aplica_cuota && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t("escola:descuentos.badgeCuota")}</span>}
              {f.aplica_matricula && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{t("escola:descuentos.badgeMatricula")}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSubModal({ idFamilia: f.id, nombre: "", descuentoPorcentaje: 0 })} className="text-sm text-blue-600 hover:underline">{t("escola:descuentos.nuevoDescuento")}</button>
              <button onClick={() => setFamModal({ id: f.id, nombre: f.nombre, aplicaCuota: f.aplica_cuota, aplicaMatricula: f.aplica_matricula })} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-white">{t("escola:descuentos.editar")}</button>
              <button onClick={async () => { if (confirm(t("escola:descuentos.confirmarEliminarFamilia", { nombre: f.nombre }))) { await deleteFamilia(f.id); load(); } }} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">{t("escola:descuentos.eliminar")}</button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {f.subfamilias.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">{t("escola:descuentos.sinDescuentos")}</div>}
            {f.subfamilias.map((s) => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-slate-800">{s.nombre}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{Number(s.descuento_porcentaje).toFixed(0)}%</span>
                  <button onClick={() => setSubModal({ id: s.id, idFamilia: f.id, nombre: s.nombre, descuentoPorcentaje: Number(s.descuento_porcentaje) })} className="text-xs text-slate-500 hover:text-blue-600">{t("escola:descuentos.editarSub")}</button>
                  <button onClick={async () => { if (confirm(t("escola:descuentos.confirmarEliminarSub", { nombre: s.nombre }))) { await deleteSub(s.id); load(); } }} className="text-xs text-red-500 hover:text-red-700">{t("escola:descuentos.quitar")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal familia */}
      {famModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFamModal(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">{famModal.id ? t("escola:descuentos.editarFamilia") : t("escola:descuentos.nuevaFamiliaModal")}</h2></div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:descuentos.nombre")}</label>
                  <input value={famModal.nombre} onChange={(e) => setFamModal({ ...famModal, nombre: e.target.value })} className={fld} placeholder={t("escola:descuentos.placeholderFamilia")} />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={famModal.aplicaCuota} onChange={(e) => setFamModal({ ...famModal, aplicaCuota: e.target.checked })} /> {t("escola:descuentos.aplicaCuota")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={famModal.aplicaMatricula} onChange={(e) => setFamModal({ ...famModal, aplicaMatricula: e.target.checked })} /> {t("escola:descuentos.aplicaMatricula")}
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button onClick={() => setFamModal(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">{t("escola:descuentos.cancelar")}</button>
                <button onClick={saveFamilia} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">{t("escola:descuentos.guardar")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal subfamilia */}
      {subModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSubModal(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">{subModal.id ? t("escola:descuentos.editarDescuento") : t("escola:descuentos.nuevoDescuentoModal")}</h2></div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:descuentos.nombre")}</label>
                  <input value={subModal.nombre} onChange={(e) => setSubModal({ ...subModal, nombre: e.target.value })} className={fld} placeholder={t("escola:descuentos.placeholderSub")} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:descuentos.porcentaje")}</label>
                  <input type="number" min={0} max={100} value={subModal.descuentoPorcentaje} onChange={(e) => setSubModal({ ...subModal, descuentoPorcentaje: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })} className={fld} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button onClick={() => setSubModal(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">{t("escola:descuentos.cancelar")}</button>
                <button onClick={saveSub} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">{t("escola:descuentos.guardar")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
