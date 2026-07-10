import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchAsignaturas, createAsignatura, updateAsignatura, deleteAsignatura, type Asignatura } from "~/lib/escolaRest";

type ModalMode = "new" | "edit" | null;

export default function AsignaturasListado() {
  const { t } = useTranslation(["escola", "common"]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setAsignaturas(await fetchAsignaturas()); }
    catch (e: any) { setError(e?.response?.data?.error ?? t("escola:asignaturas.errorCargando")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ nombre: "", descripcion: "" }); setEditingId(null); setModalMode("new"); };
  const openEdit = (a: Asignatura) => { setForm({ nombre: a.Nombre, descripcion: a.Descripcion ?? "" }); setEditingId(a.id); setModalMode("edit"); };
  const close = () => { setModalMode(null); setEditingId(null); };

  const save = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const payload = { nombre: form.nombre.trim(), descripcion: form.descripcion || null };
      if (modalMode === "new") await createAsignatura(payload);
      else if (editingId) await updateAsignatura(editingId, payload);
      close(); load();
    } catch (e: any) { alert(e?.response?.data?.error ?? t("escola:asignaturas.errorGuardando")); }
    finally { setSaving(false); }
  };
  const borrar = async (a: Asignatura) => {
    if (!confirm(t("escola:asignaturas.confirmEliminar", { nombre: a.Nombre }))) return;
    try { await deleteAsignatura(a.id); load(); } catch { alert(t("escola:asignaturas.errorEliminar")); }
  };

  const fld = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("escola:asignaturas.titulo")}</h1>
          <p className="text-slate-500 text-sm">{loading ? t("escola:asignaturas.cargando") : t("escola:asignaturas.contador", { n: asignaturas.length })} · {t("escola:asignaturas.subtitulo")}</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t("escola:asignaturas.nuevaAsignatura")}</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:asignaturas.colNombre")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:asignaturas.colDescripcion")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:asignaturas.colAcciones")}</th>
            </tr>
          </thead>
          <tbody>
            {asignaturas.length === 0 && !loading && <tr><td colSpan={3} className="p-8 text-center text-slate-500">{t("escola:asignaturas.sinAsignaturas")}</td></tr>}
            {asignaturas.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{a.Nombre}</td>
                <td className="p-4 text-slate-600">{a.Descripcion ?? "—"}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50" title={t("escola:asignaturas.editar")}>
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => borrar(a)} className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50" title={t("escola:asignaturas.eliminar")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">{modalMode === "new" ? t("escola:asignaturas.nuevaAsignaturaTitulo") : t("escola:asignaturas.editarAsignaturaTitulo")}</h2></div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:asignaturas.campoNombre")}</label>
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={fld} placeholder={t("escola:asignaturas.placeholderNombre")} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:asignaturas.campoDescripcion")}</label>
                  <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className={fld} placeholder={t("escola:asignaturas.placeholderDescripcion")} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button onClick={close} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">{t("escola:asignaturas.cancelar")}</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">{t("escola:asignaturas.guardar")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}