// app/routes/configuracion/bases-datos.tsx
import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";
import { api } from "~/lib/api";
import { PasswordInput } from "~/components/PasswordInput";

interface BaseDatos {
  id: number;
  nombre: string;
  db_name: string;
  db_host: string;
  db_port: number;
  serie_facturacion: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

interface SchemaDifference {
  type: 'missing_table' | 'missing_column' | 'missing_index';
  tableName: string;
  columnName?: string;
  indexName?: string;
  sql: string;
}

interface SchemaAnalysisResult {
  database: string;
  differences: SchemaDifference[];
  applied: boolean;
  errors: string[];
}

interface SchemaAnalysisSummary {
  totalDatabases: number;
  databasesWithDifferences: number;
  totalDifferences: number;
  byType: {
    missing_table: number;
    missing_column: number;
    missing_index: number;
  };
}

export default function ConfiguracionBasesDatos() {
  const { t } = useTranslation(["configuracion", "common"]);
  const { isMaster, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [databases, setDatabases] = useState<BaseDatos[]>([]);
  const [postgresDbs, setPostgresDbs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mostrar inactivas
  const [showInactive, setShowInactive] = useState(false);

  // Estado para edicion
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "" });

  // Estado para crear nueva DB
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ suffix: "", nombre: "" });
  const [creating, setCreating] = useState(false);

  // Estado para eliminar DB
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BaseDatos | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Estado para sincronizacion de DBs
  const [syncing, setSyncing] = useState(false);

  // Estado para la vista activa
  const [activeTab, setActiveTab] = useState<'databases' | 'schemas'>('databases');

  // Estado para sincronización de esquemas
  const [schemaAnalysis, setSchemaAnalysis] = useState<SchemaAnalysisResult[] | null>(null);
  const [schemaSummary, setSchemaSummary] = useState<SchemaAnalysisSummary | null>(null);
  const [analyzingSchemas, setAnalyzingSchemas] = useState(false);
  const [syncingSchemas, setSyncingSchemas] = useState(false);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dbResponse, pgResponse] = await Promise.all([
        api.get("/admin/bases-datos"),
        api.get("/admin/postgres-databases"),
      ]);
      setDatabases(dbResponse.data.databases || []);
      setPostgresDbs(pgResponse.data.databases || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.loadingData"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isMaster) {
      fetchData();
    }
  }, [authLoading, isMaster, fetchData]);

  // Esperar a que se cargue la autenticacion
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500">{t("configuracion:basesDatos.loading")}</div>
      </div>
    );
  }

  // Redirigir si no es Master
  if (!isMaster) {
    return <Navigate to="/home" replace />;
  }

  // Filtrar bases de datos segun el estado del checkbox
  const filteredDatabases = showInactive
    ? databases
    : databases.filter((db) => db.activa);

  const inactiveCount = databases.filter((db) => !db.activa).length;

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post<{ added: string[]; existing: string[] }>("/admin/bases-datos/sync");
      const result = response.data;
      if (result.added.length > 0) {
        setSuccess(t("databases.messages.newDbsDetected"));
      } else {
        setSuccess(t("databases.messages.noNewDbs"));
      }
      await fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.sync"));
    } finally {
      setSyncing(false);
    }
  };

  const handleEdit = (db: BaseDatos) => {
    setEditingId(db.id);
    setEditForm({ nombre: db.nombre });
  };

  const handleSaveEdit = async (db: BaseDatos) => {
    setError(null);
    try {
      await api.put(`/admin/bases-datos/${db.id}`, {
        nombre: editForm.nombre,
      });
      setEditingId(null);
      setSuccess(t("databases.messages.dbUpdated"));
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.update"));
    }
  };

  const handleToggleActive = async (db: BaseDatos) => {
    setError(null);
    try {
      await api.put(`/admin/bases-datos/${db.id}`, {
        activa: !db.activa,
      });
      setSuccess(db.activa ? t("databases.messages.dbDeactivated") : t("databases.messages.dbReactivated"));
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.changeStatus"));
    }
  };

  const handleCreateDatabase = async () => {
    if (!createForm.suffix || !createForm.nombre) {
      setError(t("configuracion:basesDatos.errors.suffixNameRequired"));
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await api.post("/admin/bases-datos/crear-desde-plantilla", {
        suffix: createForm.suffix,
        nombre: createForm.nombre,
      });
      setSuccess(t("databases.messages.dbCreated"));
      setShowCreateModal(false);
      setCreateForm({ suffix: "", nombre: "" });
      await fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.create"));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDeleteModal = (db: BaseDatos) => {
    setDeleteTarget(db);
    setDeletePassword("");
    setShowDeleteModal(true);
  };

  // Funciones para sincronización de esquemas
  const handleAnalyzeSchemas = async () => {
    setAnalyzingSchemas(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.get<{
        results: SchemaAnalysisResult[];
        summary: SchemaAnalysisSummary;
      }>("/admin/schemas/analyze");
      setSchemaAnalysis(response.data.results);
      setSchemaSummary(response.data.summary);
      if (response.data.summary.totalDifferences === 0) {
        setSuccess(t("databases.schemas.allSynced"));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.analyzeSchemas"));
    } finally {
      setAnalyzingSchemas(false);
    }
  };

  const handleSyncAllSchemas = async () => {
    if (!schemaSummary || schemaSummary.totalDifferences === 0) return;

    setSyncingSchemas(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post<{
        message: string;
        analyzed: number;
        totalDifferences: number;
        applied: number;
        errors: string[];
      }>("/admin/schemas/sync");

      if (response.data.errors.length > 0) {
        setError(`${response.data.applied} ${t("databases.messages.changesApplied")} (${response.data.errors.length} ${t("configuracion:basesDatos.errors.errorsWord")})`);
      } else {
        setSuccess(`${t("databases.messages.syncCompleted")}: ${response.data.applied} ${t("databases.messages.changesApplied")}`);
      }

      // Reanalizar para actualizar la vista
      await handleAnalyzeSchemas();
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.syncSchemas"));
    } finally {
      setSyncingSchemas(false);
    }
  };

  const handleApplyToDatabase = async (dbName: string, differences: SchemaDifference[]) => {
    setError(null);
    try {
      await api.post(`/admin/schemas/apply/${dbName}`, { differences });
      setSuccess(`${t("databases.messages.appliedTo")} ${dbName}`);
      // Reanalizar
      await handleAnalyzeSchemas();
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.applyChanges"));
    }
  };

  const handleDeleteDatabase = async () => {
    if (!deleteTarget || !deletePassword) return;

    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/admin/bases-datos/${deleteTarget.id}/eliminar-completo`, {
        data: { masterPassword: deletePassword },
      });
      setSuccess(t("databases.messages.dbDeleted"));
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeletePassword("");
      await fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || t("configuracion:basesDatos.errors.delete"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500">{t("configuracion:basesDatos.loading")}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fijo */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        <div className="p-6 pb-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                {t("databases.title")}
                <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{t("databases.onlyMaster")}</span>
              </h2>
              <p className="text-slate-500 text-sm">
                {t("databases.subtitle")}
              </p>
            </div>
            {activeTab === 'databases' && (
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncing ? t("databases.syncing") : t("databases.detectDbs")}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t("databases.newDatabase")}
                </button>
              </div>
            )}
            {activeTab === 'schemas' && (
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyzeSchemas}
                  disabled={analyzingSchemas}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className={`w-4 h-4 ${analyzingSchemas ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {analyzingSchemas ? t("databases.schemas.analyzing") : t("databases.schemas.analyzeDifferences")}
                </button>
                {schemaSummary && schemaSummary.totalDifferences > 0 && (
                  <button
                    onClick={handleSyncAllSchemas}
                    disabled={syncingSchemas}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className={`w-4 h-4 ${syncingSchemas ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {syncingSchemas ? t("databases.schemas.syncingSchemas") : `${t("databases.schemas.syncAll")} (${schemaSummary.totalDifferences})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-4 -mb-px">
            <button
              onClick={() => setActiveTab('databases')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'databases'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t("databases.tabs.databases")}
            </button>
            <button
              onClick={() => setActiveTab('schemas')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schemas'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t("databases.tabs.schemas")}
              {schemaSummary && schemaSummary.totalDifferences > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {schemaSummary.totalDifferences}
                </span>
              )}
            </button>
          </nav>
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

          {/* ========== TAB: BASES DE DATOS ========== */}
          {activeTab === 'databases' && (
            <>
              {/* Info de PostgreSQL */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {t("databases.postgresInfo")}: <span className="font-bold">{postgresDbs.length}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {postgresDbs.join(", ") || t("databases.noneDetected")}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de bases de datos */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                {t("databases.registeredDatabases")} ({filteredDatabases.length})
                {inactiveCount > 0 && !showInactive && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({inactiveCount} {t("databases.inactiveHidden")})
                  </span>
                )}
              </h3>
              {inactiveCount > 0 && (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  {t("databases.showInactive")} ({inactiveCount})
                </label>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("databases.name")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("databases.dbName")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("databases.host")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("databases.invoiceSeries")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("databases.status")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("databases.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDatabases.map((db) => (
                    <tr
                      key={db.id}
                      className={!db.activa ? "bg-red-50/50" : ""}
                    >
                      <td className="px-4 py-3">
                        {editingId === db.id ? (
                          <input
                            type="text"
                            value={editForm.nombre}
                            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${db.activa ? "text-slate-900" : "text-slate-500"}`}>
                              {db.nombre}
                            </span>
                            {!db.activa && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                {t("configuracion:basesDatos.inactiveBadge")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className={`text-sm px-2 py-0.5 rounded ${db.activa ? "text-blue-600 bg-blue-50" : "text-slate-500 bg-slate-100"}`}>
                          {db.db_name}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {db.db_host}:{db.db_port}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono px-2 py-0.5 rounded ${db.activa ? "text-purple-600 bg-purple-50" : "text-slate-500 bg-slate-100"}`}>
                          {db.serie_facturacion || "F"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(db)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            db.activa
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          }`}
                          title={db.activa ? t("configuracion:basesDatos.titles.clickDeactivate") : t("configuracion:basesDatos.titles.clickReactivate")}
                        >
                          {db.activa ? (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {t("databases.active")}
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                              </svg>
                              {t("databases.reactivate")}
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {editingId === db.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(db)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title={t("configuracion:basesDatos.titles.save")}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                                title={t("configuracion:basesDatos.titles.cancel")}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(db)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title={t("configuracion:basesDatos.titles.editName")}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {db.db_name !== "gestio_db" && (
                                <button
                                  onClick={() => handleOpenDeleteModal(db)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title={t("configuracion:basesDatos.titles.deletePermanently")}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDatabases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        {showInactive ? t("databases.noDatabases") : t("databases.noActiveDatabases")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info adicional */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium">{t("databases.howItWorks")}:</p>
                <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                  <li><strong>{t("databases.detectDbs")}:</strong> {t("databases.helpDetect")}</li>
                  <li><strong>{t("databases.newDatabase")}:</strong> {t("databases.helpNew")}</li>
                  <li><strong>{t("databases.inactive")}:</strong> {t("databases.helpDeactivate")}</li>
                  <li><strong>{t("databases.deletePermantently")}:</strong> {t("databases.helpDelete")}</li>
                  <li><strong>{t("databases.invoiceSeries")}:</strong> {t("databases.helpSeries")}</li>
                </ul>
              </div>
            </div>
          </div>
            </>
          )}

          {/* ========== TAB: SINCRONIZAR ESQUEMAS ========== */}
          {activeTab === 'schemas' && (
            <>
              {/* Info sobre sincronización */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">{t("databases.schemas.title")}</p>
                    <p className="mt-1 text-xs">
                      {t("databases.schemas.description")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado inicial - sin analisis */}
              {!schemaAnalysis && !analyzingSchemas && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">{t("databases.schemas.analyzeDifferences")}</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {t("databases.schemas.analyzePrompt")}
                  </p>
                  <button
                    onClick={handleAnalyzeSchemas}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-sm font-medium"
                  >
                    {t("databases.schemas.analyzeDifferences")}
                  </button>
                </div>
              )}

              {/* Cargando */}
              {analyzingSchemas && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <svg className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <h3 className="text-lg font-medium text-slate-900">{t("databases.schemas.analyzingSchemas")}</h3>
                  <p className="text-sm text-slate-500">{t("databases.schemas.comparingStructure")}</p>
                </div>
              )}

              {/* Resumen */}
              {schemaSummary && !analyzingSchemas && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("databases.schemas.analysisSummary")}</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-900">{schemaSummary.totalDatabases}</p>
                      <p className="text-xs text-slate-500">{t("databases.schemas.analyzedDbs")}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${schemaSummary.totalDifferences > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                      <p className={`text-2xl font-bold ${schemaSummary.totalDifferences > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                        {schemaSummary.totalDifferences}
                      </p>
                      <p className={`text-xs ${schemaSummary.totalDifferences > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {t("databases.schemas.differences")}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-700">{schemaSummary.byType.missing_table}</p>
                      <p className="text-xs text-red-600">{t("databases.schemas.missingTables")}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-orange-700">{schemaSummary.byType.missing_column}</p>
                      <p className="text-xs text-orange-600">{t("databases.schemas.missingColumns")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de resultados por base de datos */}
              {schemaAnalysis && !analyzingSchemas && (
                <div className="space-y-3">
                  {schemaAnalysis.map((result) => (
                    <div
                      key={result.database}
                      className={`bg-white rounded-xl border overflow-hidden ${
                        result.differences.length > 0 ? 'border-amber-200' : 'border-green-200'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedDb(expandedDb === result.database ? null : result.database)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${result.differences.length > 0 ? 'bg-amber-500' : 'bg-green-500'}`} />
                          <code className="text-sm font-medium text-slate-900">{result.database}</code>
                          {result.differences.length > 0 ? (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                              {result.differences.length} {t("databases.schemas.differences").toLowerCase()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                              {t("databases.schemas.synchronized")}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${expandedDb === result.database ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {expandedDb === result.database && result.differences.length > 0 && (
                        <div className="border-t border-slate-200 p-4 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-slate-700">{t("databases.schemas.pendingChanges")}:</h4>
                            <button
                              onClick={() => handleApplyToDatabase(result.database, result.differences)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              {t("databases.schemas.applyToDb")}
                            </button>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {result.differences.map((diff, idx) => (
                              <div key={idx} className="p-2 bg-white rounded border border-slate-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                                    diff.type === 'missing_table'
                                      ? 'bg-red-100 text-red-700'
                                      : diff.type === 'missing_column'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {diff.type === 'missing_table' ? t("databases.schemas.table") :
                                     diff.type === 'missing_column' ? t("databases.schemas.column") : t("databases.schemas.index")}
                                  </span>
                                  <span className="text-sm font-medium text-slate-900">
                                    {diff.tableName}
                                    {diff.columnName && <span className="text-slate-500">.{diff.columnName}</span>}
                                    {diff.indexName && <span className="text-slate-500"> ({diff.indexName})</span>}
                                  </span>
                                </div>
                                <code className="block text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-x-auto">
                                  {diff.sql}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal para crear nueva DB */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{t("databases.createModal.title")}</h3>
              <p className="text-sm text-slate-500">{t("databases.createModal.subtitle")}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t("databases.createModal.suffix")} *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-mono">gestio_db</span>
                  <input
                    type="text"
                    value={createForm.suffix}
                    onChange={(e) => setCreateForm({ ...createForm, suffix: e.target.value.toLowerCase() })}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                    placeholder={t("databases.createModal.suffixPlaceholder")}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {t("databases.createModal.result")}: <code className="bg-slate-100 px-1 rounded">gestio_db{createForm.suffix || "xx"}</code>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t("databases.createModal.descriptiveName")} *
                </label>
                <input
                  type="text"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder={t("databases.createModal.namePlaceholder")}
                />
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-xs text-green-800">
                {t("databases.createModal.note")}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ suffix: "", nombre: "" });
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
              >
                {t("databases.cancel")}
              </button>
              <button
                onClick={handleCreateDatabase}
                disabled={creating || !createForm.suffix || !createForm.nombre}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("databases.createModal.creating")}
                  </>
                ) : (
                  t("databases.createModal.create")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para eliminar DB */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">{t("databases.deleteModal.title")}</h3>
                  <p className="text-sm text-red-700">{t("databases.deleteModal.subtitle")}</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-900 mb-2">
                  {t("databases.deleteModal.warning")}:
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded font-bold">
                    {deleteTarget.db_name}
                  </code>
                  <span className="text-sm text-red-700">({deleteTarget.nombre})</span>
                </div>
                <p className="text-xs text-red-800">
                  <strong>{t("databases.deleteModal.dataLoss")}:</strong>
                </p>
                <ul className="text-xs text-red-700 mt-1 list-disc list-inside space-y-0.5">
                  <li>{t("databases.deleteModal.dataList.clients")}</li>
                  <li>{t("databases.deleteModal.dataList.suppliers")}</li>
                  <li>{t("databases.deleteModal.dataList.products")}</li>
                  <li>{t("databases.deleteModal.dataList.salesInvoices")}</li>
                  <li>{t("databases.deleteModal.dataList.cashMovements")}</li>
                  <li>{t("databases.deleteModal.dataList.reviews")}</li>
                  <li>{t("databases.deleteModal.dataList.config")}</li>
                </ul>
              </div>

              <PasswordInput
                id="delete-confirm-password"
                label={`${t("databases.deleteModal.confirmPassword")}:`}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={t("databases.deleteModal.passwordPlaceholder")}
                autoComplete="off"
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                  setDeletePassword("");
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
              >
                {t("databases.cancel")}
              </button>
              <button
                onClick={handleDeleteDatabase}
                disabled={deleting || !deletePassword}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t("databases.deleteModal.deleting")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t("databases.deleteModal.delete")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
