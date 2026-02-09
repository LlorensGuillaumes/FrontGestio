// app/modales/historialMovimientosModal.tsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchMovimientosStock,
  formatTipoMovimiento,
  type MovimientoStock,
} from "~/lib/stockRest";

type Props = {
  idProducto: number;
  nombreProducto: string;
  onClose: () => void;
};

export default function HistorialMovimientosModal({ idProducto, nombreProducto, onClose }: Props) {
  const { t, i18n } = useTranslation(["productos", "common"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [stockActual, setStockActual] = useState<number>(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadMovimientos();
  }, [idProducto]);

  const loadMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMovimientosStock(idProducto, 100, 0);
      setMovimientos(res.data ?? []);
      setStockActual(res.producto?.stockActual ?? 0);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e.message ?? t("stockMovements.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const locale = i18n.language === "ca" ? "ca-ES" : "es-ES";
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCantidad = (tipo: string, cantidad: number) => {
    const isEntrada = tipo.startsWith("ENTRADA");
    return (
      <span className={isEntrada ? "text-emerald-600" : "text-red-600"}>
        {isEntrada ? "+" : "-"}{Math.abs(cantidad)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("stockMovements.title")}</h2>
              <p className="text-sm text-slate-500">{nombreProducto}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500">{t("stockMovements.currentStock")}</div>
                <div className="text-xl font-bold text-slate-900">{stockActual}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center py-12 text-slate-500">{t("stockMovements.loading")}</div>
            ) : error ? (
              <div className="p-4">
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                  {error}
                </div>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-500">{t("stockMovements.noMovements")}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("stockMovements.date")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("stockMovements.type")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("stockMovements.quantity")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("stockMovements.stock")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("stockMovements.source")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatFecha(mov.FechaMovimiento)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-800">
                          {formatTipoMovimiento(mov.TipoMovimiento)}
                        </span>
                        {mov.Observaciones && (
                          <p className="text-xs text-slate-400 mt-0.5">{mov.Observaciones}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCantidad(mov.TipoMovimiento, mov.Cantidad)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-slate-400">{mov.StockAnterior}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-sm font-medium text-slate-700">{mov.StockPosterior}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {mov.TipoDocumentoOrigen ? (
                          <span>
                            {mov.TipoDocumentoOrigen}
                            {mov.IdDocumentoOrigen && ` #${mov.IdDocumentoOrigen}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between flex-shrink-0 bg-slate-50">
            <div className="text-sm text-slate-500">
              {total > 0 && t(total === 1 ? "stockMovements.movementsCount" : "stockMovements.movementsCountPlural", { count: total })}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-white transition-colors"
            >
              {t("common:buttons.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
