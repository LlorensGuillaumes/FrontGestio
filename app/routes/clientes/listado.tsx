import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import DataTable, { type ColumnDef } from "~/components/DataTable";
import FilterBar, { type FilterField } from "~/components/filtro";
import NestedSubtable from "~/components/NestedSubtable";
import type { ClientesOutletContext } from "./layout";
import { useAuth } from "~/contexts/AuthContext";

import {
  fetchClientesFullPage,
  fetchClienteDocumentos,
  fetchClienteFacturas,
  fetchClienteRevisiones,
} from "../../lib/clientesListadoRest";
import { deleteRevision } from "../../lib/revisionesRest";

// Columna "Acciones" del listado de clientes (oculta a petición).
// La fila es clicable para abrir la ficha; pon true para volver a mostrarla.
const SHOW_CLIENTE_ACCIONES = false;

// Normaliza fecha D/M/YYYY o DD/MM/YYYY a DD/MM/YYYY
function normalizeDMY(value: string): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
}






type Cliente = {
  id: string;
  tipo_cliente: string; // 'P' / 'E'...
  documento_fiscal: string | null;
  nombre_comercial: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  poblacion: string | null;
  pais: string | null;
  es_cliente_factura_simplificada: boolean;
  activo: boolean;

  // lo que te llega del endpoint
  telefono_principal?: string | null;
  telefono?: string | null;
  nombreCompleto?: string | null;
};

type Panel = "facturas" | "revisiones" | "documentos";

type PanelState = {
  loading: boolean;
  error: string | null;
  rows: any[];
};

type PanelCache = Record<string, Partial<Record<Panel, PanelState>>>;

