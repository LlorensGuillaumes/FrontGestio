import React, { useEffect, useState } from "react";
import {
  fetchServicios,
  fetchFamiliasServicios,
  createServicio,
  updateServicio,
  deleteServicio,
  type Servicio,
  type FamiliaServicio,
} from "~/lib/serviciosRest";
import { SubfamiliasServiciosPicker } from "~/components/recuadros/subFamiliasServiciosPicker";

type ModalMode = "new" | "edit" | null;

export default function ServiciosListado() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [familias, setFamilias] = useState<FamiliaServicio[]>([]);
  const [showInactivos, setShowInactivos] = useState(false);
  const [filtroFamilia, setFiltroFamilia] = useState<number | null>(null);
  const [filtroSubFamilia, setFiltroSubFamilia] = useState<number | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    pvp: 0,
    porcentajeIva: 21,
    duracionMinutos: 0,
    requiereCita: false,
    observaciones: "",
    activo: true,
    subfamilias: [] as number[],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadFamilias = async () => {
    try {
      const data = await fetchFamiliasServicios(false);
      setFamilias(data);
    } catch (e: any) {
      console.error("Error cargando familias de servicios", e);
    }
  };

  const loadServicios = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServicios({
        soloActivos: !showInactivos,
        idFamilia: filtroFamilia ?? undefined,
        idSubFamilia: filtroSubFamilia ?? undefined,
      });
      setServicios(data.data);
    } catch (e: any) {
      setError(e.message ?? "Error cargando servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilias();
  }, []);

  useEffect(() => {
    loadServicios();
  }, [showInactivos, filtroFamilia, filtroSubFamilia]);

  const subfamiliasFiltered = filtroFamilia
    ? familias.find((f) => f.id === filtroFamilia)?.subfamilias ?? []
    : [];

  const openNewModal = () => {
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      pvp: 0,
      porcentajeIva: 21,
      duracionMinutos: 0,
      requiereCita: false,
      observaciones: "",
      activo: true,
      subfamilias: [],
    });
    setEditingId(null);
    setFormError(null);
    setModalMode("new");
  };

  const openEditModal = (s: Servicio) => {
    setFormData({
      codigo: s.Codigo ?? "",
      nombre: s.Nombre,
      descripcion: s.Descripcion ?? "",
      pvp: s.PVP,
      porcentajeIva: s.PorcentajeIva,
      duracionMinutos: s.DuracionMinutos,
      requiereCita: s.RequiereCita,
      observaciones: s.Observaciones ?? "",
      activo: s.Activo,
      subfamilias: s.subfamilias?.map((sf) => sf.id) ?? [],
    });
    setEditingId(s.id);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === "new") {
        await createServicio({
          codigo: formData.codigo.trim() || undefined,
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          pvp: formData.pvp,
          porcentajeIva: formData.porcentajeIva,
          duracionMinutos: formData.duracionMinutos,
          requiereCita: formData.requiereCita,
          observaciones: formData.observaciones.trim() || undefined,
          subfamilias: formData.subfamilias,
        });
      } else if (modalMode === "edit" && editingId) {
        await updateServicio(editingId, {
          codigo: formData.codigo.trim() || undefined,
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          pvp: formData.pvp,
          porcentajeIva: formData.porcentajeIva,
          duracionMinutos: formData.duracionMinutos,
          requiereCita: formData.requiereCita,
          observaciones: formData.observaciones.trim() || undefined,
          activo: formData.activo,
          subfamilias: formData.subfamilias,
        });
      }
      closeModal();
      loadServicios();
    } catch (e: any) {
      setFormError(e.message ?? "Error guardando servicio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("¿Desactivar este servicio? Podrá reactivarlo más tarde.");
    if (!confirmed) return;

    try {
      await deleteServicio(id);
      loadServicios();
    } catch (e: any) {
      alert(e.message ?? "Error al desactivar servicio");
    }
  };

  const handleSubfamiliasChange = (ids: number[]) => {
    setFormData((prev) => ({
      ...prev,
      subfamilias: ids,
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Servicios</h1>
          <p className="text-slate-500 text-sm">
            {loading ? "Cargando..." : `${servicios.length} servicios`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filtroFamilia ?? ""}
            onChange={(e) => {
              setFiltroFamilia(e.target.value ? Number(e.target.value) : null);
              setFiltroSubFamilia(null);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todas las familias</option>
            {familias.map((f) => (
              <option key={f.id} value={f.id}>
                {f.descripcion}
              </option>
            ))}
          </select>

          {filtroFamilia && subfamiliasFiltered.length > 0 && (
            <select
              value={filtroSubFamilia ?? ""}
              onChange={(e) => setFiltroSubFamilia(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todas las subfamilias</option>
              {subfamiliasFiltered.map((sf) => (
                <option key={sf.id} value={sf.id}>
                  {sf.descripcion}
                </option>
              ))}
            </select>
          )}

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
            + Nuevo servicio
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
              <th className="text-left p-4 text-sm font-semibold text-slate-600">Código</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">Nombre</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">Familia</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">PVP</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">Duración</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">Cita</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">Estado</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No hay servicios registrados.
                </td>
              </tr>
            )}
            {servicios.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 text-slate-600 font-mono text-sm">{s.Codigo ?? "—"}</td>
                <td className="p-4">
                  <div className="font-medium text-slate-900">{s.Nombre}</div>
                  {s.Descripcion && (
                    <div className="text-xs text-slate-500 truncate max-w-xs">{s.Descripcion}</div>
                  )}
                </td>
                <td className="p-4 text-slate-600 text-sm">
                  {s.NombreFamilia ?? "—"}
                  {s.NombreSubFamilia && (
                    <span className="text-slate-400"> / {s.NombreSubFamilia}</span>
                  )}
                </td>
                <td className="p-4 text-right text-slate-900 font-medium">
                  {Number(s.PVP).toFixed(2)} €
                </td>
                <td className="p-4 text-right text-slate-600">
                  {s.DuracionMinutos > 0 ? `${s.DuracionMinutos} min` : "—"}
                </td>
                <td className="p-4 text-center">
                  {s.RequiereCita ? (
                    <span className="text-green-600">Sí</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      s.Activo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.Activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      title="Editar"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {s.Activo ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
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
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">
                  {modalMode === "new" ? "Nuevo servicio" : "Editar servicio"}
                </h2>
              </div>

              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Código</label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Ej: SRV001"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Ej: Sesión de terapia visual"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Descripción del servicio..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">PVP (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pvp}
                      onChange={(e) => setFormData({ ...formData, pvp: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">% IVA</label>
                    <input
                      type="number"
                      value={formData.porcentajeIva}
                      onChange={(e) => setFormData({ ...formData, porcentajeIva: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Duración (minutos)</label>
                    <input
                      type="number"
                      value={formData.duracionMinutos}
                      onChange={(e) => setFormData({ ...formData, duracionMinutos: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="0 si no aplica"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
                      <input
                        type="checkbox"
                        checked={formData.requiereCita}
                        onChange={(e) => setFormData({ ...formData, requiereCita: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Requiere cita previa
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Observaciones</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Notas internas..."
                  />
                </div>

                {/* Subfamilias Picker */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Familias / Subfamilias
                  </label>
                  <SubfamiliasServiciosPicker
                    familias={familias}
                    selected={formData.subfamilias}
                    onChangeSelected={handleSubfamiliasChange}
                    mode="edit"
                  />
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
