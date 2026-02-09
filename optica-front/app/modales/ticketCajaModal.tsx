// app/modales/ticketCajaModal.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchModosPago,
  createTicketVenta,
  fetchClienteFacturaSimplificada,
  type ModoPago,
  type TicketVentaResult,
  type ClienteSimplificado,
} from "~/lib/cajaRest";
import { fetchProductosFullPage, fetchFamiliasProductos, type ProductoListItem } from "~/lib/productosFullRest";
import { fetchServicios, fetchFamiliasServicios, type Servicio, type FamiliaServicio } from "~/lib/serviciosRest";
import { fetchClientesFullPage, fetchClienteDescuento, type DescuentoCliente } from "~/lib/clientesListadoRest";

type Props = {
  onClose: () => void;
  onSuccess: (result: TicketVentaResult) => void;
};

type ClienteTicket = {
  id: number;
  nombre: string;
  documentoFiscal: string | null;
  telefono?: string | null;
  esFacturaSimplificada: boolean;
};

type TicketLinea = {
  key: string;
  tipo: "PRODUCTO" | "SERVICIO";
  idItem: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  pcIva: number;
  stock?: number;
};

type ItemBusqueda = {
  tipo: "PRODUCTO" | "SERVICIO";
  id: number;
  codigo: string;
  nombre: string;
  pvp: number;
  pcIva: number;
  stock?: number;
};

type FamiliaProducto = {
  IdFamiliaProducto: number;
  Descripcion: string;
  subfamilias?: { IdSubFamiliaProducto: number; Descripcion: string }[];
};

