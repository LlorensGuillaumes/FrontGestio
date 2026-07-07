// app/modales/documentoModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchDocumento,
  createDocumento,
  updateDocumento,
  cambiarEstadoDocumento,
  type DocumentoFull,
} from "~/lib/documentosRest";
import { fetchProductosFullPage, fetchFamiliasProductos } from "~/lib/productosFullRest";
import { fetchClienteUltimaGraduacion, fetchClienteDescuento, type DescuentoCliente } from "~/lib/clientesListadoRest";
import { createFacturaFinal, createFacturaAnticipo, type Factura } from "~/lib/facturasRest";
import { fetchModosPago, registrarCobroFactura, type ModoPago } from "~/lib/cajaRest";
import { fetchDatosEmpresa } from "~/lib/empresaRest";
import DocumentoPDF from "~/components/DocumentoPDF";
import FacturaPDF from "~/components/FacturaPDF";
import { useAuth } from "~/contexts/AuthContext";

export type DocumentoModalMode = "new" | "view" | "edit";

type Props = {
  mode: DocumentoModalMode;
  id?: string;
  idCliente?: string;
  nombreCliente?: string;
  onClose: () => void;
  onSaved: () => void;
  onEdit?: () => void;
  onView?: () => void;
};

const ESTADOS_KEYS = ["pending", "confirmed", "inProcess", "ready", "delivered"] as const;
const ESTADOS_VALUES = ["PENDIENTE", "CONFIRMADO", "EN_PROCESO", "LISTO", "ENTREGADO"];
const ESTADOS_COLORS = [
  "bg-yellow-100 text-yellow-800",
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100 text-green-800",
  "bg-emerald-100 text-emerald-800"
];

type LineaForm = {
  tipo: string;
  idProducto?: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  porcentajeIva: number;
};

const emptyLinea = (): LineaForm => ({
  tipo: "PRODUCTO",
  codigo: "",
  descripcion: "",
  cantidad: 1,
  precioUnitario: 0,
  descuento: 0,
  porcentajeIva: 21,
});

