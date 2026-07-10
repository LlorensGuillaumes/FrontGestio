import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchClasesRecurrentes,
  fetchClaseRecurrente,
  createClaseRecurrente,
  updateClaseRecurrente,
  deleteClaseRecurrente,
  fetchOpcionesEscola,
  createMatricula,
  deleteMatricula,
  fetchAulas,
  checkConflictosAula,
  regenerarCitasClases,
  nombreAlumno,
  type ClaseRecurrente,
  type ClaseRecurrenteDetalle,
  type OpcionesEscola,
  type Aula,
  type Sesion,
  type ConflictoAula,
} from "~/lib/escolaRest";

type ModalMode = "new" | "edit" | null;

const nuevaSesion = (): Sesion => ({ dia: 1, hora: "17:00", duracion: 60, idAula: null });

const emptyForm = {
  nombre: "",
  idServicio: null as number | null,
  idProfesional: null as number | null,
  capacidadMax: 2,
  sesiones: [nuevaSesion()] as Sesion[],
  observaciones: "",
  activo: true,
};

export default function ClasesGrupalesListado() {
  const { t } = useTranslation(["escola", "common"]);
  const diaNombre = (d: number) => (d >= 1 && d <= 7 ? t(`escola:clasesGrupales.dias.${d}`) : "—");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clases, setClases] = useState<ClaseRecurrente[]>([]);
  const [opciones, setOpciones] = useState<OpcionesEscola | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [showInactivas, setShowInactivas] = useState(false);

  // Modal clase
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictos, setConflictos] = useState<ConflictoAula[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal alumnos (matrículas)
  const [detalle, setDetalle] = useState<ClaseRecurrenteDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [nuevoAlumnoId, setNuevoAlumnoId] = useState<number | "">("");
  const [nuevaCuota, setNuevaCuota] = useState<number>(0);
  const [matriculaError, setMatriculaError] = useState<string | null>(null);
  const [matriculando, setMatriculando] = useState(false);

  const loadClases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClasesRecurrentes({ soloActivas: !showInactivas });
      setClases(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? t("escola:clasesGrupales.errorCargando"));
    } finally {
      setLoading(false);
    }
  };

  const loadOpciones = async () => {
    try {
      setOpciones(await fetchOpcionesEscola());
    } catch (e) {
      console.error("Error cargando opciones", e);
    }
  };

  useEffect(() => {
    loadOpciones();
    fetchAulas().then(setAulas).catch(() => {});
  }, []);
  useEffect(() => {
    loadClases();
  }, [showInactivas]);

  // ---- Modal clase ----
  const openNew = () => {
    setForm({ ...emptyForm, sesiones: [nuevaSesion()] });
    setEditingId(null);
    setFormError(null);
    setConflictos([]);
    setModalMode("new");
  };

  const openEdit = (c: ClaseRecurrente) => {
    const sesiones: Sesion[] = (c.sesiones && c.sesiones.length)
      ? c.sesiones.map((s) => ({ dia: s.dia, hora: String(s.hora).slice(0, 5), duracion: s.duracion, idAula: s.idAula }))
      : [{ dia: c.DiaSemana, hora: c.HoraInicio?.slice(0, 5) ?? "17:00", duracion: c.DuracionMinutos, idAula: null }];
    setForm({
      nombre: c.Nombre,
      idServicio: c.IdServicio,
      idProfesional: c.IdProfesional,
      capacidadMax: c.CapacidadMax,
      sesiones,
      observaciones: c.Observaciones ?? "",
      activo: c.Activo === 1,
    });
    setEditingId(c.id);
    setFormError(null);
    setConflictos([]);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
    setConflictos([]);
  };

  // Gestión de sesiones del formulario
  const addSesion = () => setForm((f) => ({ ...f, sesiones: [...f.sesiones, nuevaSesion()] }));
  const removeSesion = (idx: number) => setForm((f) => ({ ...f, sesiones: f.sesiones.filter((_, i) => i !== idx) }));
  const setSesion = (idx: number, patch: Partial<Sesion>) =>
    setForm((f) => ({ ...f, sesiones: f.sesiones.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));

  // Comprobar conflictos de aula al cambiar las sesiones (en vivo)
  useEffect(() => {
    if (!modalMode) return;
    const conAula = form.sesiones.filter((s) => s.idAula);
    if (!conAula.length) { setConflictos([]); return; }
    const t = setTimeout(async () => {
      try { setConflictos(await checkConflictosAula(form.sesiones, editingId ?? undefined)); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [form.sesiones, modalMode, editingId]);

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFormError(t("escola:clasesGrupales.errorNombreObligatorio"));
      return;
    }
    const sesiones = form.sesiones.filter((s) => s.dia && s.hora);
    if (!sesiones.length) {
      setFormError(t("escola:clasesGrupales.errorSinSesiones"));
      return;
    }
    // Aviso de conflicto de aula (no bloquea, pide confirmación)
    if (conflictos.length && !confirm(t("escola:clasesGrupales.avisoConflictos", { n: conflictos.length }) + "\n" +
      conflictos.map((c) => t("escola:clasesGrupales.conflictoLinea", { dia: c.diaNombre, hora: c.hora, aula: c.aula, clase: c.conClase })).join("\n") +
      "\n\n" + t("escola:clasesGrupales.guardarIgualmente"))) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        idServicio: form.idServicio,
        idProfesional: form.idProfesional,
        tipo: "GRUPAL" as const,
        capacidadMax: Number(form.capacidadMax),
        sesiones: sesiones.map((s) => ({ dia: Number(s.dia), hora: s.hora, duracion: Number(s.duracion), idAula: s.idAula })),
        observaciones: form.observaciones.trim() || null,
      };
      if (modalMode === "new") {
        await createClaseRecurrente(payload);
      } else if (editingId) {
        await updateClaseRecurrente(editingId, { ...payload, activo: form.activo });
      }
      closeModal();
      loadClases();
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? e.message ?? t("escola:clasesGrupales.errorGuardando"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: ClaseRecurrente) => {
    if (!window.confirm(t("escola:clasesGrupales.confirmDesactivar", { nombre: c.Nombre }))) return;
    try {
      await deleteClaseRecurrente(c.id);
      loadClases();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? t("escola:clasesGrupales.errorDesactivar"));
    }
  };

  // ---- Modal alumnos ----
  const openAlumnos = async (c: ClaseRecurrente) => {
    setDetalleLoading(true);
    setMatriculaError(null);
    setNuevoAlumnoId("");
    setNuevaCuota(c.CuotaSugerida != null ? Number(c.CuotaSugerida) : 0);
    try {
      const d = await fetchClaseRecurrente(c.id);
      setDetalle(d);
    } catch (e: any) {
      alert(e?.response?.data?.error ?? t("escola:clasesGrupales.errorCargandoAlumnos"));
    } finally {
      setDetalleLoading(false);
    }
  };

  const refreshDetalle = async () => {
    if (!detalle) return;
    const d = await fetchClaseRecurrente(detalle.id);
    setDetalle(d);
    loadClases(); // actualizar ocupación en la tabla
  };

  const handleMatricular = async () => {
    if (!detalle || !nuevoAlumnoId) {
      setMatriculaError(t("escola:clasesGrupales.errorSeleccionaAlumno"));
      return;
    }
    setMatriculando(true);
    setMatriculaError(null);
    try {
      await createMatricula({
        idClaseRecurrente: detalle.id,
        idCliente: Number(nuevoAlumnoId),
        cuotaMensual: Number(nuevaCuota),
      });
      setNuevoAlumnoId("");
      setNuevaCuota(0);
      await refreshDetalle();
    } catch (e: any) {
      setMatriculaError(e?.response?.data?.error ?? t("escola:clasesGrupales.errorMatricular"));
    } finally {
      setMatriculando(false);
    }
  };

  const handleBaja = async (matriculaId: number, nombre: string) => {
    if (!window.confirm(t("escola:clasesGrupales.confirmBaja", { nombre }))) return;
    try {
      await deleteMatricula(matriculaId);
      await refreshDetalle();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? t("escola:clasesGrupales.errorBaja"));
    }
  };

  const alumnosDisponibles =
    opciones?.alumnos.filter((a) => !detalle?.matriculas.some((m) => m.IdCliente === a.id)) ?? [];

  const plazasLibres = detalle ? detalle.CapacidadMax - detalle.matriculas.length : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("escola:clasesGrupales.titulo")}</h1>
          <p className="text-slate-500 text-sm">{loading ? t("escola:clasesGrupales.cargando") : t("escola:clasesGrupales.contador", { n: clases.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactivas}
              onChange={(e) => setShowInactivas(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("escola:clasesGrupales.mostrarInactivas")}
          </label>
          <button
            type="button"
            onClick={async () => {
              try { const r = await regenerarCitasClases(); alert(t("escola:clasesGrupales.agendaActualizada", { n: r.generadas ?? 0 })); }
              catch (e: any) { alert(e?.response?.data?.error ?? t("escola:clasesGrupales.errorAgenda")); }
            }}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
            title={t("escola:clasesGrupales.actualizarAgendaTitle")}
          >
            {t("escola:clasesGrupales.actualizarAgenda")}
          </button>
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {t("escola:clasesGrupales.nuevaClase")}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:clasesGrupales.colDiaHora")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:clasesGrupales.colClase")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("escola:clasesGrupales.colProfesor")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("escola:clasesGrupales.colPlazas")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("escola:clasesGrupales.colAcciones")}</th>
            </tr>
          </thead>
          <tbody>
            {clases.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {t("escola:clasesGrupales.sinClases")}
                </td>
              </tr>
            )}
            {clases.map((c) => {
              const completa = c.Ocupacion >= c.CapacidadMax;
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    {(c.sesiones && c.sesiones.length ? c.sesiones : [{ dia: c.DiaSemana, hora: c.HoraInicio, duracion: c.DuracionMinutos, aula: c.Aula }]).map((s: any, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-slate-900">{diaNombre(s.dia)}</span>
                        <span className="text-slate-500"> {String(s.hora).slice(0, 5)}{s.aula ? ` · ${s.aula}` : ""}</span>
                      </div>
                    ))}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{c.Nombre}</div>
                    {c.NombreInstrumento && <div className="text-xs text-slate-500">{c.NombreInstrumento}</div>}
                  </td>
                  <td className="p-4 text-slate-600 text-sm">{c.NombreProfesor ?? "—"}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        completa ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {c.Ocupacion}/{c.CapacidadMax}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openAlumnos(c)}
                        className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium"
                      >
                        {t("escola:clasesGrupales.alumnos")}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        title={t("escola:clasesGrupales.editar")}
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {c.Activo === 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title={t("escola:clasesGrupales.desactivar")}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== Modal Clase ===== */}
      {modalMode && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? t("escola:clasesGrupales.nuevaClaseTitulo") : t("escola:clasesGrupales.editarClaseTitulo")}
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{formError}</div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoNombre")}</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("escola:clasesGrupales.placeholderNombre")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoInstrumento")}</label>
                    <select
                      value={form.idServicio ?? ""}
                      onChange={(e) => setForm({ ...form, idServicio: e.target.value ? Number(e.target.value) : null })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">{t("escola:clasesGrupales.sinAsignar")}</option>
                      {opciones?.instrumentos.map((i) => (
                        <option key={i.id} value={i.id}>{i.Nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoProfesor")}</label>
                    <select
                      value={form.idProfesional ?? ""}
                      onChange={(e) => setForm({ ...form, idProfesional: e.target.value ? Number(e.target.value) : null })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">{t("escola:clasesGrupales.sinAsignar")}</option>
                      {opciones?.profesores.map((p) => (
                        <option key={p.id} value={p.id}>{p.NombreCompleto}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoPlazasMax")}</label>
                  <input
                    type="number"
                    min={2}
                    value={form.capacidadMax}
                    onChange={(e) => setForm({ ...form, capacidadMax: parseInt(e.target.value) || 2 })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                {/* Sesiones: una clase puede tener varios días/horas, cada uno con su aula */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoSesiones")}</label>
                    <button type="button" onClick={addSesion} className="text-sm text-blue-600 hover:underline font-medium">{t("escola:clasesGrupales.anadirSesion")}</button>
                  </div>
                  <div className="space-y-2">
                    {form.sesiones.map((s, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-2">
                        <div>
                          <label className="text-xs text-slate-500">{t("escola:clasesGrupales.labelDia")}</label>
                          <select value={s.dia} onChange={(e) => setSesion(idx, { dia: Number(e.target.value) })} className="mt-0.5 block rounded border border-slate-200 px-2 py-1.5 text-sm bg-white">
                            {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{diaNombre(d)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">{t("escola:clasesGrupales.labelHora")}</label>
                          <input type="time" value={s.hora} onChange={(e) => setSesion(idx, { hora: e.target.value })} className="mt-0.5 block rounded border border-slate-200 px-2 py-1.5 text-sm" />
                        </div>
                        <div className="w-20">
                          <label className="text-xs text-slate-500">{t("escola:clasesGrupales.labelMin")}</label>
                          <input type="number" min={15} step={15} value={s.duracion} onChange={(e) => setSesion(idx, { duracion: parseInt(e.target.value) || 60 })} className="mt-0.5 block w-full rounded border border-slate-200 px-2 py-1.5 text-sm" />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label className="text-xs text-slate-500">{t("escola:clasesGrupales.labelAula")}</label>
                          <select value={s.idAula ?? ""} onChange={(e) => setSesion(idx, { idAula: e.target.value ? Number(e.target.value) : null })} className="mt-0.5 block w-full rounded border border-slate-200 px-2 py-1.5 text-sm bg-white">
                            <option value="">{t("escola:clasesGrupales.sinAula")}</option>
                            {aulas.map((a) => <option key={a.id} value={a.id}>{a.Nombre}</option>)}
                          </select>
                        </div>
                        {form.sesiones.length > 1 && (
                          <button type="button" onClick={() => removeSesion(idx)} className="px-2 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 text-xs">{t("escola:clasesGrupales.quitar")}</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {conflictos.length > 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-50 text-amber-700 text-xs border border-amber-200">
                      <b>{t("escola:clasesGrupales.conflictoAulaTitulo")}</b>
                      {conflictos.map((c, i) => (
                        <div key={i}>{t("escola:clasesGrupales.conflictoLinea", { dia: c.diaNombre, hora: c.hora, aula: c.aula, clase: c.conClase })}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoObservaciones")}</label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>

                {modalMode === "edit" && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    {t("escola:clasesGrupales.activa")}
                  </label>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">
                  {t("escola:clasesGrupales.cancelar")}
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">
                  {saving ? t("escola:clasesGrupales.guardando") : t("escola:clasesGrupales.guardar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Alumnos ===== */}
      {detalle && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetalle(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">{detalle.Nombre}</h2>
                <p className="text-sm text-slate-500">
                  {diaNombre(detalle.DiaSemana)} {detalle.HoraInicio?.slice(0, 5)} ·{" "}
                  {t("escola:clasesGrupales.plazasResumen", { ocupadas: detalle.matriculas.length, total: detalle.CapacidadMax })}
                </p>
              </div>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {detalleLoading && <p className="text-slate-500 text-sm">{t("escola:clasesGrupales.cargando")}</p>}

                {/* Lista de alumnos matriculados */}
                <div className="space-y-2">
                  {detalle.matriculas.length === 0 && (
                    <p className="text-sm text-slate-500">{t("escola:clasesGrupales.sinAlumnos")}</p>
                  )}
                  {detalle.matriculas.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{nombreAlumno(m)}</div>
                        <div className="text-xs text-slate-500">{t("escola:clasesGrupales.cuotaMes", { importe: Number(m.CuotaMensual).toFixed(2) })} · {m.Estado}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBaja(m.id, nombreAlumno(m))}
                        className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium"
                      >
                        {t("escola:clasesGrupales.darBaja")}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Formulario matricular */}
                {plazasLibres > 0 ? (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("escola:clasesGrupales.matricularAlumno", { n: plazasLibres })}</h3>
                    {matriculaError && (
                      <div className="mb-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">{matriculaError}</div>
                    )}
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-medium text-slate-600">{t("escola:clasesGrupales.labelAlumno")}</label>
                        <select
                          value={nuevoAlumnoId}
                          onChange={(e) => setNuevoAlumnoId(e.target.value ? Number(e.target.value) : "")}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">{t("escola:clasesGrupales.selecciona")}</option>
                          {alumnosDisponibles.map((a) => (
                            <option key={a.id} value={a.id}>{a.NombreCompleto}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <label className="text-xs font-medium text-slate-600">{t("escola:clasesGrupales.labelCuota")}</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={nuevaCuota}
                          onChange={(e) => setNuevaCuota(parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleMatricular}
                        disabled={matriculando}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                      >
                        {matriculando ? "..." : t("escola:clasesGrupales.matricular")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 pt-4 text-sm text-amber-600">{t("escola:clasesGrupales.claseCompleta")}</div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">
                  {t("escola:clasesGrupales.cerrar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}