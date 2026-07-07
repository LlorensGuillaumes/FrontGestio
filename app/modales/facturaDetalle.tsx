// app/modales/facturaDetalle.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FacturaVenta, FacturaVentaLinea } from "~/types/facturas";
import { fetchModosPago, type ModoPago } from "~/lib/cajaRest";
import { createFacturaAbono, fetchFactura, type Factura } from "~/lib/facturasRest";
import { fetchDatosEmpresa, type DatosEmpresa } from "~/lib/empresaRest";
import FacturaPDF from "~/components/FacturaPDF";

type Props = {
  factura: FacturaVenta;
  onClose: () => void;
  onRefresh?: () => void;
};

const money = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const num2 = (n: number) =>
  Number(n ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FacturaDetalle({ factura, onClose, onRefresh }: Props) {
  const { t } = useTranslation(["ventas", "common"]);
  const [showPDF, setShowPDF] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [modosPago, setModosPago] = useState<ModoPago[]>([]);
  const [selectedModoPago, setSelectedModoPago] = useState<number | null>(null);
  const [motivoAbono, setMotivoAbono] = useState("");
  const [tipoAbono, setTipoAbono] = useState<"total" | "parcial">("total");
  const [lineasAbono, setLineasAbono] = useState<{ idLinea: number; cantidad: number; checked: boolean }[]>([]);
  const [creandoAbono, setCreandoAbono] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facturaCompleta, setFacturaCompleta] = useState<Factura | null>(null);
  const [datosEmpresa, setDatosEmpresa] = useState<DatosEmpresa | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // Cargar modos de pago y datos de empresa
  useEffect(() => {
    fetchModosPago().then((res) => {
      setModosPago(res);
      if (res.length > 0) setSelectedModoPago(res[0].id);
    }).catch(console.error);

    fetchDatosEmpresa().then(setDatosEmpresa).catch(console.error);

    // Cargar factura completa para el PDF
    if (factura.id) {
      fetchFactura(factura.id).then((f) => {
        setFacturaCompleta(f);
        // Inicializar líneas para abono
        const lineas = f.lineas || [];
        setLineasAbono(lineas.map((l: any) => ({
          idLinea: l.id,
          cantidad: Number(l.cantidad) || 1,
          checked: true
        })));
      }).catch(console.error);
    }
  }, [factura.id]);

  const lineas: FacturaVentaLinea[] =
    (factura as any).FacturaVentaLineas || (factura as any).facturaVentaLineas || [];

  const fecha = factura.fechaFactura ? new Date(factura.fechaFactura).toLocaleDateString("es-ES") : "-";

  const numeroFactura = useMemo(() => {
    const s = factura.serie ?? "";
    const n = factura.numero ?? "";
    return `${s}${s && n ? "-" : ""}${n}`.trim() || "-";
  }, [factura.serie, factura.numero]);

  const base = Number((factura as any).totalBaseImponible ?? 0);
  const iva = Number((factura as any).totalCuotaIva ?? 0);
  const total = Number((factura as any).totalFactura ?? 0);

  const handleCrearAbono = async () => {
    if (!selectedModoPago) {
      setError(t("ventas:detalleFactura.errorSeleccionaModoPago"));
      return;
    }

    setCreandoAbono(true);
    setError(null);

    try {
      const input: any = {
        idFacturaOriginal: Number(factura.id),
        idModoPago: selectedModoPago,
        motivo: motivoAbono || undefined,
      };

      if (tipoAbono === "parcial") {
        const lineasSeleccionadas = lineasAbono
          .filter(l => l.checked && l.cantidad > 0)
          .map(l => ({ idLinea: l.idLinea, cantidad: l.cantidad }));

        if (lineasSeleccionadas.length === 0) {
          setError(t("ventas:detalleFactura.errorSeleccionaLinea"));
          setCreandoAbono(false);
          return;
        }
        input.lineasAbono = lineasSeleccionadas;
      }

      await createFacturaAbono(input);
      setShowAbonoModal(false);
      onRefresh?.();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("ventas:detalleFactura.errorCrearAbono"));
    } finally {
      setCreandoAbono(false);
    }
  };

  const toggleLineaAbono = (idLinea: number) => {
    setLineasAbono(prev => prev.map(l =>
      l.idLinea === idLinea ? { ...l, checked: !l.checked } : l
    ));
  };

  const updateCantidadAbono = (idLinea: number, cantidad: number) => {
    setLineasAbono(prev => prev.map(l =>
      l.idLinea === idLinea ? { ...l, cantidad: Math.max(0, cantidad) } : l
    ));
  };

  // Preparar factura para PDF
  const facturaParaPDF: Factura | null = facturaCompleta ? {
    ...facturaCompleta,
    NombreCliente: facturaCompleta.NombreCliente || factura.nombreCliente,
  } : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />

        <div className="relative w-[min(1200px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Top bar con acciones */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900">{t("ventas:detalleFactura.facturaNumero", { numero: numeroFactura })}</h2>
              <span className="text-xs text-slate-500">{factura.nombreCliente ?? ""}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Botones de accion */}
              <button
                type="button"
                onClick={() => setShowPDF(true)}
                disabled={!facturaParaPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t("ventas:detalleFactura.imprimirPdf")}
              </button>

              {(factura as any).estadoFiscal !== "RECTIFICATIVA" && total > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  {t("ventas:detalleFactura.crearAbono")}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                aria-label={t("ventas:detalleFactura.cerrar")}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-slate-100/70 overflow-auto max-h-[calc(100vh-4.25rem)] p-6">
            <div className="mx-auto w-full max-w-4xl bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="p-8">
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {(factura as any).tipoFactura === "RECTIFICATIVA" ? t("ventas:detalleFactura.tituloRectificativa") : t("ventas:detalleFactura.tituloFactura")}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-blue-600">{numeroFactura}</div>
                    <div className="mt-2 text-sm text-slate-600">{t("ventas:detalleFactura.fechaLabel", { fecha })}</div>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                        {(factura as any).estadoFiscal}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                        {(factura as any).estadoCobro}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    {datosEmpresa && (
                      <>
                        <div className="font-bold text-slate-800">{datosEmpresa.NombreComercial || datosEmpresa.NombreEmpresa}</div>
                        <div>{t("ventas:detalleFactura.cifLabel", { cif: datosEmpresa.CIF })}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cliente */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">{t("ventas:detalleFactura.cliente")}</div>
                  <div className="text-base font-medium text-slate-800">{factura.nombreCliente || "-"}</div>
                </div>

                {/* Lineas */}
                <div className="mb-6">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">{t("ventas:detalleFactura.detalleLineas", { count: lineas.length })}</div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">{t("ventas:detalleFactura.colDescripcion")}</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600 w-16">{t("ventas:detalleFactura.colCantidad")}</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600 w-20">{t("ventas:detalleFactura.colPrecio")}</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600 w-20">{t("ventas:detalleFactura.colBase")}</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600 w-16">{t("ventas:detalleFactura.colIva")}</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600 w-20">{t("ventas:detalleFactura.colTotal")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((l, i) => (
                          <tr key={l.id || i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-3 py-2 text-slate-700">{l.descripcionItem}</td>
                            <td className="px-3 py-2 text-right font-mono">{l.cantidad}</td>
                            <td className="px-3 py-2 text-right font-mono">{num2(l.precioUnitario)}</td>
                            <td className="px-3 py-2 text-right font-mono">{money(l.baseImporte)}</td>
                            <td className="px-3 py-2 text-right font-mono">{l.pcIva}%</td>
                            <td className="px-3 py-2 text-right font-mono font-medium">{money(l.importeLinea)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totales */}
                <div className="flex justify-end">
                  <div className="w-64 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="text-xs font-bold text-slate-600 uppercase">{t("ventas:detalleFactura.totales")}</div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{t("ventas:detalleFactura.baseImponible")}</span>
                        <span className="font-mono">{money(base)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{t("ventas:detalleFactura.iva")}</span>
                        <span className="font-mono">{money(iva)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
                        <span>{t("ventas:detalleFactura.total")}</span>
                        <span className="font-mono">{money(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal PDF */}
      {showPDF && facturaParaPDF && (
        <FacturaPDF factura={facturaParaPDF} onClose={() => setShowPDF(false)} />
      )}

      {/* Modal Abono */}
      {showAbonoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t("ventas:detalleFactura.crearAbono")}</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600">{t("ventas:detalleFactura.facturaOriginal")}</div>
              <div className="text-base font-bold text-slate-800">{numeroFactura}</div>
              <div className="text-sm text-slate-600">{t("ventas:detalleFactura.totalLabel", { total: money(total) })}</div>
            </div>

            {/* Tipo de abono */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("ventas:detalleFactura.tipoAbono")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAbono("total")}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm ${
                    tipoAbono === "total"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-red-300"
                  }`}
                >
                  {t("ventas:detalleFactura.abonoTotal")}
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAbono("parcial")}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm ${
                    tipoAbono === "parcial"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-red-300"
                  }`}
                >
                  {t("ventas:detalleFactura.abonoParcial")}
                </button>
              </div>
            </div>

            {/* Seleccion de lineas para abono parcial */}
            {tipoAbono === "parcial" && facturaCompleta && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t("ventas:detalleFactura.lineasAbonar")}</label>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-auto">
                  {(facturaCompleta.lineas || []).map((l: any, idx: number) => {
                    const lineaAbono = lineasAbono.find(la => la.idLinea === l.id);
                    return (
                      <div key={l.id || idx} className="flex items-center gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={lineaAbono?.checked ?? false}
                          onChange={() => toggleLineaAbono(l.id)}
                          className="rounded border-slate-300"
                        />
                        <div className="flex-1 text-sm text-slate-700 truncate">{l.descripcionItem}</div>
                        <input
                          type="number"
                          min="0"
                          max={l.cantidad}
                          value={lineaAbono?.cantidad ?? l.cantidad}
                          onChange={(e) => updateCantidadAbono(l.id, Number(e.target.value))}
                          disabled={!lineaAbono?.checked}
                          className="w-16 px-2 py-1 text-sm border border-slate-200 rounded text-right disabled:bg-slate-100"
                        />
                        <span className="text-xs text-slate-400">/ {l.cantidad}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modo de pago */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("ventas:detalleFactura.formaDevolucion")}</label>
              <div className="grid grid-cols-2 gap-2">
                {modosPago.map((mp) => (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => setSelectedModoPago(mp.id)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      selectedModoPago === mp.id
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-red-300"
                    }`}
                  >
                    {mp.descripcion}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("ventas:detalleFactura.motivoAbono")}</label>
              <textarea
                value={motivoAbono}
                onChange={(e) => setMotivoAbono(e.target.value)}
                rows={2}
                placeholder={t("ventas:detalleFactura.motivoAbonoPlaceholder")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAbonoModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
              >
                {t("ventas:detalleFactura.cancelar")}
              </button>
              <button
                type="button"
                onClick={handleCrearAbono}
                disabled={!selectedModoPago || creandoAbono}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {creandoAbono ? t("ventas:detalleFactura.creando") : t("ventas:detalleFactura.crearFacturaAbono")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
