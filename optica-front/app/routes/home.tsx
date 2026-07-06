// app/routes/home.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/contexts/AuthContext";
import { api } from "~/lib/api";

type DashboardStats = {
  ventasHoy: number;
  ventasMes: number;
  clientesActivos: number;
  documentosPendientes: number;
  facturasPendientes: number;
  comprasMes: number;
  numVentasHoy: number;
  nuevosClientesHoy: number;
  pedidosRecibidosHoy: number;
};

type ActivityItem = {
  id: string;
  tipo: "venta" | "pago" | "cliente" | "documento";
  descripcion: string;
  fecha: string;
  importe?: number;
  nombreCliente?: string;
};

export default function Home() {
  const { t } = useTranslation("common");
  const { user, config } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    ventasHoy: 0,
    ventasMes: 0,
    clientesActivos: 0,
    documentosPendientes: 0,
    facturasPendientes: 0,
    comprasMes: 0,
    numVentasHoy: 0,
    nuevosClientesHoy: 0,
    pedidosRecibidosHoy: 0,
  });
  const [actividad, setActividad] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar reloj cada minuto
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Cargar estadísticas reales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, actividadRes] = await Promise.all([
          api.get<DashboardStats>("/dashboard/stats"),
          api.get<{ actividad: ActivityItem[] }>("/dashboard/actividad"),
        ]);
        setStats(statsRes.data);
        setActividad(actividadRes.data.actividad ?? []);
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("home.activity.now");
    if (diffMins < 60) return t("home.activity.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("home.activity.hoursAgo", { count: diffHours });
    if (diffDays === 1) return t("home.activity.yesterday");
    return t("home.activity.daysAgo", { count: diffDays });
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case "venta":
        return (
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "cliente":
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "documento":
        return (
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case "pago":
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const quickActions = [
    {
      label: t("home.quickActions.newClient"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => navigate("/clientes"),
    },
    {
      label: t("home.quickActions.newSale"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "bg-emerald-500 hover:bg-emerald-600",
      onClick: () => navigate("/contabilidad/caja"),
    },
    {
      label: t("home.quickActions.viewProducts"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "bg-violet-500 hover:bg-violet-600",
      onClick: () => navigate("/productos"),
    },
    {
      label: t("home.quickActions.purchases"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: "bg-amber-500 hover:bg-amber-600",
      onClick: () => navigate("/compras"),
    },
  ];

  return (
    <main className="p-6 max-w-7xl mx-auto">
      {/* Header con saludo y fecha */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("home.greeting", { name: user?.nombre || t("home.defaultUser") })}
            </h1>
            <p className="text-slate-500 capitalize">{formatDate(currentTime)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-light text-slate-700">{formatTime(currentTime)}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{t("home.localTime")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ventas Hoy */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t("home.stats.salesToday")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? "..." : formatCurrency(stats.ventasHoy)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-emerald-600 font-medium">{t("home.stats.month", { value: formatCurrency(stats.ventasMes) })}</span>
          </div>
        </div>

        {/* Clientes Activos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t("home.stats.activeClients")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? "..." : stats.clientesActivos.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => navigate("/clientes")}
            className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {t("home.stats.viewAllClients")}
          </button>
        </div>

        {/* Documentos Pendientes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t("home.stats.pendingQuotes")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? "..." : stats.documentosPendientes}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs">
            <span className="text-amber-600 font-medium">{t("home.stats.invoicesToCollect", { count: stats.facturasPendientes })}</span>
          </div>
        </div>

        {/* Compras del Mes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t("home.stats.purchasesMonth")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? "..." : formatCurrency(stats.comprasMes)}
              </p>
            </div>
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => navigate("/compras")}
            className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            {t("home.stats.viewPurchases")}
          </button>
        </div>
      </div>

      {/* Sección de acciones rápidas y resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acciones Rápidas */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("home.quickActions.title")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors`}
                >
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info del sistema */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-sm p-5 mt-4 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">{t("home.system.currentCompany")}</p>
                <p className="text-xs text-white/60">{user?.currentDatabase || t("home.system.noSelection")}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">{t("home.system.user")}</span>
                <span className="text-white/90">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{t("home.system.role")}</span>
                <span className="text-white/90 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Actividad */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{t("home.summary.title")}</h2>
              <span className="text-xs text-slate-400">
                {loading ? t("home.loading") : t("home.summary.realtime")}
              </span>
            </div>

            {/* Indicadores del día */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">
                  {loading ? "..." : stats.numVentasHoy}
                </p>
                <p className="text-xs text-slate-500 mt-1">{t("home.summary.salesMade")}</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : stats.nuevosClientesHoy}
                </p>
                <p className="text-xs text-slate-500 mt-1">{t("home.summary.newClients")}</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-violet-600">
                  {loading ? "..." : stats.pedidosRecibidosHoy}
                </p>
                <p className="text-xs text-slate-500 mt-1">{t("home.summary.purchasesReceived")}</p>
              </div>
            </div>

            {/* Lista de actividad reciente */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">{t("home.activity.title")}</h3>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">{t("home.activity.loading")}</div>
                ) : actividad.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">{t("home.activity.empty")}</div>
                ) : (
                  actividad.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      {getActivityIcon(item.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{item.descripcion}</p>
                        <p className="text-xs text-slate-400">{formatRelativeTime(item.fecha)}</p>
                      </div>
                      {item.importe != null && (
                        <span className={`text-sm font-medium ${item.tipo === "pago" ? "text-red-600" : "text-emerald-600"}`}>
                          {item.tipo === "pago" ? "-" : "+"}{formatCurrency(Math.abs(item.importe))}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
