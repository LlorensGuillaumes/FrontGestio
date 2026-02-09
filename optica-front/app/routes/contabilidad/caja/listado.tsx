import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  fetchMovimientosCaja,
  fetchResumenCaja,
  fetchModosPago,
  createMovimientoCaja,
  deleteMovimientoCaja,
  type MovimientoCaja,
  type ResumenCaja,
  type ModoPago,
  type TicketVentaResult,
} from "~/lib/cajaRest";
import GridHeader from "~/components/gridHeader";
import PaginacionBar from "~/components/paginacionBar";
import DataTable, { type ColumnDef } from "~/components/DataTable";
import TicketCajaModal from "~/modales/ticketCajaModal";

// Fecha de hoy en formato YYYY-MM-DD
const hoy = () => new Date().toISOString().split("T")[0];

export default function ListadoCaja() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [modosPago, setModosPago] = useState<ModoPago[]>([]);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showRetiradaModal, setShowRetiradaModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ajuste, setAjuste] = useState({
    tipo: "positivo" as "positivo" | "negativo",
    concepto: "",
    importe: "",
    observaciones: "",
  });
  const [retirada, setRetirada] = useState({
    importe: "",
    concepto: "Retirada de efectivo",
    observaciones: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros de fecha actuales (o hoy por defecto)
  const desdeFecha = searchParams.get("desdeFecha") || hoy();
  const hastaFecha = searchParams.get("hastaFecha") || hoy();
  const tipoFiltro = searchParams.get("tipo") || "";
  const modoPagoFiltro = searchParams.get("idModoPago") || "";
  const pagina = Number(searchParams.get("pagina") || 1);

  // Cargar modos de pago una sola vez
  useEffect(() => {
    fetchModosPago()
      .then((res) => {
        setModosPago(res);
      })
      .catch(console.error);
  }, []);

  // Cargar movimientos cuando cambian los filtros
  const loadMovimientos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchMovimientosCaja({
        pagina,
        porPagina: 50,
        desdeFecha,
        hastaFecha,
        tipo: tipoFiltro || undefined,
        idModoPago: modoPagoFiltro ? Number(modoPagoFiltro) : undefined,
      });
      setMovimientos(result.movimientos);
      setTotalRegistros(result.totalRegistros);
      setTotalPaginas(result.totalPaginas);
      setPaginaActual(result.paginaActual);
    } catch (e: any) {
      console.error("Error loading movimientos:", e);
      setLoadError(e?.response?.data?.error ?? e?.message ?? "Error al cargar movimientos");
    } finally {
      setLoading(false);
    }
  }, [pagina, desdeFecha, hastaFecha, tipoFiltro, modoPagoFiltro]);

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  // Cargar resumen cuando cambian las fechas
  useEffect(() => {
    fetchResumenCaja({ desdeFecha, hastaFecha })
      .then(setResumen)
      .catch(console.error);
  }, [desdeFecha, hastaFecha, movimientos]);

  // Aplicar filtro de fecha
  const handleFechaChange = (campo: "desdeFecha" | "hastaFecha", valor: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(campo, valor);
    next.set("pagina", "1");
    setSearchParams(next);
  };

  // Aplicar filtro de tipo
  const handleTipoChange = (valor: string) => {
    const next = new URLSearchParams(searchParams);
    if (valor) {
      next.set("tipo", valor);
    } else {
      next.delete("tipo");
    }
    next.set("pagina", "1");
    setSearchParams(next);
  };

  // Aplicar filtro de modo de pago
  const handleModoPagoChange = (valor: string) => {
    const next = new URLSearchParams(searchParams);
    if (valor) {
      next.set("idModoPago", valor);
    } else {
      next.delete("idModoPago");
    }
    next.set("pagina", "1");
    setSearchParams(next);
  };

  // Limpiar filtros
  const handleLimpiarFiltros = () => {
    const next = new URLSearchParams();
    next.set("desdeFecha", hoy());
    next.set("hastaFecha", hoy());
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPaginas) return;
    const next = new URLSearchParams(searchParams);
    next.set("pagina", String(newPage));
    setSearchParams(next);
  };

  const handleCrearAjuste = async () => {
    if (!ajuste.concepto.trim()) {
      setError("El concepto es obligatorio");
      return;
    }
    if (!ajuste.importe || Number(ajuste.importe) === 0) {
      setError("El importe es obligatorio");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const importe = ajuste.tipo === "negativo"
        ? -Math.abs(Number(ajuste.importe))
        : Math.abs(Number(ajuste.importe));

      await createMovimientoCaja({
        tipo: "AJUSTE",
        concepto: ajuste.concepto,
        importe,
        observaciones: ajuste.observaciones || undefined,
      });

      setShowAjusteModal(false);
      setAjuste({
        tipo: "positivo",
        concepto: "",
        importe: "",
        observaciones: "",
      });
      loadMovimientos();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Error al crear ajuste");
    } finally {
      setGuardando(false);
    }
  };

  // Retirada de efectivo
  const handleRetiradaEfectivo = async () => {
    if (!retirada.importe || Number(retirada.importe) <= 0) {
      setError("El importe es obligatorio");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      // Buscar el modo de pago "Efectivo"
      const efectivo = modosPago.find((mp) => mp.descripcion.toLowerCase().includes("efectivo"));

      await createMovimientoCaja({
        tipo: "PAGO",
        idModoPago: efectivo?.id,
        concepto: retirada.concepto || "Retirada de efectivo",
        importe: -Math.abs(Number(retirada.importe)),
        observaciones: retirada.observaciones || undefined,
      });

      setShowRetiradaModal(false);
      setRetirada({
        importe: "",
        concepto: "Retirada de efectivo",
        observaciones: "",
      });
      loadMovimientos();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Error al registrar retirada");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm("Eliminar este movimiento?")) return;
    try {
      await deleteMovimientoCaja(id);
      loadMovimientos();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? e?.message ?? "Error al eliminar");
    }
  };

  // Calcular sumatorio de los movimientos filtrados
  const sumatorioFiltrado = useMemo(() => {
    return movimientos.reduce((acc, m) => acc + Number(m.importe), 0);
  }, [movimientos]);

  // Modos de pago unicos (sin duplicados)
  const modosPagoUnicos = useMemo(() => {
    const seen = new Set<number>();
    return modosPago.filter((mp) => {
      if (seen.has(mp.id)) return false;
      seen.add(mp.id);
      return true;
    });
  }, [modosPago]);

  const columns = useMemo<ColumnDef<MovimientoCaja>[]>(
    () => [
      {
        header: "Fecha/Hora",
        render: (m) => (
          <span className="text-sm">
            {new Date(m.fecha).toLocaleDateString("es-ES")}{" "}
            <span className="text-slate-400">
              {new Date(m.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        ),
      },
      {
        header: "Tipo",
        render: (m) => {
          const colors: Record<string, string> = {
            COBRO: "bg-emerald-100 text-emerald-800",
            PAGO: "bg-red-100 text-red-800",
            APERTURA: "bg-blue-100 text-blue-800",
            CIERRE: "bg-slate-100 text-slate-800",
            AJUSTE: "bg-amber-100 text-amber-800",
          };
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[m.tipo] || "bg-slate-100"}`}>
              {m.tipo}
            </span>
          );
        },
      },
      { header: "Modo Pago", render: (m) => m.modoPago || "-" },
      { header: "Concepto", render: (m) => <span className="text-sm">{m.concepto}</span> },
      { header: "Factura", render: (m) => m.numeroFactura || "-" },
      {
        header: "Importe",
        headerClassName: "text-right",
        cellClassName: "text-right font-mono font-medium",
        render: (m) => {
          const color = Number(m.importe) >= 0 ? "text-emerald-600" : "text-red-600";
          return <span className={color}>{Number(m.importe).toFixed(2)} EUR</span>;
        },
      },
      {
        header: "",
        render: (m) =>
          !m.idFactura && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEliminar(m.id);
              }}
              className="text-red-500 hover:text-red-700 text-xs"
              title="Eliminar"
            >
              Eliminar
            </button>
          ),
      },
    ],
    []
  );

  // Formatear rango de fechas para mostrar
  const rangoFechasTexto = useMemo(() => {
    if (desdeFecha === hastaFecha) {
      if (desdeFecha === hoy()) return "Hoy";
      return new Date(desdeFecha).toLocaleDateString("es-ES");
    }
    return `${new Date(desdeFecha).toLocaleDateString("es-ES")} - ${new Date(hastaFecha).toLocaleDateString("es-ES")}`;
  }, [desdeFecha, hastaFecha]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <GridHeader title="Caja" subtitle="Movimientos de caja y cobros" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTicketModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            Nuevo Ticket
          </button>

          <button
            onClick={() => setShowRetiradaModal(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium flex items-center gap-2"
            title="Sacar efectivo de caja (para banco, cambio, etc.)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Retirar Efectivo
          </button>

          <button
            onClick={() => setShowAjusteModal(true)}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium flex items-center gap-2"
            title="Corregir descuadres de caja"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Ajuste de Caja
          </button>
        </div>
      </div>

      {/* Error de carga */}
      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {loadError}
          <button
            onClick={loadMovimientos}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Panel de Resumen de Caja */}
      {resumen && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-slate-700">Resumen de Caja</span>
              <span className="text-sm text-slate-500">({rangoFechasTexto})</span>
            </div>
          </div>

          <div className="p-4">
            {/* Fila superior: Cobros, Pagos, Ajustes */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-600 uppercase">Total Cobros</div>
                <div className="text-2xl font-bold text-emerald-700">{resumen.resumen.totalCobros.toFixed(2)} EUR</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <div className="text-xs font-medium text-red-600 uppercase">Total Pagos/Salidas</div>
                <div className="text-2xl font-bold text-red-700">{resumen.resumen.totalPagos.toFixed(2)} EUR</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="text-xs font-medium text-amber-600 uppercase">Ajustes</div>
                <div className="text-2xl font-bold text-amber-700">{resumen.resumen.totalAjustes.toFixed(2)} EUR</div>
              </div>
            </div>

            {/* Desglose por Modo de Pago */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-medium text-blue-600 uppercase">Saldo Total en Caja</div>
                  <div className="text-3xl font-bold text-blue-700">{resumen.resumen.saldoCaja.toFixed(2)} EUR</div>
                </div>
              </div>

              {resumen.totalesPorModoPago.length > 0 && (
                <div className="border-t border-blue-200 pt-4">
                  <div className="text-xs font-medium text-blue-600 uppercase mb-3">Desglose por Forma de Pago</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {resumen.totalesPorModoPago.map((mp) => (
                      <div key={mp.idModoPago} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="text-xs text-slate-500 uppercase">{mp.modoPago}</div>
                        <div className="text-lg font-bold text-slate-800">{Number(mp.total).toFixed(2)} EUR</div>
                        <div className="text-xs text-slate-400">{mp.operaciones} operaciones</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={desdeFecha}
              onChange={(e) => handleFechaChange("desdeFecha", e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={hastaFecha}
              onChange={(e) => handleFechaChange("hastaFecha", e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tipo</label>
            <select
              value={tipoFiltro}
              onChange={(e) => handleTipoChange(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="">Todos</option>
              <option value="COBRO">Cobro</option>
              <option value="PAGO">Pago</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="APERTURA">Apertura</option>
              <option value="CIERRE">Cierre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Modo de Pago</label>
            <select
              value={modoPagoFiltro}
              onChange={(e) => handleModoPagoChange(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">Todos</option>
              {modosPagoUnicos.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.descripcion}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLimpiarFiltros}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          >
            Limpiar filtros
          </button>
        </div>

        {/* Sumatorio cuando hay filtros aplicados */}
        {(tipoFiltro || modoPagoFiltro) && movimientos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sumatorio de {totalRegistros} movimientos filtrados:</span>
              <span className={`text-lg font-bold font-mono ${sumatorioFiltrado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {sumatorioFiltrado.toFixed(2)} EUR
              </span>
            </div>
          </div>
        )}
      </div>

      <PaginacionBar
        currentPage={paginaActual}
        totalPages={totalPaginas}
        onPageChange={handlePageChange}
        windowSize={2}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          <span className="ml-3 text-slate-600">Cargando movimientos...</span>
        </div>
      ) : (
        <DataTable<MovimientoCaja>
          columns={columns}
          data={movimientos}
          getRowKey={(m) => m.id}
          emptyText="No hay movimientos de caja"
        />
      )}

      {/* Modal Ajuste de Caja */}
      {showAjusteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ajuste de Caja</h3>
                <p className="text-sm text-slate-500">Corregir descuadres o diferencias</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de ajuste</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAjuste((prev) => ({ ...prev, tipo: "positivo" }))}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      ajuste.tipo === "positivo"
                        ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-500"
                        : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Sobra dinero
                    </div>
                    <div className="text-xs mt-1 opacity-75">Hay mas efectivo del esperado</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAjuste((prev) => ({ ...prev, tipo: "negativo" }))}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      ajuste.tipo === "negativo"
                        ? "bg-red-100 text-red-800 border-2 border-red-500"
                        : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      Falta dinero
                    </div>
                    <div className="text-xs mt-1 opacity-75">Hay menos efectivo del esperado</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Importe de la diferencia</label>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${ajuste.tipo === "positivo" ? "text-emerald-600" : "text-red-600"}`}>
                    {ajuste.tipo === "positivo" ? "+" : "-"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ajuste.importe}
                    onChange={(e) => setAjuste((prev) => ({ ...prev, importe: e.target.value }))}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-right font-mono text-lg"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="text-sm text-slate-500">EUR</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo del ajuste</label>
                <input
                  type="text"
                  value={ajuste.concepto}
                  onChange={(e) => setAjuste((prev) => ({ ...prev, concepto: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ej: Descuadre al cierre, error en cambio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                <textarea
                  value={ajuste.observaciones}
                  onChange={(e) => setAjuste((prev) => ({ ...prev, observaciones: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Detalles adicionales (opcional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAjusteModal(false);
                  setError(null);
                  setAjuste({ tipo: "positivo", concepto: "", importe: "", observaciones: "" });
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearAjuste}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Registrar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retirada de Efectivo */}
      {showRetiradaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Retirada de Efectivo</h3>
                <p className="text-sm text-slate-500">Registrar salida de efectivo de caja</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Importe a retirar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retirada.importe}
                    onChange={(e) => setRetirada((prev) => ({ ...prev, importe: e.target.value }))}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-right text-lg font-mono"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="text-sm text-slate-500">EUR</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Concepto</label>
                <input
                  type="text"
                  value={retirada.concepto}
                  onChange={(e) => setRetirada((prev) => ({ ...prev, concepto: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Retirada de efectivo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                <textarea
                  value={retirada.observaciones}
                  onChange={(e) => setRetirada((prev) => ({ ...prev, observaciones: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Opcional (ej: Retirada para banco, cambio...)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowRetiradaModal(false);
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRetiradaEfectivo}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
              >
                {guardando ? (
                  "Procesando..."
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Registrar Retirada
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ticket de Venta */}
      {showTicketModal && (
        <TicketCajaModal
          onClose={() => setShowTicketModal(false)}
          onSuccess={(result: TicketVentaResult) => {
            loadMovimientos();
          }}
        />
      )}
    </div>
  );
}
