import { useEffect, useState } from "react";
import {
  searchContactos,
  createContacto,
  updateContacto,
  deleteContacto,
  type Contacto,
  type ContactoInput,
} from "~/lib/clientesRest";
import { useAuth } from "~/contexts/AuthContext";
import { useTranslation } from "react-i18next";

type ModalMode = "new" | "edit" | null;

const emptyForm: ContactoInput = {
  nombre: "", apellido1: "", apellido2: "", dni: "", telefono: "", email: "",
  direccion: "", codigoPostal: "", poblacion: "", provincia: "",
  iban: "", titularCuenta: "", bic: "", observaciones: "",
};

export default function ContactosListado() {
  const { t } = useTranslation(["escola", "common"]);
  const { canAccess } = useAuth();
  const verBancarios = canAccess("clientes.datos_bancarios", "ver");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [q, setQ] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactoInput>({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setContactos(await searchContactos(q || undefined));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("escola:contactos.errorCargando"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tmr = setTimeout(load, 250);
    return () => clearTimeout(tmr);
  }, [q]);

  const openNew = () => { setForm({ ...emptyForm }); setEditingId(null); setFormError(null); setModalMode("new"); };
  const openEdit = (c: Contacto) => {
    setForm({
      nombre: c.Nombre, apellido1: c.Apellido1 ?? "", apellido2: c.Apellido2 ?? "",
      dni: c.Dni ?? "", telefono: c.Telefono ?? "", email: c.Email ?? "",
      direccion: c.Direccion ?? "", codigoPostal: c.CodigoPostal ?? "", poblacion: c.Poblacion ?? "", provincia: c.Provincia ?? "",
      iban: c.Iban ?? "", titularCuenta: c.TitularCuenta ?? "", bic: c.Bic ?? "", observaciones: c.Observaciones ?? "",
    });
    setEditingId(c.id); setFormError(null); setModalMode("edit");
  };
  const closeModal = () => { setModalMode(null); setEditingId(null); setFormError(null); };

  const handleSave = async () => {
    if (!form.nombre?.trim()) { setFormError(t("escola:contactos.errorNombreObligatorio")); return; }
    setSaving(true); setFormError(null);
    try {
      if (modalMode === "new") await createContacto(form);
      else if (editingId) await updateContacto(editingId, form);
      closeModal();
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? t("escola:contactos.errorGuardando"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Contacto) => {
    if (!confirm(t("escola:contactos.confirmEliminar", { nombre: c.Nombre }))) return;
    try { await deleteContacto(c.id); load(); }
    catch (e: any) { alert(e?.response?.data?.error ?? t("escola:contactos.errorEliminar")); }
  };

  const set = (k: keyof ContactoInput, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const fld = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("escola:contactos.titulo")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("escola:contactos.cargando") : t("escola:contactos.contadorContactos", { count: contactos.length })} · {t("escola:contactos.subtitulo")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("escola:contactos.buscarPlaceholder")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-56" />
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t("escola:contactos.nuevoContacto")}</button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:contactos.colNombre")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:contactos.colDni")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:contactos.colTelefono")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:contactos.colEmail")}</th>
              {verBancarios && <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:contactos.colIban")}</th>}
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:contactos.colAcciones")}</th>
            </tr>
          </thead>
          <tbody>
            {contactos.length === 0 && !loading && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">{t("escola:contactos.sinContactos")}</td></tr>
            )}
            {contactos.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{[c.Nombre, c.Apellido1, c.Apellido2].filter(Boolean).join(" ")}</td>
                <td className="p-4 text-slate-600 text-sm font-mono">{c.Dni ?? "—"}</td>
                <td className="p-4 text-slate-600 text-sm">{c.Telefono ?? "—"}</td>
                <td className="p-4 text-slate-600 text-sm">{c.Email ?? "—"}</td>
                {verBancarios && <td className="p-4 text-slate-600 text-xs font-mono">{c.Iban ?? "—"}</td>}
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50" title={t("escola:contactos.editar")}>
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50" title={t("escola:contactos.eliminar")}>
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
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">{modalMode === "new" ? t("escola:contactos.modalNuevoTitulo") : t("escola:contactos.modalEditarTitulo")}</h2>
              </div>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>}
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelNombre")}</label><input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelApellido1")}</label><input value={form.apellido1} onChange={(e) => set("apellido1", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelApellido2")}</label><input value={form.apellido2} onChange={(e) => set("apellido2", e.target.value)} className={fld} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelDni")}</label><input value={form.dni} onChange={(e) => set("dni", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelTelefono")}</label><input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelEmail")}</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={fld} /></div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelDireccion")}</label><input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelCodigoPostal")}</label><input value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelPoblacion")}</label><input value={form.poblacion} onChange={(e) => set("poblacion", e.target.value)} className={fld} /></div>
                  <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelProvincia")}</label><input value={form.provincia} onChange={(e) => set("provincia", e.target.value)} className={fld} /></div>
                </div>
                {verBancarios && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{t("escola:contactos.datosBancariosTitulo")}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2"><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelIban")}</label><input value={form.iban} onChange={(e) => set("iban", e.target.value)} className={fld} placeholder={t("escola:contactos.ibanPlaceholder")} /></div>
                    <div><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelBic")}</label><input value={form.bic} onChange={(e) => set("bic", e.target.value)} className={fld} /></div>
                  </div>
                  <div className="mt-3"><label className="text-sm font-medium text-slate-700">{t("escola:contactos.labelTitular")}</label><input value={form.titularCuenta} onChange={(e) => set("titularCuenta", e.target.value)} className={fld} /></div>
                </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">{t("escola:contactos.cancelar")}</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">{saving ? t("escola:contactos.guardando") : t("escola:contactos.guardar")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