export default function ClientesListado() {
  const { t } = useTranslation("clientes");
  const { config } = useAuth();

  // Verificar si el módulo de óptica está habilitado
  const showOpticaModule = config?.mostrarModuloOptica ?? false;

  console.log("CHECK COMPONENTS", {
  DataTable,
  FilterBar,
  NestedSubtable,
});


  const { openClienteModal, openRevisionModal, openDocumentoModal, refreshToken } =
    useOutletContext<ClientesOutletContext>();

  const [searchParams] = useSearchParams();

  // filtros por URL
  const nombreQ = (searchParams.get("nombre") ?? "").trim().toLowerCase();
  const nifQ = (searchParams.get("nif") ?? "").trim().toLowerCase();
  const emailQ = (searchParams.get("email") ?? "").trim().toLowerCase();
  const telQ = (searchParams.get("telefono") ?? "").trim().toLowerCase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<Cliente[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // paginación REST (offset)
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // qué panel está abierto por cliente
  const [expanded, setExpanded] = useState<Record<string, Panel | undefined>>({});

  // cache subgrids
  const [panelCache, setPanelCache] = useState<PanelCache>({});

  const anyFilter =
    Boolean(nombreQ) || Boolean(nifQ) || Boolean(emailQ) || Boolean(telQ);

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        name: "nombre",
        label: t("filters.name"),
        type: "text",
        colSpan: 3,
        placeholder: t("filters.namePlaceholder"),
      },
      { name: "nif", label: t("filters.nif"), type: "text", colSpan: 2, placeholder: t("filters.nifPlaceholder") },
      { name: "email", label: t("filters.email"), type: "text", colSpan: 2, placeholder: t("filters.emailPlaceholder") },
      { name: "telefono", label: t("filters.phone"), type: "text", colSpan: 1, placeholder: t("filters.phonePlaceholder") },
    ],
    [t]
  );

  const setPanelState = (id: string, panel: Panel, next: PanelState) => {
    setPanelCache((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        [panel]: next,
      },
    }));
  };

  const buildQ = () => (nombreQ || nifQ || emailQ || "").trim();

  const loadFirstPage = async () => {
    setLoading(true);
    setError(null);

    try {
      const q = buildQ();

      const data = await fetchClientesFullPage({
        q: q || null,
        take: 50,
        offset: 0,
        soloActivos: true,
      });

      const nodes: Cliente[] = data?.rows ?? [];
      const total = Number(data?.totalCount ?? nodes.length);

      setRows(nodes);
      setTotalCount(total);

      const nextOffset = nodes.length;
      setOffset(nextOffset);
      setHasMore(nextOffset < total);

      setExpanded({});
      setPanelCache({});
    } catch (e: any) {
      setError(e.message ?? "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const q = buildQ();

      const data = await fetchClientesFullPage({
        q: q || null,
        take: 50,
        offset,
        soloActivos: true,
      });

      const nodes: Cliente[] = data?.rows ?? [];
      const total = Number(data?.totalCount ?? totalCount);

      setRows((prev) => [...prev, ...nodes]);
      setTotalCount(total);

      const nextOffset = offset + nodes.length;
      setOffset(nextOffset);
      setHasMore(nextOffset < total);
    } catch (e: any) {
      setError(e.message ?? "Error cargando más clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombreQ, nifQ, emailQ, telQ, refreshToken]);

  // ✅ filtro extra por teléfono (ahora con telefono_principal / telefono)
  const clientesFiltrados = useMemo(() => {
    if (!telQ) return rows;

    return rows.filter((c) => {
      const tel = String(c.telefono_principal ?? c.telefono ?? "")
        .trim()
        .toLowerCase();
      return tel.includes(telQ);
    });
  }, [rows, telQ]);

  const ensurePanelLoaded = async (id: string, panel: Panel) => {
    const existing = panelCache[id]?.[panel];
    if (existing?.loading) return;
    if (existing?.rows?.length) return;

    setPanelState(id, panel, { loading: true, error: null, rows: [] });

    try {
      if (panel === "facturas") {
        const rows = await fetchClienteFacturas(id);
        setPanelState(id, panel, { loading: false, error: null, rows });
      } else if (panel === "revisiones") {
        const rows = await fetchClienteRevisiones(id);
        setPanelState(id, panel, { loading: false, error: null, rows });
      } else {
        const rows = await fetchClienteDocumentos(id);
        setPanelState(id, panel, { loading: false, error: null, rows: rows ?? [] });
      }
    } catch (e: any) {
      setPanelState(id, panel, {
        loading: false,
        error: e.message ?? "Error cargando subgrid",
        rows: [],
      });
    }
  };

  const togglePanel = async (id: string, panel: Panel) => {
    setExpanded((prev) => {
      const cur = prev[id];
      if (cur === panel) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: panel };
    });

    await ensurePanelLoaded(id, panel);
  };

  // ✅ Recargar paneles expandidos cuando cambia refreshToken (después de guardar)
  useEffect(() => {
    if (refreshToken === 0) return; // Skip initial
    // Limpiar cache para forzar recarga
    setPanelCache({});
    // Recargar los paneles que estén expandidos
    Object.entries(expanded).forEach(([id, panel]) => {
      if (panel) {
        ensurePanelLoaded(id, panel);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // --- Columnas de facturas/docs (placeholder) ---
  const facturasColumns = useMemo<ColumnDef<any>[]>(
    () => [
      { header: "ID", render: (r) => <span className="text-sm">{r.id ?? "—"}</span> },
      { header: t("common:fields.date", { ns: "common" }), render: (r) => <span className="text-sm">{r.fecha ?? "—"}</span> },
      { header: t("common:fields.status", { ns: "common" }), render: (r) => <span className="text-sm">{r.estado ?? "—"}</span> },
      {
        header: t("common:fields.total", { ns: "common" }),
        headerAlign: "right",
        cellAlign: "right",
        render: (r) => <span className="text-sm">{r.total ?? "—"}</span>,
      },
    ],
    [t]
  );

  const documentosColumnsFactory = (cliente: Cliente) => {
    const cols: ColumnDef<any>[] = [
      {
        header: t("ventas:documents.number", { ns: "ventas" }),
        render: (r) => <span className="text-sm font-mono">{r.NumeroDocumento ?? "—"}</span>,
      },
      {
        header: t("common:fields.date", { ns: "common" }),
        render: (r) => {
          const fecha = r.Fecha ? new Date(r.Fecha).toLocaleDateString("es-ES") : "—";
          return <span className="text-sm">{fecha}</span>;
        },
      },
      {
        header: t("common:fields.type", { ns: "common" }),
        render: (r) => (
          <span className={`text-xs px-2 py-1 rounded-full ${
            r.Tipo === "ENCARGO" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}>
            {r.Tipo ?? "—"}
          </span>
        ),
      },
      {
        header: t("common:fields.status", { ns: "common" }),
        render: (r) => {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const fechaEntrega = r.FechaEntrega ? new Date(r.FechaEntrega) : null;
          const estaCaducado = r.Estado === "PENDIENTE" && fechaEntrega && fechaEntrega < hoy;

          if (estaCaducado) {
            return (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                {t("common:statuses.expired", { ns: "common" })}
              </span>
            );
          }

          const estadoColors: Record<string, string> = {
            PENDIENTE: "bg-yellow-100 text-yellow-700",
            CONFIRMADO: "bg-blue-100 text-blue-700",
            EN_PROCESO: "bg-purple-100 text-purple-700",
            LISTO: "bg-green-100 text-green-700",
            ENTREGADO: "bg-emerald-100 text-emerald-700",
          };
          return (
            <span className={`text-xs px-2 py-1 rounded-full ${estadoColors[r.Estado] ?? "bg-slate-100 text-slate-700"}`}>
              {r.Estado ?? "—"}
            </span>
          );
        },
      },
      {
        header: t("common:fields.total", { ns: "common" }),
        headerAlign: "right",
        cellAlign: "right",
        render: (r) => (
          <span className="text-sm font-medium">
            {r.Total != null ? `${Number(r.Total).toFixed(2)} €` : "—"}
          </span>
        ),
      },
      {
        header: "",
        headerAlign: "right",
        cellAlign: "right",
        render: (r) => (
          <button
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            title={t("common:buttons.edit", { ns: "common" })}
            onClick={(e) => {
              e.stopPropagation();
              openDocumentoModal("view", {
                id: String(r.id),
                idCliente: String(cliente.id),
                nombreCliente: cliente.nombreCompleto ?? "",
              });
            }}
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        ),
      },
    ];
    return cols;
  };

  const renderExpandedRow = (c: Cliente) => {
    const panel = expanded[String(c.id)];
    if (!panel) return null;

    const title =
      panel === "facturas"
        ? t("panels.invoices")
        : panel === "revisiones"
          ? t("panels.revisions")
          : t("panels.documents");

    const state = panelCache[String(c.id)]?.[panel] ?? {
      loading: true,
      error: null,
      rows: [],
    };

    const actionLabel =
      panel === "facturas"
        ? t("panels.newInvoice")
        : panel === "revisiones"
          ? t("panels.newRevision")
          : t("panels.newDocument");

    const onAction = () => {
      console.log("onAction called, panel:", panel, "cliente:", c.id);
      if (panel === "revisiones") {
        openRevisionModal("new", { idCliente: String(c.id), nombreCliente: c.nombreCompleto ?? c.nombre_comercial ?? "" });
        return;
      }
      if (panel === "facturas") {
        console.log("TODO: abrir modal nueva factura para cliente", c.id);
        return;
      }
      // Presupuesto/Encargo
      console.log("Opening documento modal for cliente:", c.id);
      openDocumentoModal("new", {
        idCliente: String(c.id),
        nombreCliente: c.nombreCompleto ?? "",
      });
    };

    const handleDeleteRevision = async (revisionId: string, clienteId: string) => {
      const confirmed = window.confirm(`${t("common:messages.confirmDelete", { ns: "common" })} ${t("common:messages.confirmDeleteDetail", { ns: "common" })}`);
      if (!confirmed) return;

      try {
        await deleteRevision(revisionId);
        // Recargar el panel de revisiones
        setPanelState(clienteId, "revisiones", { loading: true, error: null, rows: [] });
        const rows = await fetchClienteRevisiones(clienteId);
        setPanelState(clienteId, "revisiones", { loading: false, error: null, rows });
      } catch (err: any) {
        alert(err.message ?? t("listado.errorDeletingRevision"));
      }
    };

    const revisionesColumnsInline: ColumnDef<any>[] = [
      { header: t("ventas:revisions.date", { ns: "ventas" }), render: (r) => <span className="text-sm">{normalizeDMY(r.fecha) || "—"}</span> },
      { header: t("ventas:revisions.professional", { ns: "ventas" }), render: (r) => <span className="text-sm">{r.profesional ?? "—"}</span> },
      {
        header: t("ventas:revisions.reason", { ns: "ventas" }),
        render: (r) => (
          <span className="text-sm">
            {((r.motivoConsulta ?? r.observaciones ?? "—") as string).slice(0, 80)}
          </span>
        ),
      },
      {
        header: "",
        headerAlign: "right",
        cellAlign: "right",
        render: (r) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              title={t("common:buttons.edit", { ns: "common" })}
              onClick={(e) => {
                e.stopPropagation();
                openRevisionModal("view", { id: String(r.id), idCliente: String(c.id), nombreCliente: c.nombreCompleto ?? c.nombre_comercial ?? "" });
              }}
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              title={t("common:buttons.delete", { ns: "common" })}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteRevision(String(r.id), String(c.id));
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ),
      },
    ];

    const columns =
      panel === "facturas"
        ? facturasColumns
        : panel === "revisiones"
          ? revisionesColumnsInline
          : documentosColumnsFactory(c);

    return (
      <div className="space-y-3">
        {state.error ? (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
            {state.error}
          </div>
        ) : null}

        <NestedSubtable<any, any>
          title={title}
          data={state.rows}
          columns={columns}
          getRowKey={(r) => r.id}
          emptyText={state.loading ? t("common:messages.loading", { ns: "common" }) : t("common:messages.noRecords", { ns: "common" })}
          wrapperClassName="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          actionLabel={actionLabel}
          onAction={onAction}
          actionDisabled={state.loading}
        />
      </div>
    );
  };

  const columns = useMemo<ColumnDef<Cliente>[]>(() => {
    return [
      {
        header: t("columns.client"),
        render: (c) => {
          const isPersona = c.tipo_cliente === "P";
          const titulo =
            (c.nombreCompleto ?? "").trim() ||
            (c.nombre_comercial ?? "").trim() ||
            "—";

          return (
            <div className="min-w-72">
              <div className="font-medium text-slate-900">{titulo}</div>
              <div className="text-xs text-slate-400">
                {c.documento_fiscal ?? "—"} · {isPersona ? t("common:person.person", { ns: "common" }) : t("common:person.company", { ns: "common" })}
                {c.es_cliente_factura_simplificada ? ` · ${t("info.simplified")}` : ""}
              </div>
            </div>
          );
        },
      },
      {
        header: t("columns.address"),
        render: (c) => (
          <div className="min-w-72 text-sm text-slate-700">
            <div>{c.direccion ?? "—"}</div>
            <div className="text-xs text-slate-400">
              {[c.codigo_postal, c.poblacion, c.pais].filter(Boolean).join(" · ") || ""}
            </div>
          </div>
        ),
      },
      {
        header: t("columns.phones"),
        render: (c) => {
          const tel = c.telefono_principal ?? c.telefono ?? null;

          return (
            <div className="min-w-56 text-sm text-slate-700 space-y-1">
              {tel ? (
                <div className="flex items-center gap-2">
                  <span>{tel}</span>
                  <span className="text-xs text-blue-600">{t("common:fields.main", { ns: "common" })}</span>
                </div>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          );
        },
      },
      ...(SHOW_CLIENTE_ACCIONES ? [{
        header: t("columns.actions"),
        headerAlign: "right" as const,
        cellAlign: "right" as const,
        render: (c: Cliente) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openClienteModal("view", String(c.id))}
              title={t("tooltips.viewFile")}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {showOpticaModule && (
              <button
                type="button"
                onClick={() => togglePanel(String(c.id), "revisiones")}
                title={t("tooltips.revisions")}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => togglePanel(String(c.id), "documentos")}
              title={t("tooltips.documents")}
              className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => togglePanel(String(c.id), "facturas")}
              title={t("tooltips.invoices")}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </button>
          </div>
        ),
      }] : []),
    ];
  }, [openClienteModal, t, showOpticaModule]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">
            {loading ? t("common:messages.loading", { ns: "common" }) : t("subtitle", { count: totalCount })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openClienteModal("new")}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
        >
          + {t("newClient")}
        </button>
      </div>

      <FilterBar
        fields={filterFields}
        mdCols={8}
        preserveParams={["modal", "mode", "id", "idCliente"]}
      />

      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      ) : null}

      <DataTable<Cliente>
        columns={columns}
        data={clientesFiltrados}
        getRowKey={(c) => c.id}
        emptyText={anyFilter ? t("empty.noClientsFiltered") : t("empty.noClients")}
        onRowClick={(c) => openClienteModal("view", String(c.id))}
        showExpandColumn={false}
        isRowExpanded={(row) => Boolean(expanded[String((row as any).id)])}
        onToggleExpand={() => { }}
        renderExpandedRow={(row) => renderExpandedRow(row as any)}
      />

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm disabled:opacity-50"
          >
            {loading ? t("common:messages.loading", { ns: "common" }) : t("common:buttons.loadMore", { ns: "common" })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
