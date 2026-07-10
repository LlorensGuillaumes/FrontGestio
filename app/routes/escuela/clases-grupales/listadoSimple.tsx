import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "~/lib/api";

type ClaseGrupal = {
  id: number;
  Nombre: string;
  IdProfesor: number;
  NombreProfesor: string;
  IdInstrumento: number;
  NombreInstrumento: string;
  CapacidadMaxima: number;
  DiaDeLaSemana: number;
  HoraInicio: string;
  HoraFin: string;
  Aula: string | null;
  FechaInicio: string | null;
  FechaFin: string | null;
  Activa: boolean;
};

type OpcionesClasesGrupales = {
  profesores: { id: number; nombre: string }[];
  instrumentos: { id: number; Nombre: string }[];
};

type ModalMode = "new" | "edit" | null;

const emptyForm = {
  nombre: "",
  idProfesor: null as number | null,
  idInstrumento: null as number | null,
  capacidadMaxima: 2,
  diaDeLaSemana: 1,
  horaInicio: "17:00",
  horaFin: "18:00",
  aula: "",
  fechaInicio: "",
  fechaFin: "",
  activa: true,
};

export default function ClasesGrupalesListadoSimple() {
  const { t } = useTranslation(["escola", "common"]);
  const diaNombre = (d: number) => (d >= 1 && d <= 7 ? t(`escola:clasesGrupales.dias.${d}`) : "—");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clases, setClases] = useState<ClaseGrupal[]>([]);
  const [opciones, setOpciones] = useState<OpcionesClasesGrupales | null>(null);
  const [showInactivas, setShowInactivas] = useState(false);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadClases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/clases-grupales", { params: { soloActivas: !showInactivas } });
      setClases(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? t("escola:clasesGrupales.errorCargando"));
    } finally {
      setLoading(false);
    }
  };

  const loadOpciones = async () => {
    try {
      setOpciones(await api.get("/clases-grupales/opciones"));
    } catch (e) {
      console.error("Error cargando opciones", e);
    }
  };

  useEffect(() => {
    loadOpciones();
  }, []);
  useEffect(() => {
    loadClases();
  }, [showInactivas]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEdit = (c: ClaseGrupal) => {
    setForm({
      nombre: c.Nombre,
      idProfesor: c.IdProfesor,
      idInstrumento: c.IdInstrumento,
      capacidadMaxima: c.CapacidadMaxima,
      diaDeLaSemana: c.DiaDeLaSemana,
      horaInicio: c.HoraInicio?.slice(0, 5) ?? "17:00",
      horaFin: c.HoraFin?.slice(0, 5) ?? "18:00",
      aula: c.Aula ?? "",
      fechaInicio: c.FechaInicio ?? "",
      fechaFin: c.FechaFin ?? "",
      activa: c.Activa,
    });
    setEditingId(c.id);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFormError(t("escola:clasesGrupales.errorNombreObligatorio"));
      return;
    }
    if (!form.idProfesor || !form.idInstrumento) {
      setFormError(t("escola:clasesGrupales.errorProfesorInstrumento"));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        idProfesor: form.idProfesor,
        idInstrumento: form.idInstrumento,
        capacidadMaxima: Number(form.capacidadMaxima),
        diaDeLaSemana: Number(form.diaDeLaSemana),
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        aula: form.aula || null,
        fechaInicio: form.fechaInicio || null,
        fechaFin: form.fechaFin || null,
        activa: form.activa,
      };
      
      if (modalMode === "new") {
        await api.post("/clases-grupales", payload);
      } else if (editingId) {
        await api.put(`/clases-grupales/${editingId}`, payload);
      }
      
      closeModal();
      loadClases();
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? e.message ?? t("escola:clasesGrupales.errorGuardando"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: ClaseGrupal) => {
    if (!window.confirm(t("escola:clasesGrupales.confirmEliminar", { nombre: c.Nombre }))) return;
    try {
      await api.delete(`/clases-grupales/${c.id}`);
      loadClases();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? t("escola:clasesGrupales.errorEliminar"));
    }
  };

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
            {clases.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">{diaNombre(c.DiaDeLaSemana)}</span>
                    <span className="text-slate-500"> {c.HoraInicio?.slice(0, 5)} - {c.HoraFin?.slice(0, 5)}{c.Aula ? ` · ${c.Aula}` : ""}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-900">{c.Nombre}</div>
                  {c.NombreInstrumento && <div className="text-xs text-slate-500">{c.NombreInstrumento}</div>}
                </td>
                <td className="p-4 text-slate-600 text-sm">{c.NombreProfesor ?? "—"}</td>
                <td className="p-4 text-center">
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {c.CapacidadMaxima}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
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
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      title={t("escola:clasesGrupales.eliminar")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Modal ===== */}
      {modalMode && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? t("escola:clasesGrupales.nuevaClaseTitulo") : t("escola:clasesGrupales.editarClaseTitulo")}
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
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
                      value={form.idInstrumento ?? ""}
                      onChange={(e) => setForm({ ...form, idInstrumento: e.target.value ? Number(e.target.value) : null })}
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
                      value={form.idProfesor ?? ""}
                      onChange={(e) => setForm({ ...form, idProfesor: e.target.value ? Number(e.target.value) : null })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">{t("escola:clasesGrupales.sinAsignar")}</option>
                      {opciones?.profesores.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.campoPlazasMax")}</label>
                  <input
                    type="number"
                    min={2}
                    value={form.capacidadMaxima}
                    onChange={(e) => setForm({ ...form, capacidadMaxima: parseInt(e.target.value) || 2 })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.labelDia")}</label>
                    <select
                      value={form.diaDeLaSemana}
                      onChange={(e) => setForm({ ...form, diaDeLaSemana: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <option key={d} value={d}>{diaNombre(d)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.labelHoraInicio")}</label>
                    <input
                      type="time"
                      value={form.horaInicio}
                      onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.labelHoraFin")}</label>
                    <input
                      type="time"
                      value={form.horaFin}
                      onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.labelAula")}</label>
                  <input
                    type="text"
                    value={form.aula}
                    onChange={(e) => setForm({ ...form, aula: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={t("escola:clasesGrupales.placeholderAula")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.labelFechaInicio")}</label>
                    <input
                      type="date"
                      value={form.fechaInicio}
                      onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t("escola:clasesGrupales.labelFechaFin")}</label>
                    <input
                      type="date"
                      value={form.fechaFin}
                      onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {modalMode === "edit" && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.activa}
                      onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    {t("escola:clasesGrupales.activa")}
                  </label>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                >
                  {t("escola:clasesGrupales.cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {saving ? t("escola:clasesGrupales.guardando") : t("escola:clasesGrupales.guardar")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}