export default function TicketCajaModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation(["ventas", "common"]);

  // Cliente
  const [clienteDefault, setClienteDefault] = useState<ClienteSimplificado>(null);
  const [cliente, setCliente] = useState<ClienteTicket | null>(null);
  const [clienteLoading, setClienteLoading] = useState(true);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [clienteSearchQuery, setClienteSearchQuery] = useState("");
  const [clienteSearchResults, setClienteSearchResults] = useState<any[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  // Descuento del cliente
  const [descuentoCliente, setDescuentoCliente] = useState<DescuentoCliente | null>(null);
  const [descuentoManual, setDescuentoManual] = useState<string>("");

  // Lineas del ticket
  const [lineas, setLineas] = useState<TicketLinea[]>([]);

  // Busqueda de productos/servicios
  const [busqueda, setBusqueda] = useState("");
  const [tipoBusqueda, setTipoBusqueda] = useState<"productos" | "servicios">("productos");
  const [resultados, setResultados] = useState<ItemBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Familias y subfamilias
  const [familiasProductos, setFamiliasProductos] = useState<FamiliaProducto[]>([]);
  const [familiasServicios, setFamiliasServicios] = useState<FamiliaServicio[]>([]);
  const [selectedFamilia, setSelectedFamilia] = useState<number | null>(null);
  const [selectedSubfamilia, setSelectedSubfamilia] = useState<number | null>(null);

  // Pago
  const [modosPago, setModosPago] = useState<ModoPago[]>([]);
  const [selectedModoPago, setSelectedModoPago] = useState<number | null>(null);

  // Estado
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCreado, setTicketCreado] = useState<TicketVentaResult | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    // Cargar cliente por defecto (factura simplificada)
    fetchClienteFacturaSimplificada()
      .then((c) => {
        setClienteDefault(c);
        if (c) {
          setCliente({
            id: c.id,
            nombre: c.nombre,
            documentoFiscal: c.documentoFiscal,
            esFacturaSimplificada: c.esFacturaSimplificada,
          });
        }
        setClienteLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando cliente default:", err);
        setClienteLoading(false);
      });

    // Cargar modos de pago
    fetchModosPago()
      .then((mp) => {
        setModosPago(mp);
        const efectivo = mp.find((m) => m.descripcion.toLowerCase().includes("efectivo"));
        setSelectedModoPago(efectivo?.id ?? mp[0]?.id ?? null);
      })
      .catch(console.error);

    // Cargar familias de productos
    fetchFamiliasProductos()
      .then((fams) => setFamiliasProductos(fams ?? []))
      .catch(console.error);

    // Cargar familias de servicios
    fetchFamiliasServicios()
      .then((fams) => setFamiliasServicios(fams ?? []))
      .catch(console.error);
  }, []);

  // Buscar clientes con debounce
  useEffect(() => {
    if (clienteSearchQuery.length < 2) {
      setClienteSearchResults([]);
      return;
    }

    setBuscandoCliente(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetchClientesFullPage({
          q: clienteSearchQuery,
          take: 10,
          offset: 0,
          soloActivos: true,
        });
        setClienteSearchResults(res.rows ?? []);
      } catch (err) {
        console.error("Error buscando clientes:", err);
      } finally {
        setBuscandoCliente(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [clienteSearchQuery]);

  // Cargar descuento cuando cambia el cliente
  useEffect(() => {
    if (cliente && !cliente.esFacturaSimplificada) {
      fetchClienteDescuento(String(cliente.id))
        .then(setDescuentoCliente)
        .catch(() => setDescuentoCliente(null));
    } else {
      setDescuentoCliente(null);
    }
  }, [cliente]);

  // Buscar items con debounce
  useEffect(() => {
    if (busqueda.length < 2 && !selectedFamilia && !selectedSubfamilia) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    const timeout = setTimeout(async () => {
      try {
        if (tipoBusqueda === "productos") {
          const res = await fetchProductosFullPage(20, 0, {
            q: busqueda || undefined,
            idFamilia: selectedFamilia || undefined,
            idSubfamilia: selectedSubfamilia || undefined,
          });
          setResultados(
            res.data.map((p: ProductoListItem) => ({
              tipo: "PRODUCTO" as const,
              id: p.id,
              codigo: p.Codigo || "",
              nombre: p.Nombre,
              pvp: Number(p.PVP) || 0,
              pcIva: 21,
              stock: p.Stock,
            }))
          );
        } else {
          const res = await fetchServicios({
            take: 20,
            q: busqueda || undefined,
            idFamilia: selectedFamilia || undefined,
            idSubFamilia: selectedSubfamilia || undefined,
          });
          setResultados(
            res.data.map((s: Servicio) => ({
              tipo: "SERVICIO" as const,
              id: s.id,
              codigo: s.Codigo || "",
              nombre: s.Nombre,
              pvp: Number(s.PVP) || 0,
              pcIva: Number(s.PorcentajeIva) || 21,
            }))
          );
        }
      } catch (err) {
        console.error("Error buscando:", err);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [busqueda, tipoBusqueda, selectedFamilia, selectedSubfamilia]);

  // Reset familia/subfamilia cuando cambia el tipo de busqueda
  useEffect(() => {
    setSelectedFamilia(null);
    setSelectedSubfamilia(null);
  }, [tipoBusqueda]);

  // Seleccionar cliente
  const handleSelectCliente = (c: any) => {
    setCliente({
      id: c.id,
      nombre: c.nombreCompleto || c.nombre || "Cliente",
      documentoFiscal: c.documentoFiscal || c.nif || null,
      telefono: c.telefono1 || c.telefono2 || null,
      esFacturaSimplificada: false,
    });
    setShowClienteSearch(false);
    setClienteSearchQuery("");
    setClienteSearchResults([]);
  };

  // Volver a factura simplificada
  const handleVolverFacturaSimplificada = () => {
    if (clienteDefault) {
      setCliente({
        id: clienteDefault.id,
        nombre: clienteDefault.nombre,
        documentoFiscal: clienteDefault.documentoFiscal,
        esFacturaSimplificada: clienteDefault.esFacturaSimplificada,
      });
    } else {
      setCliente(null);
    }
    setShowClienteSearch(false);
    setDescuentoManual("");
  };

  // Anadir linea
  const addLinea = useCallback((item: ItemBusqueda) => {
    setLineas((prev) => {
      const existing = prev.find((l) => l.tipo === item.tipo && l.idItem === item.id);
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          tipo: item.tipo,
          idItem: item.id,
          codigo: item.codigo,
          descripcion: item.nombre,
          cantidad: 1,
          precioUnitario: item.pvp,
          pcIva: item.pcIva,
          stock: item.stock,
        },
      ];
    });
    setBusqueda("");
  }, []);

  // Actualizar cantidad
  const updateCantidad = useCallback((key: string, cantidad: number) => {
    if (cantidad < 1) return;
    setLineas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, cantidad } : l))
    );
  }, []);

  // Eliminar linea
  const removeLinea = useCallback((key: string) => {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }, []);

  // Calcular descuento total (cliente + manual)
  const descuentoTotal = useMemo(() => {
    let dto = 0;
    if (descuentoCliente && descuentoCliente.descuento > 0 && descuentoCliente.esPorcentaje) {
      dto += descuentoCliente.descuento;
    }
    if (descuentoManual && !isNaN(parseFloat(descuentoManual))) {
      dto += parseFloat(descuentoManual);
    }
    return Math.min(dto, 100); // Maximo 100%
  }, [descuentoCliente, descuentoManual]);

  // Calcular totales
  const totales = useMemo(() => {
    let subtotal = 0;
    let baseTotal = 0;
    let ivaTotal = 0;

    for (const l of lineas) {
      const lineaSubtotal = l.cantidad * l.precioUnitario;
      subtotal += lineaSubtotal;
    }

    // Aplicar descuento al subtotal
    const descuentoImporte = subtotal * (descuentoTotal / 100);
    const subtotalConDescuento = subtotal - descuentoImporte;

    // Recalcular base e IVA con el descuento aplicado proporcionalmente
    for (const l of lineas) {
      const lineaSubtotal = l.cantidad * l.precioUnitario;
      const proporcion = subtotal > 0 ? lineaSubtotal / subtotal : 0;
      const lineaConDescuento = subtotalConDescuento * proporcion;
      const lineaBase = lineaConDescuento / (1 + l.pcIva / 100);
      const lineaIva = lineaConDescuento - lineaBase;
      baseTotal += lineaBase;
      ivaTotal += lineaIva;
    }

    return {
      subtotal,
      descuentoImporte,
      base: baseTotal,
      iva: ivaTotal,
      total: baseTotal + ivaTotal,
    };
  }, [lineas, descuentoTotal]);

  // Procesar pago
  const handleCobrar = async () => {
    if (lineas.length === 0) {
      setError(t("ticket.addAtLeastOneItem"));
      return;
    }
    if (!selectedModoPago) {
      setError(t("ticket.selectPaymentMethod"));
      return;
    }

    setProcesando(true);
    setError(null);

    try {
      // Calcular precios con descuento aplicado
      const factorDescuento = 1 - (descuentoTotal / 100);

      const result = await createTicketVenta({
        idCliente: cliente?.esFacturaSimplificada ? null : cliente?.id,
        lineas: lineas.map((l) => ({
          tipo: l.tipo,
          idItem: l.idItem,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario * factorDescuento,
          descripcion: l.descripcion,
        })),
        idModoPago: selectedModoPago,
        observaciones: descuentoTotal > 0 ? `Descuento aplicado: ${descuentoTotal}%` : undefined,
      });

      setTicketCreado(result);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("ticket.errorProcessingTicket"));
    } finally {
      setProcesando(false);
    }
  };

  // Subfamilias disponibles segun familia seleccionada
  const subfamiliasDisponibles = useMemo(() => {
    if (!selectedFamilia) return [];
    if (tipoBusqueda === "productos") {
      const familia = familiasProductos.find((f) => f.IdFamiliaProducto === selectedFamilia);
      return familia?.subfamilias ?? [];
    } else {
      const familia = familiasServicios.find((f) => f.id === selectedFamilia);
      return familia?.subfamilias ?? [];
    }
  }, [selectedFamilia, tipoBusqueda, familiasProductos, familiasServicios]);

  // Si el ticket se creo, mostrar confirmacion
  if (ticketCreado) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t("ticket.ticketCreated")}</h3>
              <p className="text-slate-500 mt-1">
                {t("ticket.invoiceNumber", { series: ticketCreado.factura.serie, number: ticketCreado.factura.numero })}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">{t("ticket.client")}</span>
                <span className="font-medium">{ticketCreado.factura.nombreCliente}</span>
              </div>
              {descuentoTotal > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">{t("ticket.discount")}</span>
                  <span className="font-medium text-orange-600">{descuentoTotal}%</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">{t("ticket.taxBase")}</span>
                <span className="font-mono">{ticketCreado.factura.totalBaseImponible.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">{t("ticket.vat")}</span>
                <span className="font-mono">{ticketCreado.factura.totalCuotaIva.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">{t("ticket.total")}</span>
                <span className="font-bold text-emerald-600 font-mono">{ticketCreado.factura.totalFactura.toFixed(2)} EUR</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSuccess(ticketCreado);
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                {t("common:buttons.close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t("ticket.title")}</h2>
                <p className="text-xs text-slate-500">{t("ticket.subtitle")}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Cliente */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-500 uppercase mb-2">{t("ticket.client")}</label>

              {!showClienteSearch ? (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    {clienteLoading ? (
                      <span className="text-slate-400">{t("common:messages.loading")}</span>
                    ) : cliente ? (
                      <div>
                        <span className="font-medium text-slate-900">{cliente.nombre}</span>
                        {cliente.documentoFiscal && (
                          <span className="ml-2 text-sm text-slate-500">({cliente.documentoFiscal})</span>
                        )}
                        {cliente.esFacturaSimplificada && (
                          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                            {t("ticket.simplifiedInvoice")}
                          </span>
                        )}
                        {descuentoCliente && descuentoCliente.descuento > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                            {t("ticket.discountOrigin", { percent: descuentoCliente.descuento, origin: descuentoCliente.origen })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">{t("ticket.simplifiedInvoiceNoClient")}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowClienteSearch(true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t("ticket.change")}
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={clienteSearchQuery}
                        onChange={(e) => setClienteSearchQuery(e.target.value)}
                        placeholder={t("ticket.searchClientPlaceholder")}
                        className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm pl-10"
                        autoFocus
                      />
                      <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {buscandoCliente && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleVolverFacturaSimplificada}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      {t("ticket.simplifiedInvoice")}
                    </button>
                    <button
                      onClick={() => {
                        setShowClienteSearch(false);
                        setClienteSearchQuery("");
                        setClienteSearchResults([]);
                      }}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      {t("common:buttons.cancel")}
                    </button>
                  </div>

                  {clienteSearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                      {clienteSearchResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCliente(c)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{c.nombreCompleto || c.nombre}</div>
                            <div className="text-xs text-slate-500">
                              {c.nif && <span className="mr-3">NIF: {c.nif}</span>}
                              {c.telefono1 && <span>Tel: {c.telefono1}</span>}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Descuento manual */}
            {lineas.length > 0 && (
              <div className="mb-6 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">{t("ticket.additionalDiscount")}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={descuentoManual}
                    onChange={(e) => setDescuentoManual(e.target.value)}
                    placeholder="0"
                    className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-right"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                {descuentoTotal > 0 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-lg">
                    {t("ticket.totalDiscount", { percent: descuentoTotal })}
                    {descuentoCliente && descuentoCliente.descuento > 0 && (
                      <span className="text-xs ml-1">
                        ({t("ticket.clientDiscount", { percent: descuentoCliente.descuento })}{descuentoManual ? ` + ${t("ticket.manualDiscount", { percent: descuentoManual })}` : ""})
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Buscador de productos/servicios */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-500 uppercase mb-2">{t("ticket.searchProductsServices")}</label>

              {/* Selector productos/servicios */}
              <div className="flex gap-2 mb-3">
                <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setTipoBusqueda("productos")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      tipoBusqueda === "productos"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {t("ticket.products")}
                  </button>
                  <button
                    onClick={() => setTipoBusqueda("servicios")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      tipoBusqueda === "servicios"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {t("ticket.services")}
                  </button>
                </div>
              </div>

              {/* Filtros por familia/subfamilia */}
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedFamilia || ""}
                  onChange={(e) => {
                    setSelectedFamilia(e.target.value ? Number(e.target.value) : null);
                    setSelectedSubfamilia(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[180px]"
                >
                  <option value="">{t("ticket.allFamilies")}</option>
                  {tipoBusqueda === "productos"
                    ? familiasProductos.map((f) => (
                        <option key={f.IdFamiliaProducto} value={f.IdFamiliaProducto}>
                          {f.Descripcion}
                        </option>
                      ))
                    : familiasServicios.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.descripcion}
                        </option>
                      ))}
                </select>

                {selectedFamilia && subfamiliasDisponibles.length > 0 && (
                  <select
                    value={selectedSubfamilia || ""}
                    onChange={(e) => setSelectedSubfamilia(e.target.value ? Number(e.target.value) : null)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[180px]"
                  >
                    <option value="">{t("ticket.allSubfamilies")}</option>
                    {tipoBusqueda === "productos"
                      ? subfamiliasDisponibles.map((sf: any) => (
                          <option key={sf.IdSubFamiliaProducto} value={sf.IdSubFamiliaProducto}>
                            {sf.Descripcion}
                          </option>
                        ))
                      : subfamiliasDisponibles.map((sf: any) => (
                          <option key={sf.id} value={sf.id}>
                            {sf.descripcion}
                          </option>
                        ))}
                  </select>
                )}

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder={t("ticket.searchPlaceholder", { type: tipoBusqueda === "productos" ? t("ticket.products").toLowerCase() : t("ticket.services").toLowerCase() })}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm pl-10"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {buscando && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Resultados de busqueda */}
              {resultados.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {resultados.map((item) => (
                    <button
                      key={`${item.tipo}-${item.id}`}
                      onClick={() => addLinea(item)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{item.nombre}</div>
                        <div className="text-xs text-slate-500">
                          {item.codigo && <span className="mr-2">{item.codigo}</span>}
                          <span className={item.tipo === "PRODUCTO" ? "text-blue-600" : "text-purple-600"}>
                            {item.tipo === "PRODUCTO" ? t("ticket.product") : t("ticket.service")}
                          </span>
                          {item.stock !== undefined && (
                            <span className="ml-2 text-slate-400">{t("ticket.stock", { count: item.stock })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-slate-900">{item.pvp.toFixed(2)} EUR</span>
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lineas del ticket */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-500 uppercase mb-2">
                {t("ticket.ticketLines", { count: lineas.length })}
              </label>
              {lineas.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>{t("ticket.addProductsToStart")}</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">{t("table.description")}</th>
                        <th className="px-4 py-2 text-center w-24">{t("table.quantity")}</th>
                        <th className="px-4 py-2 text-right w-28">{t("table.price")}</th>
                        <th className="px-4 py-2 text-right w-28">{t("ticket.total")}</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineas.map((linea) => (
                        <tr key={linea.key} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 text-sm">{linea.descripcion}</div>
                            <div className="text-xs text-slate-500">
                              {linea.codigo && <span className="mr-2">{linea.codigo}</span>}
                              <span className={linea.tipo === "PRODUCTO" ? "text-blue-600" : "text-purple-600"}>
                                {linea.tipo === "PRODUCTO" ? t("ticket.product") : t("ticket.service")}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateCantidad(linea.key, linea.cantidad - 1)}
                                disabled={linea.cantidad <= 1}
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-50"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={linea.cantidad}
                                onChange={(e) => updateCantidad(linea.key, parseInt(e.target.value) || 1)}
                                className="w-12 text-center rounded-lg border border-slate-200 py-1 text-sm"
                              />
                              <button
                                onClick={() => updateCantidad(linea.key, linea.cantidad + 1)}
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">{linea.precioUnitario.toFixed(2)} EUR</td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-sm">
                            {(linea.cantidad * linea.precioUnitario).toFixed(2)} EUR
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeLinea(linea.key)}
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totales */}
            {lineas.length > 0 && (
              <div className="mb-6 flex justify-end">
                <div className="w-72 bg-slate-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">{t("ticket.subtotal")}</span>
                    <span className="font-mono">{totales.subtotal.toFixed(2)} EUR</span>
                  </div>
                  {descuentoTotal > 0 && (
                    <div className="flex justify-between text-sm mb-2 text-orange-600">
                      <span>{t("ticket.discountPercent", { percent: descuentoTotal })}</span>
                      <span className="font-mono">-{totales.descuentoImporte.toFixed(2)} EUR</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">{t("ticket.taxBase")}</span>
                    <span className="font-mono">{totales.base.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">{t("ticket.vat")}</span>
                    <span className="font-mono">{totales.iva.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">{t("ticket.total")}</span>
                    <span className="font-bold text-emerald-600 text-lg font-mono">{totales.total.toFixed(2)} EUR</span>
                  </div>
                </div>
              </div>
            )}

            {/* Forma de pago */}
            {lineas.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-2">{t("ticket.paymentMethod")}</label>
                <div className="flex flex-wrap gap-2">
                  {modosPago.map((mp) => (
                    <button
                      key={mp.id}
                      onClick={() => setSelectedModoPago(mp.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedModoPago === mp.id
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {mp.descripcion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm hover:bg-white"
            >
              {t("common:buttons.cancel")}
            </button>
            <button
              onClick={handleCobrar}
              disabled={procesando || lineas.length === 0 || !selectedModoPago}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {procesando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("ticket.processing")}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {t("ticket.charge", { amount: totales.total.toFixed(2) })}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
