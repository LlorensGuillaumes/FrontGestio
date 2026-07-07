// app/modales/ordenCompraModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchOrdenCompra,
  createOrdenCompra,
  updateOrdenCompra,
  getEstadoOrden,
  ESTADOS_ORDEN,
  fetchProductosByProveedor,
  type OrdenCompraFull,
  type ProveedorLookup,
  type ProductoProveedor,
} from "~/lib/comprasRest";
import OrdenCompraPDF from "~/components/OrdenCompraPDF";

type Props = {
  mode: "new" | "view" | "edit";
  id?: number;
  proveedores: ProveedorLookup[];
  onClose: () => void;
  onSaved: () => void;
  onEdit?: () => void;
};

type LineaForm = {
  idProducto?: number;
  codigo: string;
  descripcion: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  precioUnitario: number;
  descuento: number;
  porcentajeIva: number;
  estadoLinea: string;
};

const emptyLinea = (): LineaForm => ({
  codigo: "",
  descripcion: "",
  cantidadPedida: 1,
  cantidadRecibida: 0,
  precioUnitario: 0,
  descuento: 0,
  porcentajeIva: 21,
  estadoLinea: "PENDIENTE",
});

export default function OrdenCompraModal({
  mode: initialMode,
  id: initialId,
  proveedores,
  onClose,
  onSaved,
  onEdit,
}: Props) {
  const { t } = useTranslation(["compras", "common"]);

  // Estados internos para poder cambiar de modo después de crear
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [currentId, setCurrentId] = useState(initialId);

  const isNew = currentMode === "new";
  const isView = currentMode === "view";
  const isEdit = currentMode === "edit";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [idProveedor, setIdProveedor] = useState<number | "">("");
  const [fechaOrden, setFechaOrden] = useState(new Date().toISOString().split("T")[0]);
  const [fechaEntregaPrevista, setFechaEntregaPrevista] = useState("");
  const [estado, setEstado] = useState("BORRADOR");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  // Productos lookup (por proveedor)
  const [productosLookup, setProductosLookup] = useState<ProductoProveedor[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Orden loaded
  const [orden, setOrden] = useState<OrdenCompraFull | null>(null);

  // Vista PDF
  const [showPDF, setShowPDF] = useState(false);

  // Flag para saber si hay que refrescar el listado al cerrar
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Función de cierre que refresca si es necesario
  const handleClose = () => {
    if (needsRefresh) {
      onSaved(); // Esto refresca Y cierra
    } else {
      onClose(); // Solo cierra
    }
  };

  // Load productos cuando cambia el proveedor
  useEffect(() => {
    if (!idProveedor) {
      setProductosLookup([]);
      return;
    }

    setLoadingProductos(true);
    fetchProductosByProveedor(Number(idProveedor))
      .then(setProductosLookup)
      .catch(console.error)
      .finally(() => setLoadingProductos(false));
  }, [idProveedor]);

  // Load orden
  useEffect(() => {
    if (isNew) {
      setLineas([emptyLinea()]);
      return;
    }

    if (!currentId) return;

    setLoading(true);
    setError(null);

    fetchOrdenCompra(currentId)
      .then((data) => {
        setOrden(data);
        setIdProveedor(data.IdProveedor);
        setFechaOrden(data.FechaOrden ? data.FechaOrden.split("T")[0] : "");
        setFechaEntregaPrevista(data.FechaEntregaPrevista ? data.FechaEntregaPrevista.split("T")[0] : "");
        setEstado(data.Estado);
        setObservaciones(data.Observaciones ?? "");
        setLineas(
          data.lineas?.map((l) => ({
            idProducto: l.IdProducto,
            codigo: l.Codigo ?? "",
            descripcion: l.Descripcion ?? "",
            cantidadPedida: l.CantidadPedida ?? 1,
            cantidadRecibida: l.CantidadRecibida ?? 0,
            precioUnitario: l.PrecioUnitario ?? 0,
            descuento: l.Descuento ?? 0,
            porcentajeIva: l.PorcentajeIva ?? 21,
            estadoLinea: l.EstadoLinea ?? "PENDIENTE",
          })) ?? []
        );
      })
      .catch((e) => setError(e?.message ?? t("messages.errorLoading")))
      .finally(() => setLoading(false));
  }, [currentMode, currentId]);

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
        idProveedor,
        fechaOrden,
        fechaEntregaPrevista: fechaEntregaPrevista || null,
        estado,
        observaciones,
        lineas: lineas.map((l) => ({
          idProducto: l.idProducto || null,
          codigo: l.codigo,
          descripcion: l.descripcion,
          cantidadPedida: l.cantidadPedida,
          precioUnitario: l.precioUnitario,
          descuento: l.descuento,
          porcentajeIva: l.porcentajeIva,
        })),
      };

      if (isNew) {
        // Crear y obtener la orden creada
        const nuevaOrden = await createOrdenCompra(payload);

        // Cargar la orden en el estado y cambiar a modo view
        setOrden(nuevaOrden);
        setCurrentId(nuevaOrden.id);
        setCurrentMode("view");
        setNeedsRefresh(true); // Marcar que hay que refrescar al cerrar

        return; // No cerrar el modal, el usuario puede imprimir/exportar
      } else if (currentId) {
        await updateOrdenCompra(currentId, payload);
        setNeedsRefresh(true);
        onSaved(); // En edición sí cerramos
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  // Lineas helpers
  const addLinea = () => setLineas([...lineas, emptyLinea()]);
  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));
  const updateLinea = (idx: number, field: keyof LineaForm, value: any) => {
    setLineas(lineas.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const selectProducto = (idx: number, prodId: number) => {
    const prod = productosLookup.find((p) => p.id === prodId);
    if (prod) {
      setLineas(
        lineas.map((l, i) =>
          i === idx
            ? {
                ...l,
                idProducto: prod.id,
                codigo: prod.Codigo ?? "",
                descripcion: prod.Nombre ?? "",
                precioUnitario: prod.PrecioProveedor ?? prod.PrecioCoste ?? prod.PVP ?? 0,
                porcentajeIva: 21,
              }
            : l
        )
      );
    }
  };

  // Totales
  const totales = useMemo(() => {
    let base = 0;
    let iva = 0;

    lineas.forEach((l) => {
      const bruto = l.cantidadPedida * l.precioUnitario;
      const descuentoImporte = bruto * (l.descuento / 100);
      const subtotal = bruto - descuentoImporte;
      base += subtotal;
      iva += subtotal * (l.porcentajeIva / 100);
    });

    return { base, iva, total: base + iva };
  }, [lineas]);

  const estadoInfo = getEstadoOrden(estado);
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
                {isNew ? t("orders.newOrder") : t("orders.orderDetail", { number: orden?.NumeroOrden ?? "" })}
              </div>
              <div className="text-sm text-slate-600">
                {proveedorNombre || orden?.NombreProveedor || t("fields.selectSupplier")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                  {estadoInfo.label}
                </span>
              )}
              {isView && orden && (
                <button
                  onClick={() => setShowPDF(true)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {t("common:buttons.print")} / PDF
                </button>
              )}
              {isView && ["BORRADOR", "ENVIADA", "PARCIAL"].includes(estado) && (
                <button
                  onClick={() => setCurrentMode("edit")}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t("common:buttons.edit")}
                </button>
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
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.supplierRequired")}</label>
                    <select
                      value={idProveedor}
                      onChange={(e) => setIdProveedor(Number(e.target.value) || "")}
                      disabled={isView}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    >
                      <option value="">{t("fields.selectSupplier")}</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.date")}</label>
                    <input
                      type="date"
                      value={fechaOrden}
                      onChange={(e) => setFechaOrden(e.target.value)}
                      disabled={isView}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t("orders.expectedDelivery")}</label>
                    <input
                      type="date"
                      value={fechaEntregaPrevista}
                      onChange={(e) => setFechaEntregaPrevista(e.target.value)}
                      disabled={isView}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.observations")}</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    disabled={isView}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                </div>

                {/* Lineas */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold text-slate-700">{t("orders.orderLines")}</div>
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
                          <th className="text-left p-3 font-medium text-slate-600">{t("table.product")}</th>
                          <th className="text-left p-3 font-medium text-slate-600 w-48">{t("table.description")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-20">{t("table.quantity")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.price")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-16">{t("table.discount")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-16">{t("table.vat")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.subtotal")}</th>
                          {!isView && <th className="w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.length === 0 ? (
                          <tr>
                            <td colSpan={isView ? 7 : 8} className="p-8 text-center text-slate-400">
                              {t("orders.noLines")}
                            </td>
                          </tr>
                        ) : (
                          lineas.map((l, idx) => {
                            const bruto = l.cantidadPedida * l.precioUnitario;
                            const descuentoImporte = bruto * (l.descuento / 100);
                            const subtotal = bruto - descuentoImporte;

                            return (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2">
                                  <select
                                    value={l.idProducto ?? ""}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (val) selectProducto(idx, val);
                                    }}
                                    disabled={isView || !idProveedor}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm disabled:bg-white"
                                  >
                                    {!idProveedor ? (
                                      <option value="">{t("orders.selectSupplierFirst")}</option>
                                    ) : loadingProductos ? (
                                      <option value="">{t("orders.loadingProducts")}</option>
                                    ) : productosLookup.length === 0 ? (
                                      <option value="">{t("orders.noProductsAssigned")}</option>
                                    ) : (
                                      <>
                                        <option value="">{t("table.select")}</option>
                                        {productosLookup.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.Codigo ? `${p.Codigo} - ` : ""}{p.Nombre}
                                          </option>
                                        ))}
                                      </>
                                    )}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={l.descripcion}
                                    onChange={(e) => updateLinea(idx, "descripcion", e.target.value)}
                                    disabled={isView}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={l.cantidadPedida}
                                    onChange={(e) => updateLinea(idx, "cantidadPedida", Number(e.target.value))}
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
                                    value={l.descuento}
                                    onChange={(e) => updateLinea(idx, "descuento", Number(e.target.value))}
                                    disabled={isView}
                                    min={0}
                                    max={100}
                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-center disabled:bg-white"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={l.porcentajeIva}
                                    onChange={(e) => updateLinea(idx, "porcentajeIva", Number(e.target.value))}
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
                                  {subtotal.toFixed(2)} €
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
          {!isView && (
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
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {saving ? t("messages.saving") : t("common:buttons.save")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vista PDF */}
      {showPDF && orden && (
        <OrdenCompraPDF
          orden={orden}
          proveedorNombre={proveedorNombre || orden.NombreProveedor || ""}
          onClose={() => setShowPDF(false)}
        />
      )}
    </div>
  );
}
