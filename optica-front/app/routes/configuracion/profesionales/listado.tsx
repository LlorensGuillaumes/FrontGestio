import React, { useEffect, useState } from "react";
import {
  fetchProfesionales,
  createProfesional,
  updateProfesional,
  deleteProfesional,
  type Profesional,
} from "~/lib/profesionalesRest";

type ModalMode = "new" | "edit" | null;

export default function ProfesionalesListado() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [showInactivos, setShowInactivos] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    especialidad: "",
    numColegiado: "",
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfesionales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfesionales(!showInactivos);
      setProfesionales(data);
    } catch (e: any) {
      setError(e.message ?? "Error cargando profesionales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfesionales();
  }, [showInactivos]);

  const openNewModal = () => {
    setFormData({ nombreCompleto: "", especialidad: "", numColegiado: "", activo: true });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (p: Profesional) => {
    setFormData({
      nombreCompleto: p.nombreCompleto,
      especialidad: p.especialidad ?? "",
      numColegiado: p.numColegiado ?? "",
      activo: p.activo,
    });
    setEditingId(p.id);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.nombreCompleto.trim()) {
      setFormError("El nombre completo es obligatorio");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === "new") {
        await createProfesional({
          nombreCompleto: formData.nombreCompleto.trim(),
          especialidad: formData.especialidad.trim() || null,
          numColegiado: formData.numColegiado.trim() || null,
          activo: formData.activo,
        });
      } else if (modalMode === "edit" && editingId) {
        await updateProfesional(editingId, {
          nombreCompleto: formData.nombreCompleto.trim(),
          especialidad: formData.especialidad.trim() || null,
          numColegiado: formData.numColegiado.trim() || null,
          activo: formData.activo,
        });
      }
      closeModal();
      loadProfesionales();
    } catch (e: any) {
      setFormError(e.message ?? "Error guardando profesional");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("¿Desactivar este profesional? Podrá reactivarlo más tarde.");
    if (!confirmed) return;

    try {
      await deleteProfesional(id);
      loadProfesionales();
    } catch (e: any) {
      alert(e.message ?? "Error al desactivar profesional");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profesionales</h1>
          <p className="text-slate-500 text-sm">
            {loading ? "Cargando..." : `${profesionales.length} profesionales`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactivos}
              onChange={(e) => setShowInactivos(e.target.checked)}
              className="rounded border-slate-300"
            />
            Mostrar inactivos
          </label>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Nuevo profesional
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">Nombre completo</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">Especialidad</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">N. Colegiado</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">Estado</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {profesionales.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No hay profesionales registrados.
                </td>
              </tr>
            )}
            {profesionales.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{p.nombreCompleto}</div>
                </td>
                <td className="p-4 text-slate-600">{p.especialidad ?? "—"}</td>
                <td className="p-4 text-slate-600 font-mono text-sm">{p.numColegiado ?? "—"}</td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      p.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title="Editar"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {p.activo ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Desactivar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? "Nuevo profesional" : "Editar profesional"}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700">Nombre completo *</label>
                  <input
                    type="text"
                    value={formData.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ej: Dr. Juan García López"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Especialidad</label>
                  <input
                    type="text"
                    value={formData.especialidad}
                    onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ej: Optometrista, Óptico, Asistente..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">N. Colegiado</label>
                  <input
                    type="text"
                    value={formData.numColegiado}
                    onChange={(e) => setFormData({ ...formData, numColegiado: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ej: COL-12345 (opcional)"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Opcional. Dejar vacío para asistentes o vendedores.
                  </p>
                </div>

                {modalMode === "edit" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Activo
                    </label>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