// Formatea fecha actual como DD/MM/YYYY
function getTodayDMY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Convierte DD/MM/YYYY a YYYY-MM-DD para PostgreSQL
function dmyToISO(dmy: string): string | null {
  if (!dmy) return null;
  const parts = dmy.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

export default function DocumentoModal({
  mode: initialMode,
  id: initialId,
  idCliente,
  nombreCliente,
  onClose,
  onSaved,
  onEdit,
  onView,
}: Props) {
  const { t, i18n } = useTranslation(["ventas", "common"]);
  const { config } = useAuth();
  const locale = i18n.language === "ca" ? "ca-ES" : "es-ES";

  // Verificar si el módulo de óptica está habilitado
  const showOpticaModule = config?.mostrarModuloOptica ?? false;

  // Estados traducidos
  const ESTADOS = useMemo(() =>
    ESTADOS_KEYS.map((key, idx) => ({
      value: ESTADOS_VALUES[idx],
      label: t(`statuses.${key}`),
      color: ESTADOS_COLORS[idx]
    })), [t]);

  // Estado interno para permitir cambio de modo después de crear
  const [currentMode, setCurrentMode] = useState<DocumentoModalMode>(initialMode);
  const [currentId, setCurrentId] = useState<string | undefined>(initialId);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const isNew = currentMode === "new";
  const isView = currentMode === "view";
  const isEdit = currentMode === "edit";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para mostrar PDF del documento
  const [showPDF, setShowPDF] = useState(false);

  // Estado para mostrar PDF de factura
  const [showFacturaPDF, setShowFacturaPDF] = useState(false);
  const [facturaGenerada, setFacturaGenerada] = useState<Factura | null>(null);
  const [entregando, setEntregando] = useState(false);
  const [creandoAnticipo, setCreandoAnticipo] = useState(false);

  // Estado para modal de cobro al entregar
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [modosPago, setModosPago] = useState<ModoPago[]>([]);
  const [selectedModoPago, setSelectedModoPago] = useState<number | null>(null);
  const [referenciaPago, setReferenciaPago] = useState("");
  const [facturaParaCobrar, setFacturaParaCobrar] = useState<Factura | null>(null);

  // Estado para modal de anticipo
  const [showAnticipoModal, setShowAnticipoModal] = useState(false);
  const [selectedModoPagoAnticipo, setSelectedModoPagoAnticipo] = useState<number | null>(null);

  // Form state
  const [tipo, setTipo] = useState("ENCARGO"); // Por defecto ENCARGO
  const [estado, setEstado] = useState("PENDIENTE");
  const [fecha, setFecha] = useState(getTodayDMY()); // Fecha de hoy por defecto
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [observacionesInternas, setObservacionesInternas] = useState("");
  const [pagoACuenta, setPagoACuenta] = useState("0");
  const [validezDias, setValidezDias] = useState<string>("");
  const [validezDiasDefault, setValidezDiasDefault] = useState<number>(30);

  // Graduación OD
  const [odEsfera, setOdEsfera] = useState("");
  const [odCilindro, setOdCilindro] = useState("");
  const [odEje, setOdEje] = useState("");
  const [odAdicion, setOdAdicion] = useState("");
  const [odDnp, setOdDnp] = useState("");
  const [odAltura, setOdAltura] = useState("");

  // Graduación OI
  const [oiEsfera, setOiEsfera] = useState("");
  const [oiCilindro, setOiCilindro] = useState("");
  const [oiEje, setOiEje] = useState("");
  const [oiAdicion, setOiAdicion] = useState("");
  const [oiDnp, setOiDnp] = useState("");
  const [oiAltura, setOiAltura] = useState("");

  const [dipLejos, setDipLejos] = useState("");
  const [dipCerca, setDipCerca] = useState("");

  // Líneas
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  // Productos lookup
  const [productosLookup, setProductosLookup] = useState<any[]>([]);
  const [familiasLookup, setFamiliasLookup] = useState<any[]>([]);
  const [filtroFamilia, setFiltroFamilia] = useState<number | null>(null);
  const [filtroSubFamilia, setFiltroSubFamilia] = useState<number | null>(null);

  // Documento loaded
  const [documento, setDocumento] = useState<DocumentoFull | null>(null);

  // Info de graduación cargada
  const [graduacionInfo, setGraduacionInfo] = useState<string | null>(null);

  // Descuento del cliente por grupo
  const [descuentoCliente, setDescuentoCliente] = useState<DescuentoCliente | null>(null);

  const title = useMemo(() => {
    if (isNew) return t("documents.newOrder");
    if (isEdit) return t("documents.editDocument");
    return `${t("documents.documentDetail")} ${documento?.NumeroDocumento ?? ""}`;
  }, [isNew, isEdit, documento, t]);

  // Load productos, familias y modos de pago lookup
  useEffect(() => {
    fetchProductosFullPage(500, 0, { soloActivos: true })
      .then((res) => setProductosLookup(res.data ?? []))
      .catch(console.error);

    fetchFamiliasProductos()
      .then((res) => setFamiliasLookup(res ?? []))
      .catch(console.error);

    fetchModosPago()
      .then((res) => {
        setModosPago(res);
        // Seleccionar efectivo por defecto si existe
        const efectivo = res.find((m) => m.descripcion.toLowerCase().includes("efectivo"));
        if (efectivo) setSelectedModoPago(efectivo.id);
        else if (res.length > 0) setSelectedModoPago(res[0].id);
      })
      .catch(console.error);

    // Cargar datos de empresa para valor por defecto de validez
    fetchDatosEmpresa()
      .then((empresa) => {
        const plazo = empresa.PlazoConfirmacionDias || 30;
        setValidezDiasDefault(plazo);
      })
      .catch(console.error);
  }, []);

  // Cargar última graduación del cliente cuando es nuevo
  useEffect(() => {
    if (!isNew || !idCliente) return;

    fetchClienteUltimaGraduacion(idCliente)
      .then((data) => {
        if (data.graduacion) {
          setOdEsfera(data.graduacion.odEsfera?.toString() ?? "");
          setOdCilindro(data.graduacion.odCilindro?.toString() ?? "");
          setOdEje(data.graduacion.odEje?.toString() ?? "");
          setOdAdicion(data.graduacion.odAdicion?.toString() ?? "");
          setOiEsfera(data.graduacion.oiEsfera?.toString() ?? "");
          setOiCilindro(data.graduacion.oiCilindro?.toString() ?? "");
          setOiEje(data.graduacion.oiEje?.toString() ?? "");
          setOiAdicion(data.graduacion.oiAdicion?.toString() ?? "");

          const fechaRev = data.fechaRevision
            ? new Date(data.fechaRevision).toLocaleDateString(locale)
            : "";
          setGraduacionInfo(t("graduation.fromRevision", { date: fechaRev }));
        } else {
          setGraduacionInfo(data.mensaje ?? t("graduation.noGraduation"));
        }
      })
      .catch((e) => {
        console.error("Error cargando graduación:", e);
        setGraduacionInfo(t("graduation.errorLoading"));
      });
  }, [isNew, idCliente]);

  // Cargar descuento del cliente cuando es nuevo o cuando se edita
  useEffect(() => {
    const clienteId = idCliente || documento?.IdCliente?.toString();
    if (!clienteId) return;

    fetchClienteDescuento(clienteId)
      .then((data) => {
        setDescuentoCliente(data);
      })
      .catch((e) => {
        console.error("Error cargando descuento del cliente:", e);
        setDescuentoCliente(null);
      });
  }, [idCliente, documento?.IdCliente]);

  // Load documento
  useEffect(() => {
    if (currentMode === "new" && !currentId) {
      resetForm();
      return;
    }

    if (!currentId) return;

    setLoading(true);
    setError(null);

    fetchDocumento(currentId)
      .then((data) => {
        setDocumento(data);
        populateForm(data);
      })
      .catch((e) => setError(e?.message ?? "Error cargando documento"))
      .finally(() => setLoading(false));
  }, [currentMode, currentId]);

  const resetForm = () => {
    setTipo("ENCARGO");
    setEstado("PENDIENTE");
    setFecha(getTodayDMY());
    setFechaEntrega("");
    setObservaciones("");
    setObservacionesInternas("");
    setPagoACuenta("0");
    setValidezDias(String(validezDiasDefault));
    setOdDnp("");
    setOdAltura("");
    setOiDnp("");
    setOiAltura("");
    setDipLejos("");
    setDipCerca("");
    setLineas([]);
  };

  const populateForm = (data: DocumentoFull) => {
    setTipo(data.Tipo ?? "ENCARGO");
    setEstado(data.Estado ?? "PENDIENTE");
    setFecha(data.Fecha ? new Date(data.Fecha).toLocaleDateString("es-ES") : getTodayDMY());
    setFechaEntrega(data.FechaEntrega ? data.FechaEntrega.split("T")[0] : "");
    setObservaciones(data.Observaciones ?? "");
    setObservacionesInternas(data.ObservacionesInternas ?? "");
    setPagoACuenta(data.PagoACuenta?.toString() ?? "0");
    setValidezDias(data.ValidezDias?.toString() ?? String(validezDiasDefault));

    setOdEsfera(data.OD_Esfera?.toString() ?? "");
    setOdCilindro(data.OD_Cilindro?.toString() ?? "");
    setOdEje(data.OD_Eje?.toString() ?? "");
    setOdAdicion(data.OD_Adicion?.toString() ?? "");
    setOdDnp(data.OD_DNP?.toString() ?? "");
    setOdAltura(data.OD_Altura?.toString() ?? "");

    setOiEsfera(data.OI_Esfera?.toString() ?? "");
    setOiCilindro(data.OI_Cilindro?.toString() ?? "");
    setOiEje(data.OI_Eje?.toString() ?? "");
    setOiAdicion(data.OI_Adicion?.toString() ?? "");
    setOiDnp(data.OI_DNP?.toString() ?? "");
    setOiAltura(data.OI_Altura?.toString() ?? "");

    setDipLejos(data.DIP_Lejos?.toString() ?? "");
    setDipCerca(data.DIP_Cerca?.toString() ?? "");

    setLineas(
      data.lineas?.map((l) => ({
        tipo: l.Tipo ?? "PRODUCTO",
        idProducto: l.IdProducto,
        codigo: l.Codigo ?? "",
        descripcion: l.Descripcion ?? "",
        cantidad: l.Cantidad ?? 1,
        precioUnitario: l.PrecioUnitario ?? 0,
        descuento: l.Descuento ?? 0,
        porcentajeIva: l.PorcentajeIva ?? 21,
      })) ?? []
    );
  };

  const toNum = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? null : n;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        idCliente: idCliente || documento?.IdCliente,
        tipo,
        estado,
        fecha: dmyToISO(fecha),
        fechaEntrega: fechaEntrega || null,
        observaciones,
        observacionesInternas,
        pagoACuenta: toNum(pagoACuenta) ?? 0,
        validezDias: toNum(validezDias) ?? validezDiasDefault,

        od_esfera: toNum(odEsfera),
        od_cilindro: toNum(odCilindro),
        od_eje: toNum(odEje),
        od_adicion: toNum(odAdicion),
        od_dnp: toNum(odDnp),
        od_altura: toNum(odAltura),

        oi_esfera: toNum(oiEsfera),
        oi_cilindro: toNum(oiCilindro),
        oi_eje: toNum(oiEje),
        oi_adicion: toNum(oiAdicion),
        oi_dnp: toNum(oiDnp),
        oi_altura: toNum(oiAltura),

        dip_lejos: toNum(dipLejos),
        dip_cerca: toNum(dipCerca),

        lineas: lineas.map((l) => ({
          tipo: l.tipo,
          idProducto: l.idProducto,
          codigo: l.codigo,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuento: l.descuento,
          porcentajeIva: l.porcentajeIva,
        })),
      };

      if (isNew) {
        const nuevoDoc = await createDocumento(payload);
        // Cambiar a modo vista con el documento creado
        setCurrentId(String(nuevoDoc.id));
        setDocumento(nuevoDoc);
        populateForm(nuevoDoc);
        setCurrentMode("view");
        setNeedsRefresh(true);
      } else if (currentId) {
        await updateDocumento(currentId, payload);
        // Recargar documento
        const docActualizado = await fetchDocumento(currentId);
        setDocumento(docActualizado);
        populateForm(docActualizado);
        // Volver a modo vista
        setCurrentMode("view");
        setNeedsRefresh(true);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmar = async () => {
    if (!currentId) return;

    // Contar productos que afectarán al stock
    const productosConStock = lineas.filter(
      (l) => l.idProducto && ["PRODUCTO", "LENTE", "MONTURA"].includes(l.tipo)
    );

    const mensaje = productosConStock.length > 0
      ? t("modals.confirmStockMessage", { count: productosConStock.length })
      : t("modals.confirmMessage");

    if (!window.confirm(mensaje)) return;

    setConfirmando(true);
    setError(null);

    try {
      const docActualizado = await cambiarEstadoDocumento(currentId, "CONFIRMADO");
      setDocumento(docActualizado);
      setEstado("CONFIRMADO");
      setNeedsRefresh(true);
      // Mostrar PDF automáticamente después de confirmar
      setShowPDF(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorConfirming"));
    } finally {
      setConfirmando(false);
    }
  };

  // Manejar cierre
  const handleClose = () => {
    if (needsRefresh) {
      onSaved();
    }
    onClose();
  };

  // Manejar entrega - abre modal para seleccionar forma de pago
  const handleEntregar = () => {
    if (!currentId) return;
    setShowCobroModal(true);
    setReferenciaPago("");
  };

  // Procesar entrega con cobro
  const handleProcesarEntrega = async () => {
    if (!currentId || !selectedModoPago) return;

    setEntregando(true);
    setError(null);
    setShowCobroModal(false);

    try {
      // 1. Crear la factura final
      const factura = await createFacturaFinal(currentId);
      setFacturaParaCobrar(factura);

      // 2. Calcular importe a cobrar (total - anticipo previo)
      const anticipo = Number(pagoACuenta) || 0;
      const importeACobrar = factura.TotalFactura - anticipo;

      // 3. Si hay importe a cobrar, registrar en caja
      if (importeACobrar > 0) {
        await registrarCobroFactura({
          idFactura: factura.IdFactura,
          idModoPago: selectedModoPago,
          importe: importeACobrar,
          referencia: referenciaPago || undefined,
        });
      }

      setFacturaGenerada(factura);
      setEstado("ENTREGADO");
      setNeedsRefresh(true);

      // Recargar documento para reflejar el nuevo estado
      const docActualizado = await fetchDocumento(currentId);
      setDocumento(docActualizado);
      populateForm(docActualizado);

      // Mostrar PDF de la factura
      setShowFacturaPDF(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorGeneratingInvoice"));
    } finally {
      setEntregando(false);
    }
  };

  // Manejar creación de factura de anticipo - mostrar modal
  const handleCrearAnticipo = () => {
    if (!currentId) return;

    const importe = Number(pagoACuenta) || 0;
    if (importe <= 0) {
      setError(t("messages.advanceAmountRequired"));
      return;
    }

    // Seleccionar primer modo de pago por defecto
    if (modosPago.length > 0 && !selectedModoPagoAnticipo) {
      setSelectedModoPagoAnticipo(modosPago[0].id);
    }

    setShowAnticipoModal(true);
  };

  // Procesar creación de anticipo con modo de pago seleccionado
  const handleProcesarAnticipo = async () => {
    if (!currentId || !selectedModoPagoAnticipo) return;

    const importe = Number(pagoACuenta) || 0;

    setCreandoAnticipo(true);
    setError(null);
    setShowAnticipoModal(false);

    try {
      const factura = await createFacturaAnticipo(currentId, importe, selectedModoPagoAnticipo);
      setFacturaGenerada(factura);
      setNeedsRefresh(true);
      // Recargar documento para reflejar el anticipo vinculado
      const docActualizado = await fetchDocumento(currentId);
      setDocumento(docActualizado);
      populateForm(docActualizado);
      // Mostrar PDF de la factura
      setShowFacturaPDF(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("messages.errorAdvanceInvoice"));
    } finally {
      setCreandoAnticipo(false);
    }
  };

  // Manejar edición
  const handleEdit = () => {
    setCurrentMode("edit");
  };

  // Líneas helpers
  const addLinea = () => setLineas([...lineas, emptyLinea()]);
  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));
  const updateLinea = (idx: number, field: keyof LineaForm, value: any) => {
    setLineas(lineas.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const selectProducto = (idx: number, prodId: number) => {
    const prod = productosLookup.find((p) => p.id === prodId);
    if (prod) {
      // Aplicar el mayor descuento: del producto o del grupo del cliente
      const descuentoProducto = prod.DescuentoFamilia ?? 0;
      const descuentoGrupo = descuentoCliente?.esPorcentaje ? (descuentoCliente?.descuento ?? 0) : 0;
      const descuentoAplicar = Math.max(descuentoProducto, descuentoGrupo);

      setLineas(
        lineas.map((l, i) =>
          i === idx
            ? {
                ...l,
                idProducto: prod.id,
                codigo: prod.Codigo ?? "",
                descripcion: prod.Nombre ?? "",
                precioUnitario: prod.PVP ?? 0,
                porcentajeIva: prod.PorcentajeIva ?? 21,
                descuento: descuentoAplicar,
              }
            : l
        )
      );
    }
  };

  // Obtener subfamilias de la familia seleccionada
  const subfamiliasDisponibles = useMemo(() => {
    if (!filtroFamilia) return [];
    const familia = familiasLookup.find((f: any) => f.IdFamiliaProducto === filtroFamilia);
    return familia?.subfamilias ?? [];
  }, [familiasLookup, filtroFamilia]);

  // Filtrar productos por familia y subfamilia
  const productosFiltrados = useMemo(() => {
    let filtered = productosLookup;

    if (filtroFamilia) {
      filtered = filtered.filter((p) =>
        p.subfamilias?.some((sf: any) => sf.id_familia === filtroFamilia)
      );
    }

    if (filtroSubFamilia) {
      filtered = filtered.filter((p) =>
        p.subfamilias?.some((sf: any) => sf.id_subfamilia === filtroSubFamilia)
      );
    }

    return filtered;
  }, [productosLookup, filtroFamilia, filtroSubFamilia]);

  // Totales
  const totales = useMemo(() => {
    let base = 0;
    let totalDescuentos = 0;
    let iva = 0;

    lineas.forEach((l) => {
      const bruto = l.cantidad * l.precioUnitario;
      const descuentoImporte = bruto * (l.descuento / 100);
      const subtotal = bruto - descuentoImporte;
      totalDescuentos += descuentoImporte;
      base += subtotal;
      iva += subtotal * (l.porcentajeIva / 100);
    });

    const total = base + iva;
    const pago = toNum(pagoACuenta) ?? 0;
    const pendiente = total - pago;

    return { base, iva, total, totalDescuentos, pendiente };
  }, [lineas, pagoACuenta]);

  const estadoInfo = ESTADOS.find((e) => e.value === estado) ?? ESTADOS[0];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <div className="text-lg font-bold text-slate-900">{title}</div>
              <div className="text-sm text-slate-600">
                {nombreCliente || (documento ? `${documento.NombreCliente ?? ""} ${documento.ApellidosCliente ?? ""}`.trim() : "")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                  {estadoInfo.label}
                </span>
              )}
              {isView && estado === "PENDIENTE" && (
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={confirmando}
                  className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {confirmando ? t("actions.confirming") : t("actions.confirm")}
                </button>
              )}
              {isView && documento && (
                <button
                  type="button"
                  onClick={() => setShowPDF(true)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {t("actions.pdf")}
                </button>
              )}
              {isView && estado === "PENDIENTE" && (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t("actions.edit")}
                </button>
              )}
              {isView && (estado === "PENDIENTE" || estado === "CONFIRMADO") && Number(pagoACuenta) > 0 && !documento?.IdFacturaAnticipo && (
                <button
                  type="button"
                  onClick={handleCrearAnticipo}
                  disabled={creandoAnticipo}
                  className="px-3 py-1.5 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                  {creandoAnticipo ? t("invoices.generating") : t("invoices.invoiceAdvance")}
                </button>
              )}
              {isView && estado === "CONFIRMADO" && (
                <button
                  type="button"
                  onClick={handleEntregar}
                  disabled={entregando}
                  className="px-3 py-1.5 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {entregando ? t("invoices.generating") : t("actions.deliver")}
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
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
                {error}
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}
            {loading ? (
              <div className="text-center py-8 text-slate-500">{t("messages.loading")}</div>
            ) : (
              <>
                {/* SECCIÓN 1: Datos generales + Graduación (siempre visible arriba) */}
                <div className={`grid ${showOpticaModule ? 'grid-cols-3' : 'grid-cols-1'} gap-6`}>
                  {/* Columna izquierda: Datos del documento */}
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">
                      {t("documents.documentData")}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.type")}</label>
                        <select
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value)}
                          disabled={isView}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                        >
                          <option value="ENCARGO">{t("documents.order")}</option>
                          <option value="PRESUPUESTO">{t("documents.budget")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.date")}</label>
                        <input
                          type="text"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          disabled={isView}
                          placeholder="DD/MM/YYYY"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    {!isNew && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.status")}</label>
                        <select
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                          disabled={isView}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                        >
                          {ESTADOS.map((e) => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t("fields.deliveryDate")}</label>
                      <input
                        type="date"
                        value={fechaEntrega}
                        onChange={(e) => setFechaEntrega(e.target.value)}
                        disabled={isView}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                    </div>

                    {/* Validez del presupuesto - solo si no está confirmado */}
                    {estado === "PENDIENTE" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          {t("fields.budgetValidity")}
                        </label>
                        <input
                          type="number"
                          value={validezDias}
                          onChange={(e) => setValidezDias(e.target.value)}
                          disabled={isView}
                          min={1}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                        />
                        {isView && validezDias && (
                          <p className="text-xs text-slate-400 mt-1">
                            {t("fields.validUntil")} {(() => {
                              const fechaDoc = documento?.Fecha ? new Date(documento.Fecha) : new Date();
                              fechaDoc.setDate(fechaDoc.getDate() + Number(validezDias));
                              return fechaDoc.toLocaleDateString(locale);
                            })()}
                          </p>
                        )}
                      </div>
                    )}

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
                  </div>

                  {/* Columna central y derecha: Graduación - Solo si módulo óptica está habilitado */}
                  {showOpticaModule && (
                    <div className="col-span-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                        <div className="text-sm font-bold text-slate-700">{t("graduation.title")}</div>
                        {graduacionInfo && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {graduacionInfo}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* OD */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="text-xs font-bold text-slate-600 mb-2">{t("graduation.rightEye")}</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500">{t("graduation.sphere")}</label>
                              <input type="text" value={odEsfera} onChange={(e) => setOdEsfera(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Cil</label>
                              <input type="text" value={odCilindro} onChange={(e) => setOdCilindro(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Eje</label>
                              <input type="text" value={odEje} onChange={(e) => setOdEje(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Add</label>
                              <input type="text" value={odAdicion} onChange={(e) => setOdAdicion(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">DNP</label>
                              <input type="text" value={odDnp} onChange={(e) => setOdDnp(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.0" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Altura</label>
                              <input type="text" value={odAltura} onChange={(e) => setOdAltura(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.0" />
                            </div>
                          </div>
                        </div>

                        {/* OI */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="text-xs font-bold text-slate-600 mb-2">{t("graduation.leftEye")}</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500">Esf</label>
                              <input type="text" value={oiEsfera} onChange={(e) => setOiEsfera(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Cil</label>
                              <input type="text" value={oiCilindro} onChange={(e) => setOiCilindro(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Eje</label>
                              <input type="text" value={oiEje} onChange={(e) => setOiEje(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Add</label>
                              <input type="text" value={oiAdicion} onChange={(e) => setOiAdicion(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">DNP</label>
                              <input type="text" value={oiDnp} onChange={(e) => setOiDnp(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.0" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500">Altura</label>
                              <input type="text" value={oiAltura} onChange={(e) => setOiAltura(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-white" placeholder="0.0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DIP */}
                      <div className="flex gap-4 mt-3 justify-center">
                        <div className="w-24">
                          <label className="block text-xs text-slate-500 text-center">DIP Lejos</label>
                          <input type="text" value={dipLejos} onChange={(e) => setDipLejos(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-slate-50" placeholder="0.0" />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-slate-500 text-center">DIP Cerca</label>
                          <input type="text" value={dipCerca} onChange={(e) => setDipCerca(e.target.value)} disabled={isView} className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-center disabled:bg-slate-50" placeholder="0.0" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECCIÓN 2: Líneas de productos (tipo TPV) */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-slate-700">{t("documents.products")}</div>
                      {descuentoCliente && descuentoCliente.descuento > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          {t("documents.clientDiscount", { discount: descuentoCliente.descuento })}
                          {descuentoCliente.origen && ` (${descuentoCliente.origen})`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={filtroFamilia ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setFiltroFamilia(val);
                          setFiltroSubFamilia(null);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      >
                        <option value="">{t("documents.allFamilies")}</option>
                        {familiasLookup.map((f: any) => (
                          <option key={f.IdFamiliaProducto} value={f.IdFamiliaProducto}>
                            {f.Descripcion}
                          </option>
                        ))}
                      </select>
                      {filtroFamilia && subfamiliasDisponibles.length > 0 && (
                        <select
                          value={filtroSubFamilia ?? ""}
                          onChange={(e) => setFiltroSubFamilia(e.target.value ? Number(e.target.value) : null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                        >
                          <option value="">{t("documents.allSubfamilies")}</option>
                          {subfamiliasDisponibles.map((sf: any) => (
                            <option key={sf.IdSubFamiliaProducto} value={sf.IdSubFamiliaProducto}>
                              {sf.Descripcion}
                            </option>
                          ))}
                        </select>
                      )}
                      {!isView && (
                        <button
                          type="button"
                          onClick={addLinea}
                          className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {t("documents.addLine")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabla de líneas */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-600">{t("table.product")}</th>
                          <th className="text-left p-3 font-medium text-slate-600 w-48">{t("table.description")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-20">{t("table.quantity")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-24">{t("table.price")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-20">{t("table.discount")}</th>
                          <th className="text-center p-3 font-medium text-slate-600 w-20">{t("table.vat")}</th>
                          <th className="text-right p-3 font-medium text-slate-600 w-28">{t("table.subtotal")}</th>
                          {!isView && <th className="w-12"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.length === 0 ? (
                          <tr>
                            <td colSpan={isView ? 7 : 8} className="p-8 text-center text-slate-400">
                              {t("documents.noProducts")}
                            </td>
                          </tr>
                        ) : (
                          lineas.map((l, idx) => {
                            // Obtener producto seleccionado si existe
                            const productoSeleccionado = l.idProducto
                              ? productosLookup.find((p) => p.id === l.idProducto)
                              : null;

                            // Si hay producto seleccionado y no está en filtrados, incluirlo
                            const productosParaSelect = productoSeleccionado &&
                              !productosFiltrados.some((p) => p.id === l.idProducto)
                                ? [productoSeleccionado, ...productosFiltrados]
                                : productosFiltrados;

                            return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-2">
                                <select
                                  value={l.idProducto ?? ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val) selectProducto(idx, val);
                                  }}
                                  disabled={isView}
                                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm disabled:bg-white"
                                >
                                  <option value="">{t("documents.selectProduct")}</option>
                                  {productosParaSelect.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.Nombre} - {Number(p.PVP ?? 0).toFixed(2)}€
                                    </option>
                                  ))}
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
                                {(l.cantidad * l.precioUnitario * (1 - l.descuento / 100)).toFixed(2)} €
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
                    <div className="w-80 p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t("totals.taxBase")}</span>
                        <span className="font-medium">{totales.base.toFixed(2)} €</span>
                      </div>
                      {totales.totalDescuentos > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>{t("totals.appliedDiscounts")}</span>
                          <span>-{totales.totalDescuentos.toFixed(2)} €</span>
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

                      {/* Pago a cuenta */}
                      <div className="pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm text-slate-600">{t("totals.advancePayment")}</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={pagoACuenta}
                              onChange={(e) => setPagoACuenta(e.target.value)}
                              disabled={isView}
                              step={0.01}
                              min={0}
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-sm text-right disabled:bg-slate-50"
                            />
                            <span className="text-sm">€</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-lg pt-2 border-t border-slate-300">
                        <span className="font-bold text-blue-700">{t("totals.pending")}</span>
                        <span className="font-bold text-blue-700">{totales.pendiente.toFixed(2)} €</span>
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
                {saving ? t("common:buttons.saving") : t("common:buttons.save")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview */}
      {showPDF && documento && (
        <DocumentoPDF
          documento={documento}
          clienteNombre={nombreCliente || `${documento.NombreCliente ?? ""} ${documento.ApellidosCliente ?? ""}`.trim()}
          onClose={() => setShowPDF(false)}
        />
      )}

      {/* Factura PDF Preview */}
      {showFacturaPDF && facturaGenerada && (
        <FacturaPDF
          factura={facturaGenerada}
          onClose={() => setShowFacturaPDF(false)}
        />
      )}

      {/* Modal de Cobro al Entregar */}
      {showCobroModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t("modals.deliverAndCollect")}</h3>

            {/* Resumen de importes */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t("modals.totalInvoice")}</span>
                <span className="font-medium">{totales.total.toFixed(2)} €</span>
              </div>
              {Number(pagoACuenta) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{t("modals.advancePaid")}</span>
                    <span>-{Number(pagoACuenta).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-blue-700 pt-2 border-t border-slate-200">
                    <span>{t("modals.toCollectNow")}</span>
                    <span>{(totales.total - Number(pagoACuenta)).toFixed(2)} €</span>
                  </div>
                </>
              )}
            </div>

            {/* Selector de modo de pago */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("modals.paymentMethod")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {modosPago.map((mp) => (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => setSelectedModoPago(mp.id)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      selectedModoPago === mp.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {mp.descripcion}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de referencia (solo si usa datafono o no es efectivo) */}
            {selectedModoPago && modosPago.find((m) => m.id === selectedModoPago)?.usaDatafono && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("modals.reference")}
                </label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder={t("modals.referenceHint")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCobroModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                type="button"
                onClick={handleProcesarEntrega}
                disabled={!selectedModoPago || entregando}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {entregando ? t("modals.processing") : t("modals.confirmDelivery")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anticipo */}
      {showAnticipoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t("modals.advanceInvoice")}</h3>

            {/* Resumen de importe */}
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-base font-bold text-amber-700">
                <span>{t("modals.advanceAmount")}</span>
                <span>{Number(pagoACuenta).toFixed(2)} €</span>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                {t("modals.advanceNote")}
              </p>
            </div>

            {/* Selector de modo de pago */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("modals.paymentMethod")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {modosPago.map((mp) => (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => setSelectedModoPagoAnticipo(mp.id)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      selectedModoPagoAnticipo === mp.id
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                    }`}
                  >
                    {mp.descripcion}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAnticipoModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                type="button"
                onClick={handleProcesarAnticipo}
                disabled={!selectedModoPagoAnticipo || creandoAnticipo}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {creandoAnticipo ? t("invoices.generating") : t("modals.generateAdvanceInvoice")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
