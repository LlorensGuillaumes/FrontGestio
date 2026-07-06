// app/routes/configuracion/aeat/index.tsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchVeriFactuConfig,
  updateVeriFactuConfig,
  fetchVeriFactuLogs,
  reintentarEnvio,
  testConexionAEAT,
  type VeriFactuConfig,
  type VeriFactuLog,
} from "~/lib/verifactuRest";

type EstadoEnvio = "PENDIENTE" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "ERROR";

const estadoColors: Record<EstadoEnvio, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  ACEPTADO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
  ERROR: "bg-red-100 text-red-800",
};

export default function ConfiguracionAEAT() {
  const { t } = useTranslation(["configuracion", "common"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<VeriFactuConfig>({
    modoActivo: false,
    envioAutomatico: false,
    ambienteAEAT: "PRUEBAS",
    certificadoNombre: null,
    certificadoExpiracion: null,
    nombreSIF: "OpticaGest",
    versionSIF: "1.0",
    fechaModificacion: null,
  });

  const [logs, setLogs] = useState<VeriFactuLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [paginaLog, setPaginaLog] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<"" | "FACTURA_VENTA" | "FACTURA_COMPRA">("");
  const [filtroEstado, setFiltroEstado] = useState<"" | EstadoEnvio>("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [reintentando, setReintentando] = useState<number | null>(null);

  // Cargar configuracion inicial
  useEffect(() => {
    fetchVeriFactuConfig()
      .then(setConfig)
      .catch((e) => setError(e?.message ?? t("configuracion:aeat.errors.loadingConfig")))
      .finally(() => setLoading(false));
  }, []);

  // Cargar logs
  useEffect(() => {
    loadLogs();
  }, [paginaLog, filtroTipo, filtroEstado]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const result = await fetchVeriFactuLogs({
        pagina: paginaLog,
        porPagina: 10,
        tipoDocumento: filtroTipo || undefined,
        estadoEnvio: filtroEstado || undefined,
      });
      setLogs(result.logs);
      setTotalLogs(result.total);
    } catch (e: any) {
      console.error("Error cargando logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleConfigChange = (field: keyof VeriFactuConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateVeriFactuConfig(config);
      setConfig(updated);
      setSuccess(t("configuracion:aeat.messages.saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("configuracion:aeat.errors.saving"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConexion = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await testConexionAEAT();
      if (result.success) {
        setSuccess(result.mensaje);
      } else {
        setError(result.mensaje);
      }
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? e?.message ?? t("configuracion:aeat.errors.connectionTest"));
    } finally {
      setTesting(false);
    }
  };

  const handleReintentar = async (idLog: number) => {
    setReintentando(idLog);
    try {
      const result = await reintentarEnvio(idLog);
      if (result.success) {
        setSuccess(t("configuracion:aeat.messages.resendSuccess"));
      } else {
        setError(result.error || result.mensaje || t("configuracion:aeat.errors.resend"));
      }
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      loadLogs();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("configuracion:aeat.errors.retrying"));
    } finally {
      setReintentando(null);
    }
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500">{t("configuracion:aeat.loading")}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo */}
      <div className="flex-shrink-0 p-6 pb-4 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t("configuracion:aeat.title")}</h2>
            <p className="text-slate-500 text-sm">
              {t("configuracion:aeat.subtitle")}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? t("configuracion:aeat.saving") : t("configuracion:aeat.saveChanges")}
          </button>
        </div>

        {/* Mensajes de estado */}
        {(error || success) && (
          <div className="max-w-5xl mx-auto mt-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
                {success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Configuracion principal */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            {/* Estado VeriFactu */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                {t("configuracion:aeat.sections.verifactuStatus")}
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.modoActivo}
                    onChange={(e) => handleConfigChange("modoActivo", e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-700">{t("configuracion:aeat.activateVerifactu")}</span>
                    <p className="text-xs text-slate-500">
                      {t("configuracion:aeat.activateVerifactuHelp")}
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.envioAutomatico}
                    onChange={(e) => handleConfigChange("envioAutomatico", e.target.checked)}
                    disabled={!config.modoActivo}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div>
                    <span className={`font-medium ${config.modoActivo ? "text-slate-700" : "text-slate-400"}`}>
                      {t("configuracion:aeat.autoSend")}
                    </span>
                    <p className="text-xs text-slate-500">
                      {t("configuracion:aeat.autoSendHelp")}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Entorno AEAT */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                {t("configuracion:aeat.sections.aeatEnvironment")}
              </h3>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ambiente"
                    value="PRUEBAS"
                    checked={config.ambienteAEAT === "PRUEBAS"}
                    onChange={() => handleConfigChange("ambienteAEAT", "PRUEBAS")}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">{t("configuracion:aeat.testing")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ambiente"
                    value="PRODUCCION"
                    checked={config.ambienteAEAT === "PRODUCCION"}
                    onChange={() => handleConfigChange("ambienteAEAT", "PRODUCCION")}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">{t("configuracion:aeat.production")}</span>
                </label>
                <button
                  onClick={handleTestConexion}
                  disabled={testing || !config.modoActivo}
                  className="ml-4 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium disabled:opacity-50"
                >
                  {testing ? t("configuracion:aeat.testingConnection") : t("configuracion:aeat.testConnection")}
                </button>
              </div>
              {config.ambienteAEAT === "PRODUCCION" && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  {t("configuracion:aeat.productionWarning")}
                </p>
              )}
            </div>

            {/* Certificado Digital */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                {t("configuracion:aeat.sections.digitalCertificate")}
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg">
                {config.certificadoNombre ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">{config.certificadoNombre}</p>
                      <p className="text-sm text-slate-500">
                        {t("configuracion:aeat.expires")}: {config.certificadoExpiracion ? formatFecha(config.certificadoExpiracion) : t("configuracion:aeat.noDate")}
                      </p>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm">
                      {t("configuracion:aeat.changeCertificate")}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-500 mb-3">{t("configuracion:aeat.noCertificate")}</p>
                    <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
                      {t("configuracion:aeat.uploadCertificate")}
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                      {t("configuracion:aeat.certificateHelp")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info SIF */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                {t("configuracion:aeat.sections.sif")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {t("configuracion:aeat.sifName")}
                  </label>
                  <input
                    type="text"
                    value={config.nombreSIF}
                    onChange={(e) => handleConfigChange("nombreSIF", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {t("configuracion:aeat.sifVersion")}
                  </label>
                  <input
                    type="text"
                    value={config.versionSIF}
                    onChange={(e) => handleConfigChange("versionSIF", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Registro de Comunicaciones */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">
                {t("configuracion:aeat.communicationsLog")}
              </h3>
              <button
                onClick={loadLogs}
                disabled={loadingLogs}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t("configuracion:aeat.refresh")}
              </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 mb-4">
              <select
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value as any);
                  setPaginaLog(1);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">{t("configuracion:aeat.filters.allTypes")}</option>
                <option value="FACTURA_VENTA">{t("configuracion:aeat.filters.salesInvoices")}</option>
                <option value="FACTURA_COMPRA">{t("configuracion:aeat.filters.purchaseInvoices")}</option>
              </select>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value as any);
                  setPaginaLog(1);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">{t("configuracion:aeat.filters.allStatuses")}</option>
                <option value="PENDIENTE">{t("configuracion:aeat.status.pending")}</option>
                <option value="ACEPTADO">{t("configuracion:aeat.status.accepted")}</option>
                <option value="RECHAZADO">{t("configuracion:aeat.status.rejected")}</option>
                <option value="ERROR">{t("configuracion:aeat.status.error")}</option>
              </select>
            </div>

            {/* Tabla de logs */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.date")}</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.invoice")}</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.type")}</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.status")}</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.csv")}</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.message")}</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-600">{t("configuracion:aeat.table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        {t("configuracion:aeat.loading")}
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        {t("configuracion:aeat.noRecords")}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 text-slate-600">
                          {formatFecha(log.fechaCreacion)}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-medium text-slate-800">
                            {log.serieFactura ? `${log.serieFactura}-` : ""}
                            {log.numeroFactura}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          {log.tipoDocumento === "FACTURA_VENTA" ? t("configuracion:aeat.sale") : t("configuracion:aeat.purchase")}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              estadoColors[log.estadoEnvio as EstadoEnvio] || "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {log.estadoEnvio}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-600 font-mono text-xs">
                          {log.csvRespuesta || "-"}
                        </td>
                        <td className="py-3 px-2 text-slate-600 max-w-xs truncate" title={log.mensajeRespuestaAEAT || log.ultimoError || ""}>
                          {log.mensajeRespuestaAEAT || log.ultimoError || "-"}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {(log.estadoEnvio === "ERROR" || log.estadoEnvio === "RECHAZADO") && (
                            <button
                              onClick={() => handleReintentar(log.id)}
                              disabled={reintentando === log.id}
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium disabled:opacity-50"
                            >
                              {reintentando === log.id ? t("configuracion:aeat.retrying") : t("configuracion:aeat.retry")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginacion */}
            {totalLogs > 10 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <span className="text-sm text-slate-500">
                  {t("configuracion:aeat.showing", { shown: logs.length, total: totalLogs })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaginaLog((p) => Math.max(1, p - 1))}
                    disabled={paginaLog === 1}
                    className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-50"
                  >
                    {t("configuracion:aeat.previous")}
                  </button>
                  <button
                    onClick={() => setPaginaLog((p) => p + 1)}
                    disabled={paginaLog * 10 >= totalLogs}
                    className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-50"
                  >
                    {t("configuracion:aeat.next")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
