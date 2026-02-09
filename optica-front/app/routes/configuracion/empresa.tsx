// app/routes/configuracion/empresa.tsx
import React, { useEffect, useState } from "react";
import { fetchDatosEmpresa, updateDatosEmpresa, type DatosEmpresa } from "~/lib/empresaRest";
import { useAuth } from "~/contexts/AuthContext";
import { api } from "~/lib/api";

export default function ConfiguracionEmpresa() {
  const { user, isMaster, currentDatabase, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estado para serie de facturación
  const [serieFacturacion, setSerieFacturacion] = useState("");
  const [savingSerie, setSavingSerie] = useState(false);
  const [serieSuccess, setSerieSuccess] = useState(false);

  const [form, setForm] = useState<Partial<DatosEmpresa>>({
    NombreEmpresa: "",
    NombreComercial: "",
    CIF: "",
    Direccion: "",
    CodigoPostal: "",
    Poblacion: "",
    Provincia: "",
    Pais: "España",
    Telefono: "",
    Email: "",
    Web: "",
    LogoUrl: "",
    PlazoConfirmacionDias: 30,
    TextoPieDocumento: "",
  });

  useEffect(() => {
    fetchDatosEmpresa()
      .then((data) => {
        setForm(data);
      })
      .catch((e) => {
        setError(e?.message ?? "Error cargando datos");
      })
      .finally(() => setLoading(false));

    // Cargar serie de facturación desde el contexto de auth
    const currentDb = user?.databases.find((db) => db.dbName === currentDatabase);
    if (currentDb) {
      setSerieFacturacion(currentDb.serieFacturacion || "F");
    }
  }, [user, currentDatabase]);

  // Obtener el ID de la base de datos actual
  const currentDbId = user?.databases.find((db) => db.dbName === currentDatabase)?.id;

  const handleSaveSerie = async () => {
    if (!currentDbId || !isMaster) return;

    setSavingSerie(true);
    setError(null);
    setSerieSuccess(false);

    try {
      await api.put(`/admin/bases-datos/${currentDbId}`, {
        serieFacturacion: serieFacturacion.toUpperCase(),
      });
      setSerieSuccess(true);
      // Refrescar el usuario para obtener la nueva serie
      await refreshUser();
      setTimeout(() => setSerieSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al guardar la serie");
    } finally {
      setSavingSerie(false);
    }
  };

  const handleChange = (field: keyof DatosEmpresa, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await updateDatosEmpresa(form);
      setForm(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo */}
      <div className="flex-shrink-0 p-6 pb-4 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Datos de la Empresa</h2>
            <p className="text-slate-500 text-sm">
              Configura los datos que aparecen en los documentos
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {/* Mensajes de estado */}
        {(error || success) && (
          <div className="max-w-4xl mx-auto mt-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
                Datos guardados correctamente
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            {/* Datos fiscales */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                Datos Fiscales
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Nombre Fiscal *
                  </label>
                  <input
                    type="text"
                    value={form.NombreEmpresa ?? ""}
                    onChange={(e) => handleChange("NombreEmpresa", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Razón social"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={form.NombreComercial ?? ""}
                    onChange={(e) => handleChange("NombreComercial", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nombre comercial"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    CIF / NIF
                  </label>
                  <input
                    type="text"
                    value={form.CIF ?? ""}
                    onChange={(e) => handleChange("CIF", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="B12345678"
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                Dirección
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={form.Direccion ?? ""}
                    onChange={(e) => handleChange("Direccion", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Calle, número, piso..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    C.P.
                  </label>
                  <input
                    type="text"
                    value={form.CodigoPostal ?? ""}
                    onChange={(e) => handleChange("CodigoPostal", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="28001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Población
                  </label>
                  <input
                    type="text"
                    value={form.Poblacion ?? ""}
                    onChange={(e) => handleChange("Poblacion", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Madrid"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={form.Provincia ?? ""}
                    onChange={(e) => handleChange("Provincia", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Madrid"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    value={form.Pais ?? ""}
                    onChange={(e) => handleChange("Pais", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="España"
                  />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                Contacto
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={form.Telefono ?? ""}
                    onChange={(e) => handleChange("Telefono", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="912345678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.Email ?? ""}
                    onChange={(e) => handleChange("Email", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="info@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Web
                  </label>
                  <input
                    type="text"
                    value={form.Web ?? ""}
                    onChange={(e) => handleChange("Web", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="www.empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Configuración documentos */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                Configuración de Documentos
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    URL del Logo
                  </label>
                  <input
                    type="text"
                    value={form.LogoUrl ?? ""}
                    onChange={(e) => handleChange("LogoUrl", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Plazo confirmación (días)
                  </label>
                  <input
                    type="number"
                    value={form.PlazoConfirmacionDias ?? 30}
                    onChange={(e) => handleChange("PlazoConfirmacionDias", Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Texto pie de documento
                  </label>
                  <textarea
                    value={form.TextoPieDocumento ?? ""}
                    onChange={(e) => handleChange("TextoPieDocumento", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Condiciones legales, forma de pago, etc."
                  />
                </div>
              </div>
            </div>

            {/* Preview logo */}
            {form.LogoUrl && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                  Vista previa del Logo
                </h3>
                <div className="p-4 bg-slate-50 rounded-lg inline-block">
                  <img
                    src={form.LogoUrl}
                    alt="Logo empresa"
                    className="max-h-16 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Serie de Facturación - Solo visible para Master */}
          {isMaster && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Serie de Facturacion
                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Solo Master</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Define la serie que se usara para numerar las facturas de esta tienda.
                    Cada tienda debe tener una serie unica para evitar conflictos de numeracion.
                  </p>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Serie
                  </label>
                  <input
                    type="text"
                    value={serieFacturacion}
                    onChange={(e) => setSerieFacturacion(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase"
                    placeholder="Ej: OC, SN, 01..."
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Las facturas tendran formato: {serieFacturacion || "F"}-0001, {serieFacturacion || "F"}-0002...
                  </p>
                </div>
                <button
                  onClick={handleSaveSerie}
                  disabled={savingSerie}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
                >
                  {savingSerie ? "Guardando..." : "Guardar serie"}
                </button>
              </div>

              {serieSuccess && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
                  Serie de facturacion actualizada correctamente
                </div>
              )}

              {/* Info adicional */}
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Importante:</p>
                    <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                      <li>Cada tienda debe tener una serie diferente para evitar duplicados</li>
                      <li>Una vez emitida una factura con una serie, no la cambies</li>
                      <li>Ejemplos: "OC" para Optica Central, "SN" para Sucursal Norte</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
