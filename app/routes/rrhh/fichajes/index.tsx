import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  getFichajes,
  corregirFichaje,
  eliminarFichaje,
  crearFichajeManual,
  MENSAJES_ADVERTENCIA,
  type Fichaje,
  type FiltrosFichajes,
} from "~/lib/fichajesRest";
import { api } from "~/lib/api";

interface Usuario {
  id: number;
  nombre: string;
  username: string;
}

type ModalMode = "corregir" | "crear" | null;

export default function FichajesListado() {
  const { t, i18n } = useTranslation("fichajes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosFichajes>({
    fechaDesde: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
    fechaHasta: new Date().toISOString().split("T")[0],
  });

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedFichaje, setSelectedFichaje] = useState<Fichaje | null>(null);
  const [formData, setFormData] = useState({
    idUsuario: 0,
    fecha: "",
    hora: "",
    tipo: "ENTRADA" as "ENTRADA" | "SALIDA",
    motivo: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFichajes(filtros);
      setFichajes(data.rows);
    } catch (e: any) {
      setError(e.message ?? t("gestion.mensajes.errorCargar"));
    } finally {
      setLoading(false);
    }
  };

  const loadUsuarios = async () => {
    try {
      const res = await api.get("/usuarios-full?soloActivos=1");
      setUsuarios(res.data.rows || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadData();
    loadUsuarios();
  }, []);

  useEffect(() => {
    loadData();
  }, [filtros]);

  const openCorregirModal = (fichaje: Fichaje) => {
    setSelectedFichaje(fichaje);
    setFormData({
      idUsuario: fichaje.id_usuario,
      fecha: fichaje.fecha,
      hora: fichaje.hora,
      tipo: fichaje.tipo,
      motivo: "",
    });
    setFormError(null);
    setModalMode("corregir");
  };

  const openCrearModal = () => {
    setSelectedFichaje(null);
    setFormData({
      idUsuario: usuarios[0]?.id || 0,
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toTimeString().substring(0, 5),
      tipo: "ENTRADA",
      motivo: "",
    });
    setFormError(null);
    setModalMode("crear");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedFichaje(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.motivo.trim()) {
      setFormError(t("gestion.modal.motivoPlaceholder"));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === "corregir" && selectedFichaje) {
        await corregirFichaje(selectedFichaje.id, formData.hora, formData.tipo, formData.motivo);
      } else if (modalMode === "crear") {
        await crearFichajeManual(
          formData.idUsuario,
          formData.fecha,
          formData.hora,
          formData.tipo,
          formData.motivo
        );
      }
      closeModal();
      loadData();
    } catch (e: any) {
      setFormError(e.response?.data?.message || t("gestion.mensajes.errorCorregir"));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (fichaje: Fichaje) => {
    if (!confirm(t("gestion.mensajes.confirmarEliminar", "¿Seguro que quieres eliminar este fichaje?"))) {
      return;
    }
    try {
      await eliminarFichaje(fichaje.id);
      loadData();
    } catch {
      setError(t("gestion.mensajes.errorEliminar"));
    }
  };

  const getAdvertenciaTexto = (codigo: string): string => {
    const mensaje = MENSAJES_ADVERTENCIA[codigo];
    if (!mensaje) return codigo;
    return i18n.language === "ca" ? mensaje.ca : mensaje.es;
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString(i18n.language === "ca" ? "ca-ES" : "es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t("gestion.listado")}</h1>
          <p className="text-gray-500">{t("gestion.subtitle", "Gestiona los fichajes de entrada y salida")}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/rrhh/fichajes/resumen"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t("gestion.resumen")}
          </Link>
          <button
            onClick={openCrearModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t("gestion.acciones.crearManual")}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("gestion.filtros.fechaDesde")}
            </label>
            <input
              type="date"
              value={filtros.fechaDesde || ""}
              onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("gestion.filtros.fechaHasta")}
            </label>
            <input
              type="date"
              value={filtros.fechaHasta || ""}
              onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("gestion.filtros.usuario")}
            </label>
            <select
              value={filtros.idUsuario || ""}
              onChange={(e) => setFiltros({ ...filtros, idUsuario: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t("gestion.filtros.todos")}</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("gestion.filtros.tipo")}
            </label>
            <select
              value={filtros.tipo || ""}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as "ENTRADA" | "SALIDA" | undefined || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t("gestion.filtros.todos")}</option>
              <option value="ENTRADA">{t("entrada")}</option>
              <option value="SALIDA">{t("salida")}</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.soloConAdvertencias || false}
                onChange={(e) => setFiltros({ ...filtros, soloConAdvertencias: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{t("gestion.filtros.soloAdvertencias")}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fichajes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t("gestion.noFichajes", "No hay fichajes para mostrar")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.usuario")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.fecha")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.hora")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.tipo")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.advertencias")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    {t("gestion.tabla.acciones")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fichajes.map((f) => (
                  <tr key={f.id} className={`hover:bg-gray-50 ${f.es_correccion ? "bg-yellow-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800">{f.nombre_usuario}</p>
                        <p className="text-xs text-gray-500">{f.username}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatFecha(f.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-lg text-gray-800">{f.hora}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        f.tipo === "ENTRADA"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }`}>
                        {f.tipo === "ENTRADA" ? (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                          </svg>
                        )}
                        {f.tipo === "ENTRADA" ? t("entrada") : t("salida")}
                      </span>
                      {f.es_correccion && (
                        <span className="ml-2 text-xs text-yellow-600" title={f.motivo_correccion || ""}>
                          ({t("gestion.tabla.correccion")})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {f.advertencias && f.advertencias.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {f.advertencias.map((adv, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800"
                              title={getAdvertenciaTexto(adv)}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              {adv.split("_")[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openCorregirModal(f)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={t("gestion.acciones.editar")}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEliminar(f)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={t("gestion.acciones.eliminar")}
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
        )}
      </div>

      {/* Modal */}
      {modalMode && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {modalMode === "corregir"
                      ? t("gestion.modal.corregirTitulo")
                      : t("gestion.modal.crearTitulo")
                    }
                  </h2>
                  <button onClick={closeModal} className="text-white/80 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {formError}
                  </div>
                )}

                {modalMode === "crear" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("gestion.filtros.usuario")}
                    </label>
                    <select
                      value={formData.idUsuario}
                      onChange={(e) => setFormData({ ...formData, idUsuario: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {modalMode === "crear" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("gestion.tabla.fecha")}
                    </label>
                    <input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("gestion.modal.hora")}
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("gestion.modal.tipo")}
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as "ENTRADA" | "SALIDA" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ENTRADA">{t("entrada")}</option>
                    <option value="SALIDA">{t("salida")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("gestion.modal.motivo")}
                  </label>
                  <textarea
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder={t("gestion.modal.motivoPlaceholder")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {t("gestion.modal.cancelar")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      t("gestion.modal.guardar")
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
