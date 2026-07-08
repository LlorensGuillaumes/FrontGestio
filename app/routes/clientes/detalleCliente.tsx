import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getClienteFull,
  updateClienteFull,
  createClienteFull,
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
import {
  fetchOpcionesEscola,
  fetchClasesRecurrentes,
  createClaseRecurrente,
  createMatricula,
  fetchMatriculas,
  updateMatricula,
  deleteMatricula,
  fetchAulas,
  type ClaseRecurrente,
  type Matricula,
} from "~/lib/escolaRest";

const emptyForm = {
  nombre: "", apellido1: "", apellido2: "", fechaNacimiento: "",
  nif: "", email: "", telefono: "", telefonoMovil: "",
  direccion: "", cp: "", poblacion: "", provincia: "", pais: "España",
  iban: "", titularCuenta: "", bic: "",
};

export default function DetalleClientePage() {
  const { t } = useTranslation(["clientes", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "nuevo";
  const [isEditing, setIsEditing] = useState(isNew);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Responsables
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [pagador, setPagador] = useState<{ origen: string | null; iban: string | null; titular: string | null; edad: number | null; aviso?: string } | null>(null);
  const [addingResp, setAddingResp] = useState(false);

  // Clases del alumno
  const [clases, setClases] = useState<Matricula[]>([]);
  const [addingClase, setAddingClase] = useState(false);

  const handleClose = () => navigate("/clientes");

  const loadCliente = async () => {
    if (!id || isNew) return;
    setLoading(true);
    setError(null);
    try {
      const { cliente: c } = await getClienteFull(id);
      const p = c.persona ?? {};
      setForm({
        nombre: p.nombre ?? c.nombre ?? "",
        apellido1: p.primerApellido ?? c.apellido1 ?? "",
        apellido2: p.segundoApellido ?? c.apellido2 ?? "",
        fechaNacimiento: p.fechaNacimiento ?? "",
        nif: c.documento_fiscal ?? "",
        email: c.email ?? "",
        telefono: c.telefono1 ?? "",
        telefonoMovil: c.telefono2 ?? "",
        direccion: c.direccion ?? "",
        cp: c.codigo_postal ?? "",
        poblacion: c.poblacion ?? "",
        provincia: c.provincia ?? "",
        pais: c.pais ?? "España",
        iban: c.iban ?? "",
        titularCuenta: c.titular_cuenta ?? "",
        bic: c.bic ?? "",
      });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("clientes:detalle.errorCargando"));
    } finally {
      setLoading(false);
    }
  };

  const loadResponsables = async () => {
    if (!id || isNew) return;
    try {
      setResponsables(await getResponsables(id));
      setPagador(await getPagador(id));
    } catch (e) {
      console.error(e);
    }
  };

  const loadClases = async () => {
    if (!id || isNew) return;
    try {
      const { data } = await fetchMatriculas({ idCliente: Number(id) });
      setClases(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isNew) {
      setForm({ ...emptyForm });
      setIsEditing(true);
    } else {
      loadCliente();
      loadResponsables();
      loadClases();
    }
  }, [id]);

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const edad = form.fechaNacimiento
    ? Math.floor((Date.now() - new Date(form.fechaNacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const esMenor = edad !== null && edad < 18;

  const handleSave = async () => {
    if (!form.nombre.trim() && !form.apellido1.trim()) {
      setError(t("clientes:detalle.errorNombreObligatorio"));
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      tipo_cliente: "P",
      documento_fiscal: form.nif.trim() || "SIN-NIF",
      persona: {
        nombre: form.nombre.trim() || null,
        primerApellido: form.apellido1.trim() || null,
        segundoApellido: form.apellido2.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
      },
      email: form.email.trim() || null,
      telefono1: form.telefono.trim() || null,
      telefono2: form.telefonoMovil.trim() || null,
      direccion: form.direccion.trim() || null,
      codigo_postal: form.cp.trim() || null,
      poblacion: form.poblacion.trim() || null,
      provincia: form.provincia.trim() || null,
      pais: form.pais.trim() || "España",
      iban: form.iban.trim() || null,
      titular_cuenta: form.titularCuenta.trim() || null,
      bic: form.bic.trim() || null,
    };
    try {
      if (isNew) {
        const created = await createClienteFull(payload);
        navigate(`/clientes/${created?.id ?? ""}`);
      } else {
        await updateClienteFull(id!, payload);
        setIsEditing(false);
        loadResponsables();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("clientes:detalle.errorGuardando"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 bg-white";
  const labelClass = "text-sm font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-black">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {isNew ? t("clientes:detalle.tituloNuevo") : isEditing ? t("clientes:detalle.tituloModificar") : t("clientes:detalle.tituloFicha")}
            {edad !== null && <span className="ml-2 text-sm font-normal text-slate-500">({t("clientes:detalle.edadAnios", { edad })}{esMenor ? t("clientes:detalle.sufijoMenor") : ""})</span>}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
          {loading && <p className="text-slate-500 text-sm">{t("clientes:detalle.cargando")}</p>}

          {/* Datos personales */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("clientes:detalle.datosPersonales")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.nombre")}</label>
                <input disabled={!isEditing} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.primerApellido")}</label>
                <input disabled={!isEditing} value={form.apellido1} onChange={(e) => set("apellido1", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.segundoApellido")}</label>
                <input disabled={!isEditing} value={form.apellido2} onChange={(e) => set("apellido2", e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.fechaNacimiento")}</label>
                <input type="date" disabled={!isEditing} value={form.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.nif")}</label>
                <input disabled={!isEditing} value={form.nif} onChange={(e) => set("nif", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.email")}</label>
                <input type="email" disabled={!isEditing} value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.telefono")}</label>
                <input disabled={!isEditing} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.movil")}</label>
                <input disabled={!isEditing} value={form.telefonoMovil} onChange={(e) => set("telefonoMovil", e.target.value)} className={inputClass} /></div>
            </div>
            <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.direccion")}</label>
              <input disabled={!isEditing} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} className={inputClass} /></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.cp")}</label>
                <input disabled={!isEditing} value={form.cp} onChange={(e) => set("cp", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.poblacion")}</label>
                <input disabled={!isEditing} value={form.poblacion} onChange={(e) => set("poblacion", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.provincia")}</label>
                <input disabled={!isEditing} value={form.provincia} onChange={(e) => set("provincia", e.target.value)} className={inputClass} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.pais")}</label>
                <input disabled={!isEditing} value={form.pais} onChange={(e) => set("pais", e.target.value)} className={inputClass} /></div>
            </div>
          </section>

          {/* Datos bancarios */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("clientes:detalle.datosBancarios")}</h3>
            {esMenor && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
                {t("clientes:detalle.avisoMenorIban")}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1"><label className={labelClass}>{t("clientes:detalle.iban")}</label>
                <input disabled={!isEditing} value={form.iban} onChange={(e) => set("iban", e.target.value)} className={inputClass} placeholder={t("clientes:detalle.ibanPlaceholder")} /></div>
              <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.bic")}</label>
                <input disabled={!isEditing} value={form.bic} onChange={(e) => set("bic", e.target.value)} className={inputClass} /></div>
            </div>
            <div className="space-y-1"><label className={labelClass}>{t("clientes:detalle.titularCuenta")}</label>
              <input disabled={!isEditing} value={form.titularCuenta} onChange={(e) => set("titularCuenta", e.target.value)} className={inputClass} /></div>
            {!isNew && pagador && (
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{t("clientes:detalle.pagadorEfectivo")} </span>
                {pagador.iban
                  ? <>{pagador.iban} <span className="text-slate-400">({pagador.origen === "ALUMNO" ? t("clientes:detalle.origenAlumno") : t("clientes:detalle.origenResponsable")})</span></>
                  : <span className="text-amber-600">{pagador.aviso ?? t("clientes:detalle.sinIban")}</span>}
              </div>
            )}
          </section>

          {/* Responsables (solo alumnos existentes) */}
          {!isNew && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("clientes:detalle.responsables")}</h3>
                <button onClick={() => setAddingResp(true)} className="text-sm text-blue-600 hover:underline font-medium">{t("clientes:detalle.anadirResponsable")}</button>
              </div>
              {responsables.length === 0 && <p className="text-sm text-slate-500">{t("clientes:detalle.sinResponsables")}</p>}
              {responsables.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {[r.Nombre, r.Apellido1, r.Apellido2].filter(Boolean).join(" ")}
                      {r.Parentesco && <span className="text-slate-400 font-normal"> · {r.Parentesco}</span>}
                      {r.EsPagador && <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{t("clientes:detalle.pagador")}</span>}
                    </div>
                    <div className="text-xs text-slate-500">{r.Telefono || ""} {r.Iban ? `· ${r.Iban}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!r.EsPagador && (
                      <button onClick={async () => { await updateResponsable(r.id, { esPagador: true }); loadResponsables(); }}
                        className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">{t("clientes:detalle.hacerPagador")}</button>
                    )}
                    <button onClick={async () => { if (confirm(t("clientes:detalle.confirmarQuitarResponsable"))) { await removeResponsable(r.id); loadResponsables(); } }}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">{t("clientes:detalle.quitar")}</button>
                  </div>
                </div>
              ))}
              {addingResp && <AddResponsableForm idCliente={id!} onDone={() => { setAddingResp(false); loadResponsables(); }} onCancel={() => setAddingResp(false)} />}
            </section>
          )}

          {/* Clases del alumno (solo alumnos existentes) */}
          {!isNew && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("clientes:detalle.clases")}</h3>
                <button onClick={() => setAddingClase(true)} className="text-sm text-blue-600 hover:underline font-medium">{t("clientes:detalle.anadirClase")}</button>
              </div>
              {clases.length === 0 && <p className="text-sm text-slate-500">{t("clientes:detalle.sinClases")}</p>}
              {clases.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {c.NombreClase}
                      {c.Tipo && <span className="text-slate-400 font-normal"> · {c.Tipo}</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.CuotaMensual && <span>{t("clientes:detalle.cuotaMensual")}: {c.CuotaMensual}€</span>}
                      {c.Estado && <span className="ml-2">{t("clientes:detalle.estado")}: {c.Estado}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => { if (confirm(t("clientes:detalle.confirmarQuitarClase"))) { await deleteMatricula(c.id); loadClases(); } }}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">{t("clientes:detalle.quitar")}</button>
                  </div>
                </div>
              ))}
              {addingClase && <AddClaseForm idCliente={id!} onDone={() => { setAddingClase(false); loadClases(); }} onCancel={() => setAddingClase(false)} />}
            </section>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">{t("clientes:detalle.cerrar")}</button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("clientes:detalle.modificarDatos")}</button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? t("clientes:detalle.guardando") : t("clientes:detalle.guardarCambios")}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// ===== Subcomponente: añadir responsable (contacto existente o nuevo) =====
function AddResponsableForm({ idCliente, onDone, onCancel }: { idCliente: string; onDone: () => void; onCancel: () => void }) {
  const { t } = useTranslation(["clientes", "common"]);
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
        if (!nuevo.nombre.trim()) { setErr(t("clientes:detalle.errorNombreContacto")); setSaving(false); return; }
        const created = await createContacto(nuevo);
        contactoId = created.id;
      }
      if (!contactoId) { setErr(t("clientes:detalle.errorSeleccionaContacto")); setSaving(false); return; }
      await addResponsable(idCliente, { idContacto: contactoId, parentesco: parentesco || undefined, esPagador });
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? t("clientes:detalle.errorAnadirResponsable"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
      <div className="flex gap-2 text-sm">
        <button onClick={() => setModo("existente")} className={`px-3 py-1 rounded ${modo === "existente" ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>{t("clientes:detalle.contactoExistente")}</button>
        <button onClick={() => setModo("nuevo")} className={`px-3 py-1 rounded ${modo === "nuevo" ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>{t("clientes:detalle.nuevoContacto")}</button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}

      {modo === "existente" ? (
        <select value={idContacto} onChange={(e) => setIdContacto(e.target.value ? Number(e.target.value) : "")} className={inputClass}>
          <option value="">{t("clientes:detalle.seleccionaContacto")}</option>
          {contactos.map((c) => (
            <option key={c.id} value={c.id}>{[c.Nombre, c.Apellido1].filter(Boolean).join(" ")}{c.Dni ? ` (${c.Dni})` : ""}</option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input placeholder={t("clientes:detalle.phNombreObligatorio")} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className={inputClass} />
          <input placeholder={t("clientes:detalle.phApellido")} value={nuevo.apellido1} onChange={(e) => setNuevo({ ...nuevo, apellido1: e.target.value })} className={inputClass} />
          <input placeholder={t("clientes:detalle.phDni")} value={nuevo.dni} onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value })} className={inputClass} />
          <input placeholder={t("clientes:detalle.phTelefono")} value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className={inputClass} />
          <input placeholder={t("clientes:detalle.phIban")} value={nuevo.iban} onChange={(e) => setNuevo({ ...nuevo, iban: e.target.value })} className={inputClass} />
          <input placeholder={t("clientes:detalle.phTitularCuenta")} value={nuevo.titularCuenta} onChange={(e) => setNuevo({ ...nuevo, titularCuenta: e.target.value })} className={inputClass} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select value={parentesco} onChange={(e) => setParentesco(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
          <option value="">{t("clientes:detalle.parentescoPlaceholder")}</option>
          <option value="padre">{t("clientes:detalle.parentescoPadre")}</option>
          <option value="madre">{t("clientes:detalle.parentescoMadre")}</option>
          <option value="tutor">{t("clientes:detalle.parentescoTutor")}</option>
          <option value="abuelo">{t("clientes:detalle.parentescoAbuelo")}</option>
          <option value="otro">{t("clientes:detalle.parentescoOtro")}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={esPagador} onChange={(e) => setEsPagador(e.target.checked)} /> {t("clientes:detalle.esPagador")}
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded border border-slate-200">{t("clientes:detalle.cancelar")}</button>
        <button onClick={guardar} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white disabled:opacity-50">{saving ? "..." : t("clientes:detalle.anadir")}</button>
      </div>
    </div>
  );
}

// ===== Subcomponente: añadir clase al alumno =====
function AddClaseForm({ idCliente, onDone, onCancel }: { idCliente: string; onDone: () => void; onCancel: () => void }) {
  const { t } = useTranslation(["clientes", "common"]);
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [clases, setClases] = useState<ClaseRecurrente[]>([]);
  const [aulas, setAulas] = useState<{ id: number; Nombre: string }[]>([]);
  const [idClase, setIdClase] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Campos para crear nueva clase
  const [nuevaClase, setNuevaClase] = useState({
    nombre: "",
    idServicio: "" as number | "",
    idProfesional: "" as number | "",
    tipo: "INDIVIDUAL" as "INDIVIDUAL" | "GRUPAL",
    capacidadMax: 1,
    fechaInicio: "",
    fechaFin: "",
    observaciones: "",
  });
  const [sesiones, setSesiones] = useState<Array<{ dia: number; hora: string; duracion: number; idAula: number | "" }>>([]);

  useEffect(() => {
    fetchClasesRecurrentes().then((r) => setClases(r.data)).catch(() => {});
    fetchAulas().then((r) => setAulas(r)).catch(() => {});
  }, []);

  const addSesion = () => {
    setSesiones([...sesiones, { dia: 1, hora: "17:00", duracion: 60, idAula: "" }]);
  };

  const updateSesion = (idx: number, field: string, value: any) => {
    setSesiones(sesiones.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeSesion = (idx: number) => {
    setSesiones(sesiones.filter((_, i) => i !== idx));
  };

  const guardar = async () => {
    setSaving(true);
    setErr(null);
    try {
      let idClaseRecurrente = Number(idClase);

      if (modo === "nuevo") {
        if (!nuevaClase.nombre.trim() || sesiones.length === 0) {
          setErr(t("clientes:detalle.errorClaseDatos"));
          setSaving(false);
          return;
        }
        const created = await createClaseRecurrente({
          ...nuevaClase,
          idServicio: nuevaClase.idServicio || null,
          idProfesional: nuevaClase.idProfesional || null,
          sesiones: sesiones.map(s => ({ ...s, idAula: s.idAula || null })),
        });
        idClaseRecurrente = created.id;
      }

      if (!idClaseRecurrente) {
        setErr(t("clientes:detalle.errorSeleccionaClase"));
        setSaving(false);
        return;
      }

      await createMatricula({ idClaseRecurrente, idCliente: Number(idCliente), cuotaMensual: 0 });
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? t("clientes:detalle.errorAnadirClase"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
      <div className="flex gap-2 text-sm">
        <button onClick={() => setModo("existente")} className={`px-3 py-1 rounded ${modo === "existente" ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>{t("clientes:detalle.claseExistente")}</button>
        <button onClick={() => setModo("nuevo")} className={`px-3 py-1 rounded ${modo === "nuevo" ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>{t("clientes:detalle.nuevaClase")}</button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}

      {modo === "existente" ? (
        <select value={idClase} onChange={(e) => setIdClase(e.target.value ? Number(e.target.value) : "")} className={inputClass}>
          <option value="">{t("clientes:detalle.seleccionaClase")}</option>
          {clases.map((c) => (
            <option key={c.id} value={c.id}>{c.Nombre} ({c.Tipo}) - {c.NombreProfesor || "Sin profesor"}</option>
          ))}
        </select>
      ) : (
        <div className="space-y-3">
          <input placeholder={t("clientes:detalle.phNombreClase")} value={nuevaClase.nombre} onChange={(e) => setNuevaClase({ ...nuevaClase, nombre: e.target.value })} className={inputClass} />

          <div className="grid grid-cols-2 gap-2">
            <select value={nuevaClase.tipo} onChange={(e) => setNuevaClase({ ...nuevaClase, tipo: e.target.value as "INDIVIDUAL" | "GRUPAL" })} className={inputClass}>
              <option value="INDIVIDUAL">{t("clientes:detalle.tipoIndividual")}</option>
              <option value="GRUPAL">{t("clientes:detalle.tipoGrupal")}</option>
            </select>
            <input type="number" placeholder={t("clientes:detalle.phCapacidad")} value={nuevaClase.capacidadMax} onChange={(e) => setNuevaClase({ ...nuevaClase, capacidadMax: Number(e.target.value) })} className={inputClass} min="1" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">{t("clientes:detalle.sesiones")}</span>
              <button type="button" onClick={addSesion} className="text-xs px-2 py-1 rounded bg-blue-600 text-white">{t("clientes:detalle.agregarSesion")}</button>
            </div>
            {sesiones.map((s, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                <select value={s.dia} onChange={(e) => updateSesion(idx, "dia", Number(e.target.value))} className={inputClass}>
                  <option value={1}>Lunes</option>
                  <option value={2}>Martes</option>
                  <option value={3}>Miércoles</option>
                  <option value={4}>Jueves</option>
                  <option value={5}>Viernes</option>
                  <option value={6}>Sábado</option>
                  <option value={7}>Domingo</option>
                </select>
                <input type="time" value={s.hora} onChange={(e) => updateSesion(idx, "hora", e.target.value)} className={inputClass} />
                <select value={s.idAula} onChange={(e) => updateSesion(idx, "idAula", e.target.value ? Number(e.target.value) : "")} className={inputClass}>
                  <option value="">{t("clientes:detalle.seleccionaAula")}</option>
                  {aulas.map((a) => (
                    <option key={a.id} value={a.id}>{a.Nombre}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeSesion(idx)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600">{t("clientes:detalle.quitar")}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded border border-slate-200">{t("clientes:detalle.cancelar")}</button>
        <button onClick={guardar} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white disabled:opacity-50">{saving ? "..." : t("clientes:detalle.anadir")}</button>
      </div>
    </div>
  );
}
