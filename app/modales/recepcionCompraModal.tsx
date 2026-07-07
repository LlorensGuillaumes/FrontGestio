// app/modales/recepcionCompraModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchRecepcionCompra,
  fetchOrdenesPendientesProveedor,
  createRecepcionCompra,
  getEstadoRecepcion,
  type RecepcionCompraFull,
  type OrdenPendiente,
  type ProveedorLookup,
} from "~/lib/comprasRest";

type Props = {
  mode: "new" | "view";
  id?: number;
  proveedores: ProveedorLookup[];
  onClose: () => void;
  onSaved: () => void;
  onCreateFactura?: (recepcion: RecepcionCompraFull) => void;
};

type LineaForm = {
  idOrdenLinea?: number;
  idProducto?: number;
  codigo: string;
  descripcion: string;
  cantidadRecibida: number;
  cantidadPendiente?: number; // Cantidad pendiente de recibir (informativo)
  precioUnitario: number;
  descuento: number;
  porcentajeIva: number;
};

const emptyLinea = (): LineaForm => ({
  codigo: "",
  descripcion: "",
  cantidadRecibida: 1,
  precioUnitario: 0,
  descuento: 0,
  porcentajeIva: 21,
});

export default function RecepcionCompraModal({
  mode,
  id,
  proveedores,
  onClose,
  onSaved,
  onCreateFactura,
}: Props) {
  const { t } = useTranslation(["compras", "common"]);

  const isNew = mode === "new";
  const isView = mode === "view";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para mostrar opciones después de crear
  const [recepcionCreada, setRecepcionCreada] = useState<RecepcionCompraFull | null>(null);

  // Form state
  const [idProveedor, setIdProveedor] = useState<number | "">("");
  const [idOrdenCompra, setIdOrdenCompra] = useState<number | "">("");
  const [numeroAlbaranProveedor, setNumeroAlbaranProveedor] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split("T")[0]);
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  // Ordenes pendientes del proveedor
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenPendiente[]>([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);

  // Recepcion loaded
  const [recepcion, setRecepcion] = useState<RecepcionCompraFull | null>(null);

  // Load ordenes cuando cambia proveedor
  useEffect(() => {
    if (!isNew || !idProveedor) {
      setOrdenesPendientes([]);
      return;
    }

    setLoadingOrdenes(true);
    fetchOrdenesPendientesProveedor(Number(idProveedor))
      .then(setOrdenesPendientes)
      .catch(console.error)
      .finally(() => setLoadingOrdenes(false));
  }, [isNew, idProveedor]);

  // Cargar lineas de la orden seleccionada
  useEffect(() => {
    if (!isNew || !idOrdenCompra) {
      if (isNew && !idOrdenCompra) {
        setLineas([]);
      }
      return;
    }

    // Buscar la orden en las ya cargadas
    const orden = ordenesPendientes.find((o) => o.id === Number(idOrdenCompra));
    if (!orden) return;

    // Convertir lineas de la orden a lineas de recepcion (solo las pendientes)
    const lineasRecepcion = orden.lineas.map((l) => {
      const cantidadPedida = Number(l.CantidadPedida) || 0;
      const cantidadRecibida = Number(l.CantidadRecibida) || 0;
      const pendiente = cantidadPedida - cantidadRecibida;
      return {
        idOrdenLinea: l.id,
        idProducto: l.IdProducto ?? undefined,
        codigo: l.Codigo ?? "",
        descripcion: l.Descripcion ?? "",
        cantidadRecibida: pendiente, // Pendiente por recibir
        cantidadPendiente: pendiente, // Para mostrar info
        precioUnitario: Number(l.PrecioUnitario) || 0,
        descuento: Number(l.Descuento) || 0,
        porcentajeIva: Number(l.PorcentajeIva) || 21,
      };
    });
    setLineas(lineasRecepcion);
  }, [isNew, idOrdenCompra, ordenesPendientes]);

  // Load recepcion
  useEffect(() => {
    if (isNew) {
      setLineas([]);
      return;
    }

    if (!id) return;

    setLoading(true);
    setError(null);

    fetchRecepcionCompra(id)
      .then((data) => {
        setRecepcion(data);
        setIdProveedor(data.IdProveedor);
        setIdOrdenCompra(data.IdOrdenCompra ?? "");
        setNumeroAlbaranProveedor(data.NumeroAlbaranProveedor ?? "");
        setFechaRecepcion(data.FechaRecepcion ? data.FechaRecepcion.split("T")[0] : "");
        setObservaciones(data.Observaciones ?? "");
        setLineas(
          data.lineas?.map((l) => ({
            idOrdenLinea: l.IdOrdenLinea,
            idProducto: l.IdProducto,
            codigo: l.Codigo ?? "",
            descripcion: l.Descripcion ?? "",
            cantidadRecibida: l.CantidadRecibida ?? 0,
            precioUnitario: l.PrecioUnitario ?? 0,
            descuento: l.Descuento ?? 0,
            porcentajeIva: l.PorcentajeIva ?? 21,
          })) ?? []
        );
      })
      .catch((e) => setError(e?.message ?? t("messages.errorLoadingReception")))
      .finally(() => setLoading(false));
  }, [mode, id]);

  const handleSave = async () => {
    if (!idProveedor) {
      setError(t("messages.selectSupplier"));
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
        idProveedor: Number(idProveedor),
        idOrdenCompra: idOrdenCompra ? Number(idOrdenCompra) : null,
        numeroAlbaranProveedor,
        fechaRecepcion,
        observaciones,
        lineas: lineas.map((l) => ({
          idOrdenLinea: l.idOrdenLinea ? Number(l.idOrdenLinea) : null,
          idProducto: l.idProducto ? Number(l.idProducto) : null,
          codigo: l.codigo,
          descripcion: l.descripcion,
          cantidadRecibida: Number(l.cantidadRecibida) || 0,
          precioUnitario: Number(l.precioUnitario) || 0,
          descuento: Number(l.descuento) || 0,
          porcentajeIva: Number(l.porcentajeIva) || 21,
        })),
      };

      const nuevaRecepcion = await createRecepcionCompra(payload);
      setRecepcionCreada(nuevaRecepcion);
      setRecepcion(nuevaRecepcion);
      // No llamamos a onSaved() aquí, lo haremos al cerrar
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  // Manejar crear factura
  const handleCrearFactura = () => {
    if (recepcionCreada && onCreateFactura) {
      onSaved(); // Refrescar listado
      onCreateFactura(recepcionCreada);
    }
  };

  // Manejar cierre
  const handleClose = () => {
    if (recepcionCreada) {
      onSaved(); // Refrescar listado si se creó algo
    } else {
      onClose();
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

    lineas.forEach((l) => {
      const bruto = l.cantidadRecibida * l.precioUnitario;
      const descuentoImporte = bruto * (l.descuento / 100);
      const subtotal = bruto - descuentoImporte;
      base += subtotal;
      iva += subtotal * (l.porcentajeIva / 100);
    });

    return { base, iva, total: base + iva };
  }, [lineas]);

  const estadoInfo = recepcion ? getEstadoRecepcion(recepcion.Estado) : null;
  const proveedorNombre = proveedores.find((p) => p.id === idProveedor)?.nombre ?? "";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {isNew ? t("receptions.newReception") : t("receptions.receptionDetail", { number: recepcion?.NumeroRecepcion ?? "" })}
              </div>
              <div className="text-sm text-slate-600">
                {proveedorNombre || recepcion?.NombreProveedor || t("fields.selectSupplier")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {estadoInfo && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                  {estadoInfo.label}
                </span>
              )}
              <button
                onClick={handleClose}
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
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.supplierRequired")}</label>
                    <select
                      value={idProveedor}
                      onChange={(e) => {
                        setIdProveedor(Number(e.target.value) || "");
                        setIdOrdenCompra("");
                        setLineas([]);
                      }}
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
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("receptions.fromOrder")}</label>
                    <select
                      value={idOrdenCompra}
                      onChange={(e) => setIdOrdenCompra(Number(e.target.value) || "")}
                      disabled={isView || !idProveedor || loadingOrdenes}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      {!idProveedor ? (
                        <option value="">{t("orders.selectSupplierFirst")}</option>
                      ) : loadingOrdenes ? (
                        <option value="">{t("orders.loadingOrders")}</option>
                      ) : ordenesPendientes.length === 0 ? (
                        <option value="">{t("orders.noPendingOrders")}</option>
                      ) : (
                        <>
                          <option value="">{t("orders.noOrderManual")}</option>
                          {ordenesPendientes.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.NumeroOrden} ({t("orders.pendingLines", { count: o.lineas.length })})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("receptions.supplierDeliveryNote")}</label>
                    <input
                      type="text"
                      value={numeroAlbaranProveedor}
                      onChange={(e) => setNumeroAlbaranProveedor(e.target.value)}
                      disabled={isView}
                      placeholder={t("receptions.deliveryNoteNumber")}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.date")}</label>
                    <input
                      type="date"
                      value={fechaRecepcion}
                      onChange={(e) => setFechaRecepcion(e.target.value)}
                      disabled={isView}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {isNew && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
                    <strong>{t("compras:recepcionModal.stockLabel")}</strong> {t("receptions.stockNote")}
                  </div>
                )}

                {/* Lineas */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold text-slate-700">
                      {t("receptions.receptionLines")}
                      {idOrdenCompra && (
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {t("receptions.linesHint")}
                        </span>
                      )}
                    </div>
                    {!isView && !idOrdenCompra && (
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
                          <th className="text-left p-3 font-medium text-slate-600">{t("table.code")}</th>
                          <th className="text-left p-3 font-medium text-slate-600">{t("table.description")}</th>
                          {idOrdenCompra && <th className="text-center p-3 font-medium text-slate-600 w-20">{t("receptions.pendingToReceive")}</th>}
                          <th className="text-center p-3 font-medium text-slate-600 w-24">{t("receptions.received")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.price")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.subtotal")}</th>
                          {!isView && <th className="w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.length === 0 ? (
                          <tr>
                            <td colSpan={idOrdenCompra ? 7 : 6} className="p-8 text-center text-slate-400">
                              {loadingOrdenes
                                ? t("orders.loadingOrders")
                                : idOrdenCompra
                                ? t("receptions.noPendingLinesOrder")
                                : idProveedor
                                ? t("receptions.selectOrderOrManual")
                                : t("orders.selectSupplierFirst")}
                            </td>
                          </tr>
                        ) : (
                          lineas.map((l, idx) => {
                            const precio = Number(l.precioUnitario) || 0;
                            const cantidad = Number(l.cantidadRecibida) || 0;
                            const dto = Number(l.descuento) || 0;
                            const bruto = cantidad * precio;
                            const descuentoImporte = bruto * (dto / 100);
                            const subtotal = bruto - descuentoImporte;

                            return (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 text-slate-600">{l.codigo || "-"}</td>
                                <td className="p-3">
                                  {isView ? (
                                    <span>{l.descripcion}</span>
                                  ) : idOrdenCompra ? (
                                    <span>{l.descripcion}</span>
                                  ) : (
                                    <input
                                      type="text"
                                      value={l.descripcion}
                                      onChange={(e) => updateLinea(idx, "descripcion", e.target.value)}
                                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                                    />
                                  )}
                                </td>
                                {idOrdenCompra && (
                                  <td className="p-3 text-center text-slate-500">
                                    {l.cantidadPendiente ?? "-"}
                                  </td>
                                )}
                                <td className="p-3">
                                  {isView ? (
                                    <span className="block text-center">{cantidad}</span>
                                  ) : (
                                    <input
                                      type="number"
                                      value={l.cantidadRecibida}
                                      onChange={(e) => updateLinea(idx, "cantidadRecibida", Number(e.target.value))}
                                      min={0}
                                      max={l.cantidadPendiente}
                                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center"
                                    />
                                  )}
                                </td>
                                <td className="p-3 text-right">{precio.toFixed(2)} €</td>
                                <td className="p-3 text-right font-medium">{subtotal.toFixed(2)} €</td>
                                {!isView && (
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeLinea(idx)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                      title={t("compras:recepcionModal.eliminarLineaTooltip")}
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
                    <div className="w-64 p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t("totals.taxBase")}</span>
                        <span className="font-medium">{totales.base.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t("totals.vat")}</span>
                        <span className="font-medium">{totales.iva.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-base pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-700">{t("totals.total")}</span>
                        <span className="font-bold text-slate-900">{totales.total.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isView && !recepcionCreada && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={handleClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-white text-sm"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || lineas.length === 0}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
              >
                {saving ? t("messages.saving") : t("receptions.saveAndUpdateStock")}
              </button>
            </div>
          )}

          {/* Footer después de crear - opciones */}
          {recepcionCreada && (
            <div className="px-6 py-4 border-t border-slate-200 bg-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">
                    {t("receptions.receptionCreated", { number: recepcionCreada.NumeroRecepcion })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
                  >
                    {t("common:buttons.close")}
                  </button>
                  {onCreateFactura && (
                    <button
                      onClick={handleCrearFactura}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t("receptions.registerInvoice")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
