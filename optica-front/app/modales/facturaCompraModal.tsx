// app/modales/facturaCompraModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFacturaCompra,
  createFacturaCompra,
  addPagoFacturaCompra,
  getEstadoFacturaCompra,
  type FacturaCompraFull,
  type RecepcionCompraFull,
  type ProveedorLookup,
} from "~/lib/comprasRest";

type Props = {
  mode: "new" | "view";
  id?: number;
  proveedores: ProveedorLookup[];
  recepcionPreseleccionada?: RecepcionCompraFull;
  onClose: () => void;
  onSaved: () => void;
};

type LineaForm = {
  idProducto?: number;
  codigoItem: string;
  descripcionItem: string;
  cantidad: number;
  precioUnitario: number;
  pcDescuento: number;
  pcIva: number;
};

const emptyLinea = (): LineaForm => ({
  codigoItem: "",
  descripcionItem: "",
  cantidad: 1,
  precioUnitario: 0,
  pcDescuento: 0,
  pcIva: 21,
});

export default function FacturaCompraModal({
  mode,
  id,
  proveedores,
  recepcionPreseleccionada,
  onClose,
  onSaved,
}: Props) {
  const { t, i18n } = useTranslation(["compras", "common"]);
  const locale = i18n.language === "ca" ? "ca-ES" : "es-ES";

  const isNew = mode === "new";
  const isView = mode === "view";

  // ID de recepción para vincular (si viene de una recepción)
  const [idRecepcion, setIdRecepcion] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [idProveedor, setIdProveedor] = useState<number | "">("");
  const [serieFactura, setSerieFactura] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().split("T")[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  // Pago form
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoImporte, setPagoImporte] = useState("");
  const [pagoFormaPago, setPagoFormaPago] = useState("TRANSFERENCIA");
  const [pagoReferencia, setPagoReferencia] = useState("");
  const [savingPago, setSavingPago] = useState(false);

  // Factura loaded
  const [factura, setFactura] = useState<FacturaCompraFull | null>(null);

  // Pre-populate from recepcion if provided
  useEffect(() => {
    if (!recepcionPreseleccionada || !isNew) return;

    // Set proveedor
    setIdProveedor(recepcionPreseleccionada.IdProveedor);

    // Set recepcion ID for linking
    setIdRecepcion(recepcionPreseleccionada.id);

    // Map reception lines to invoice lines
    const lineasFromRecepcion: LineaForm[] = recepcionPreseleccionada.lineas?.map((l) => ({
      idProducto: l.IdProducto ?? undefined,
      codigoItem: l.Codigo ?? "",
      descripcionItem: l.Descripcion ?? "",
      cantidad: Number(l.CantidadRecibida ?? 1),
      precioUnitario: Number(l.PrecioUnitario ?? 0),
      pcDescuento: Number(l.Descuento ?? 0),
      pcIva: Number(l.PorcentajeIva ?? 21),
    })) ?? [];

    setLineas(lineasFromRecepcion.length > 0 ? lineasFromRecepcion : [emptyLinea()]);

    // Set today's date
    setFechaFactura(new Date().toISOString().split("T")[0]);
  }, [recepcionPreseleccionada, isNew]);

  // Load factura
  useEffect(() => {
    if (isNew) {
      // Only set empty line if not preselected from recepcion
      if (!recepcionPreseleccionada) {
        setLineas([emptyLinea()]);
      }
      return;
    }

    if (!id) return;

    setLoading(true);
    setError(null);

    fetchFacturaCompra(id)
      .then((data) => {
        setFactura(data);
        setIdProveedor(data.IdProveedor);
        setSerieFactura(data.SerieFactura ?? "");
        setNumeroFactura(data.NumeroFactura);
        setFechaFactura(data.FechaFactura ? data.FechaFactura.split("T")[0] : "");
        setFechaVencimiento(data.FechaVencimiento ? data.FechaVencimiento.split("T")[0] : "");
        setObservaciones(data.Observaciones ?? "");
        setLineas(
          data.lineas?.map((l) => ({
            idProducto: l.IdProducto,
            codigoItem: l.CodigoItem ?? "",
            descripcionItem: l.DescripcionItem ?? "",
            cantidad: l.Cantidad ?? 1,
            precioUnitario: l.PrecioUnitario ?? 0,
            pcDescuento: l.PcDescuento ?? 0,
            pcIva: l.PcIva ?? 21,
          })) ?? []
        );
      })
      .catch((e) => setError(e?.message ?? t("messages.errorLoadingInvoice")))
      .finally(() => setLoading(false));
  }, [mode, id]);

  const handleSave = async () => {
    if (!idProveedor) {
      setError(t("messages.selectSupplier"));
      return;
    }

    if (!numeroFactura.trim()) {
      setError(t("messages.enterInvoiceNumber"));
      return;
    }

    if (lineas.length === 0) {
      setError(t("messages.addAtLeastOneLine"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        idProveedor,
        serieFactura: serieFactura || null,
        numeroFactura,
        fechaFactura,
        fechaVencimiento: fechaVencimiento || null,
        observaciones,
        idRecepcion: idRecepcion || null, // Link to reception if exists
        lineas: lineas.map((l) => ({
          idProducto: l.idProducto || null,
          codigoItem: l.codigoItem,
          descripcionItem: l.descripcionItem,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          pcDescuento: l.pcDescuento,
          pcIva: l.pcIva,
        })),
      };

      await createFacturaCompra(payload);
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddPago = async () => {
    if (!id || !pagoImporte) return;

    setSavingPago(true);
    try {
      const data = await addPagoFacturaCompra(id, {
        importe: Number(pagoImporte),
        formaPago: pagoFormaPago,
        referencia: pagoReferencia || null,
      });
      setFactura(data);
      setShowPagoForm(false);
      setPagoImporte("");
      setPagoReferencia("");
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("payments.errorAddingPayment"));
    } finally {
      setSavingPago(false);
    }
  };

  // Lineas helpers
  const addLinea = () => setLineas([...lineas, emptyLinea()]);
  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));
  const updateLinea = (idx: number, field: keyof LineaForm, value: any) => {
    setLineas(lineas.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  // Totales
  const totales = useMemo(() => {
    let base = 0;
    let iva = 0;
    let descuento = 0;

    lineas.forEach((l) => {
      const bruto = l.cantidad * l.precioUnitario;
      const descuentoImporte = bruto * (l.pcDescuento / 100);
      const subtotal = bruto - descuentoImporte;
      descuento += descuentoImporte;
      base += subtotal;
      iva += subtotal * (l.pcIva / 100);
    });

    return { base, iva, descuento, total: base + iva };
  }, [lineas]);

  const estadoInfo = factura ? getEstadoFacturaCompra(factura.Estado) : null;
  const proveedorNombre = proveedores.find((p) => p.id === idProveedor)?.nombre ?? "";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {isNew
                  ? t("invoices.newInvoice")
                  : t("invoices.invoiceDetail", { number: `${factura?.SerieFactura ? factura.SerieFactura + "-" : ""}${factura?.NumeroFactura ?? ""}` })}
              </div>
              <div className="text-sm text-slate-600">
                {proveedorNombre || factura?.NombreProveedor || t("fields.selectSupplier")}
              </div>
              {recepcionPreseleccionada && (
                <div className="text-xs text-blue-600 mt-1">
                  {t("receptions.fromReception", { number: recepcionPreseleccionada.NumeroRecepcion })}
                  {recepcionPreseleccionada.NumeroAlbaranProveedor && ` (${t("receptions.deliveryNote", { number: recepcionPreseleccionada.NumeroAlbaranProveedor })})`}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {estadoInfo && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                  {estadoInfo.label}
                </span>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                {t("common:buttons.close")}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {loading ? (
              <div className="text-center py-8 text-slate-500">{t("messages.loading")}</div>
            ) : error ? (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100 mb-4">
                {error}
              </div>
            ) : (
              <>
                {/* Datos generales */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.supplierRequired")}</label>
                    <select
                      value={idProveedor}
                      onChange={(e) => setIdProveedor(Number(e.target.value) || "")}
                      disabled={isView}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      <option value="">{t("table.select")}</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("invoices.series")}</label>
                    <input
                      type="text"
                      value={serieFactura}
                      onChange={(e) => setSerieFactura(e.target.value)}
                      disabled={isView}
                      placeholder="A"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("invoices.numberRequired")}</label>
                    <input
                      type="text"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      disabled={isView}
                      placeholder="2024/001"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("invoices.invoiceDate")}</label>
                    <input
                      type="date"
                      value={fechaFactura}
                      onChange={(e) => setFechaFactura(e.target.value)}
                      disabled={isView}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Lineas */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold text-slate-700">{t("invoices.invoiceLines")}</div>
                    {!isView && (
                      <button
                        type="button"
                        onClick={addLinea}
                        className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {t("orders.addLine")}
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-600 w-24">{t("table.code")}</th>
                          <th className="text-left p-3 font-medium text-slate-600">{t("table.description")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-20">{t("table.quantity")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.price")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-16">{t("table.discount")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-16">{t("table.vat")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.amount")}</th>
                          {!isView && <th className="w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              {t("invoices.noLines")}
                            </td>
                          </tr>
                        ) : (
                          lineas.map((l, idx) => {
                            const bruto = l.cantidad * l.precioUnitario;
                            const descuentoImporte = bruto * (l.pcDescuento / 100);
                            const base = bruto - descuentoImporte;
                            const ivaImporte = base * (l.pcIva / 100);
                            const importe = base + ivaImporte;

                            return (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={l.codigoItem}
                                    onChange={(e) => updateLinea(idx, "codigoItem", e.target.value)}
                                    disabled={isView}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={l.descripcionItem}
                                    onChange={(e) => updateLinea(idx, "descripcionItem", e.target.value)}
                                    disabled={isView}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={l.cantidad}
                                    onChange={(e) => updateLinea(idx, "cantidad", Number(e.target.value))}
                                    disabled={isView}
                                    min={1}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={l.precioUnitario}
                                    onChange={(e) => updateLinea(idx, "precioUnitario", Number(e.target.value))}
                                    disabled={isView}
                                    step={0.01}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-right disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={l.pcDescuento}
                                    onChange={(e) => updateLinea(idx, "pcDescuento", Number(e.target.value))}
                                    disabled={isView}
                                    min={0}
                                    max={100}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={l.pcIva}
                                    onChange={(e) => updateLinea(idx, "pcIva", Number(e.target.value))}
                                    disabled={isView}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center disabled:bg-white"
                                  >
                                    <option value={21}>21%</option>
                                    <option value={10}>10%</option>
                                    <option value={4}>4%</option>
                                    <option value={0}>0%</option>
                                  </select>
                                </td>
                                <td className="p-2 text-right font-medium">
                                  {importe.toFixed(2)} €
                                </td>
                                {!isView && (
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeLinea(idx)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totales */}
                  <div className="flex justify-end mt-4">
                    <div className="w-72 p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t("totals.taxBase")}</span>
                        <span className="font-medium">{totales.base.toFixed(2)} €</span>
                      </div>
                      {totales.descuento > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>{t("totals.discounts")}</span>
                          <span>-{totales.descuento.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t("totals.vat")}</span>
                        <span className="font-medium">{totales.iva.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-700">{t("totals.total")}</span>
                        <span className="font-bold text-slate-900">{totales.total.toFixed(2)} €</span>
                      </div>

                      {isView && factura && (
                        <>
                          <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                            <span className="text-emerald-600">{t("totals.paid")}</span>
                            <span className="font-medium text-emerald-600">{Number(factura.ImportePagado ?? 0).toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-amber-600">{t("totals.pending")}</span>
                            <span className="font-medium text-amber-600">{Number(factura.ImportePendiente ?? 0).toFixed(2)} €</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pagos (solo en vista) */}
                {isView && factura && (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-bold text-slate-700">{t("payments.title")}</div>
                      {factura.Estado !== "PAGADA" && (
                        <button
                          type="button"
                          onClick={() => setShowPagoForm(!showPagoForm)}
                          className="px-4 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {t("payments.addPayment")}
                        </button>
                      )}
                    </div>

                    {showPagoForm && (
                      <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t("payments.amount")}</label>
                            <input
                              type="number"
                              value={pagoImporte}
                              onChange={(e) => setPagoImporte(e.target.value)}
                              step={0.01}
                              placeholder={String(factura.ImportePendiente ?? 0)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t("payments.paymentMethod")}</label>
                            <select
                              value={pagoFormaPago}
                              onChange={(e) => setPagoFormaPago(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              <option value="TRANSFERENCIA">{t("payments.transfer")}</option>
                              <option value="EFECTIVO">{t("payments.cash")}</option>
                              <option value="CHEQUE">{t("payments.check")}</option>
                              <option value="PAGARE">{t("payments.promissoryNote")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t("payments.reference")}</label>
                            <input
                              type="text"
                              value={pagoReferencia}
                              onChange={(e) => setPagoReferencia(e.target.value)}
                              placeholder={t("payments.referencePlaceholder")}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={handleAddPago}
                              disabled={savingPago || !pagoImporte}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
                            >
                              {savingPago ? t("messages.saving") : t("payments.savePayment")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {factura.pagos && factura.pagos.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left p-3 font-medium text-slate-600">{t("fields.date")}</th>
                              <th className="text-left p-3 font-medium text-slate-600">{t("payments.paymentMethod")}</th>
                              <th className="text-left p-3 font-medium text-slate-600">{t("payments.reference")}</th>
                              <th className="text-right p-3 font-medium text-slate-600">{t("table.amount")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {factura.pagos.map((p, idx) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="p-3">{p.FechaPago ? new Date(p.FechaPago).toLocaleDateString(locale) : "-"}</td>
                                <td className="p-3">{p.FormaPago}</td>
                                <td className="p-3 text-slate-500">{p.Referencia || "-"}</td>
                                <td className="p-3 text-right font-medium text-emerald-600">{Number(p.Importe).toFixed(2)} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-sm">
                        {t("payments.noPayments")}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!isView && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-white text-sm"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {saving ? t("messages.saving") : t("common:buttons.save")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
