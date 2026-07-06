import { useEffect, useState } from "react";
import {
  getResponsables,
  addResponsable,
  removeResponsable,
  updateResponsable,
  searchContactos,
  createContacto,
  getPagador,
  type Responsable,
  type Contacto,
} from "~/lib/clientesRest";
import { useAuth } from "~/contexts/AuthContext";
import { useTranslation } from "react-i18next";

// Sección reutilizable: responsables (contactos) de un alumno + pagador SEPA.
export default function ResponsablesSection({ idCliente, disabled }: { idCliente: number | string; disabled?: boolean }) {
  const { t } = useTranslation(["escola", "common"]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [pagador, setPagador] = useState<{ origen: string | null; iban: string | null; titular: string | null; edad: number | null; aviso?: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const { canAccess } = useAuth();
  const verBancarios = canAccess("clientes.datos_bancarios", "ver");

  const load = async () => {
    try {
      setResponsables(await getResponsables(idCliente));
      setPagador(await getPagador(idCliente));
    } catch (e) {
      console.error("Error cargando responsables", e);
    }
  };

  useEffect(() => {
    if (idCliente) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCliente]);

  return (
    <section className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">{t("escola:responsables.titulo")}</h3>
        {!disabled && (
          <button type="button" onClick={() => setAdding(true)} className="text-sm text-blue-600 hover:underline font-medium">
            {t("escola:responsables.afegir")}
          </button>
        )}
      </div>
      <div className="p-4 space-y-2">
        {verBancarios && pagador && (
          <div className="text-sm text-slate-600 mb-1">
            <span className="font-semibold">{t("escola:responsables.pagadorSepa")} </span>
            {pagador.iban
              ? <>{pagador.iban} <span className="text-slate-400">({pagador.origen === "ALUMNO" ? t("escola:responsables.origenAlumno") : t("escola:responsables.origenResponsable")})</span></>
              : <span className="text-amber-600">{pagador.aviso ?? t("escola:responsables.sinIban")}</span>}
          </div>
        )}
        {responsables.length === 0 && <p className="text-sm text-slate-500">{t("escola:responsables.sinResponsables")}</p>}
        {responsables.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div>
              <div className="font-medium text-slate-900 text-sm">
                {[r.Nombre, r.Apellido1, r.Apellido2].filter(Boolean).join(" ")}
                {r.Parentesco && <span className="text-slate-400 font-normal"> · {r.Parentesco}</span>}
                {r.EsPagador && <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{t("escola:responsables.pagador")}</span>}
              </div>
              <div className="text-xs text-slate-500">{r.Telefono || ""}{verBancarios && r.Iban ? ` · ${r.Iban}` : ""}</div>
            </div>
            {!disabled && (
              <div className="flex items-center gap-2">
                {!r.EsPagador && (
                  <button type="button" onClick={async () => { await updateResponsable(r.id, { esPagador: true }); load(); }}
                    className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">{t("escola:responsables.ferPagador")}</button>
                )}
                <button type="button" onClick={async () => { if (confirm(t("escola:responsables.confirmTreure"))) { await removeResponsable(r.id); load(); } }}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">{t("escola:responsables.treure")}</button>
              </div>
            )}
          </div>
        ))}
        {adding && <AddResponsableForm idCliente={idCliente} onDone={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}
      </div>
    </section>
  );
}

function AddResponsableForm({ idCliente, onDone, onCancel }: { idCliente: number | string; onDone: () => void; onCancel: () => void }) {
  const { t } = useTranslation(["escola", "common"]);
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [idContacto, setIdContacto] = useState<number | "">("");
  const [parentesco, setParentesco] = useState("");
  const [esPagador, setEsPagador] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", apellido1: "", dni: "", telefono: "", email: "", iban: "", titularCuenta: "" });

  useEffect(() => { searchContactos().then(setContactos).catch(() => {}); }, []);

  const guardar = async () => {
    setSaving(true);
    setErr(null);
    try {
      let contactoId = Number(idContacto);
      if (modo === "nuevo") {
        if (!nuevo.nombre.trim()) { setErr(t("escola:responsables.errorNombreObligatorio")); setSaving(false); return; }
        const created = await createContacto(nuevo);
        contactoId = created.id;
      }
      if (!contactoId) { setErr(t("escola:responsables.errorSeleccionaContacto")); setSaving(false); return; }
      await addResponsable(idCliente, { idContacto: contactoId, parentesco: parentesco || undefined, esPagador });
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? t("escola:responsables.errorAfegir"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3 mt-2">
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => setModo("existente")} className={`px-3 py-1 rounded ${modo === "existente" ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>{t("escola:responsables.contacteExistent")}</button>
        <button type="button" onClick={() => setModo("nuevo")} className={`px-3 py-1 rounded ${modo === "nuevo" ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>{t("escola:responsables.contacteNou")}</button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}

      {modo === "existente" ? (
        <select value={idContacto} onChange={(e) => setIdContacto(e.target.value ? Number(e.target.value) : "")} className={inputClass}>
          <option value="">{t("escola:responsables.seleccionaContacte")}</option>
          {contactos.map((c) => (
            <option key={c.id} value={c.id}>{[c.Nombre, c.Apellido1].filter(Boolean).join(" ")}{c.Dni ? ` (${c.Dni})` : ""}</option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input placeholder={t("escola:responsables.phNombre")} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className={inputClass} />
          <input placeholder={t("escola:responsables.phApellido")} value={nuevo.apellido1} onChange={(e) => setNuevo({ ...nuevo, apellido1: e.target.value })} className={inputClass} />
          <input placeholder={t("escola:responsables.phDni")} value={nuevo.dni} onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value })} className={inputClass} />
          <input placeholder={t("escola:responsables.phTelefono")} value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className={inputClass} />
          <input placeholder={t("escola:responsables.phIban")} value={nuevo.iban} onChange={(e) => setNuevo({ ...nuevo, iban: e.target.value })} className={inputClass} />
          <input placeholder={t("escola:responsables.phTitular")} value={nuevo.titularCuenta} onChange={(e) => setNuevo({ ...nuevo, titularCuenta: e.target.value })} className={inputClass} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
          <option value="">{t("escola:responsables.parentiuPlaceholder")}</option>
          <option value="padre">{t("escola:responsables.parentiuPare")}</option>
          <option value="madre">{t("escola:responsables.parentiuMare")}</option>
          <option value="tutor">{t("escola:responsables.parentiuTutor")}</option>
          <option value="abuelo">{t("escola:responsables.parentiuAvi")}</option>
          <option value="otro">{t("escola:responsables.parentiuAltre")}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={esPagador} onChange={(e) => setEsPagador(e.target.checked)} /> {t("escola:responsables.esPagador")}
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm rounded border border-slate-200">{t("escola:responsables.cancelar")}</button>
        <button type="button" onClick={guardar} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white disabled:opacity-50">{saving ? "..." : t("escola:responsables.afegirBoto")}</button>
      </div>
    </div>
  );
}
