// app/components/OrdenCompraPDF.tsx
import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OrdenCompraFull } from "~/lib/comprasRest";
import { fetchDatosEmpresa, type DatosEmpresa } from "~/lib/empresaRest";

type Props = {
  orden: OrdenCompraFull;
  proveedorNombre: string;
  onClose: () => void;
};

export default function OrdenCompraPDF({ orden, proveedorNombre, onClose }: Props) {
  const { t, i18n } = useTranslation(["common", "compras"]);
  const printRef = useRef<HTMLDivElement>(null);
  const [datosEmpresa, setDatosEmpresa] = useState<DatosEmpresa | null>(null);

  const locale = i18n.language === "ca" ? "ca-ES" : "es-ES";

  useEffect(() => {
    fetchDatosEmpresa()
      .then(setDatosEmpresa)
      .catch(console.error);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;

    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`Orden_${orden.NumeroOrden}.pdf`);
  };

  // Calcular totales
  const lineas = orden.lineas ?? [];
  let baseImponible = 0;
  let totalIva = 0;

  const lineasConTotales = lineas.map((l) => {
    const cantidad = Number(l.CantidadPedida) || 0;
    const precio = Number(l.PrecioUnitario) || 0;
    const descuento = Number(l.Descuento) || 0;
    const iva = Number(l.PorcentajeIva) || 21;

    const bruto = cantidad * precio;
    const descuentoImporte = bruto * (descuento / 100);
    const neto = bruto - descuentoImporte;
    const ivaImporte = neto * (iva / 100);

    baseImponible += neto;
    totalIva += ivaImporte;

    return { ...l, cantidad, precio, descuento, iva, neto, ivaImporte };
  });

  const total = baseImponible + totalIva;

  // Datos empresa con valores por defecto
  const empresa = {
    nombre: datosEmpresa?.NombreComercial || datosEmpresa?.NombreEmpresa || "Mi Empresa",
    direccion: datosEmpresa?.Direccion || "",
    cpCiudad: [datosEmpresa?.CodigoPostal, datosEmpresa?.Poblacion, datosEmpresa?.Provincia]
      .filter(Boolean)
      .join(" "),
    cif: datosEmpresa?.CIF || "",
    telefono: datosEmpresa?.Telefono || "",
    email: datosEmpresa?.Email || "",
    logo: datosEmpresa?.LogoUrl || "",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Barra de acciones */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t("buttons.print")}
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t("buttons.downloadPdf")}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 shadow-lg"
        >
          {t("buttons.close")}
        </button>
      </div>

      {/* Documento */}
      <div className="bg-white max-h-[90vh] overflow-auto shadow-2xl print:shadow-none print:max-h-none print:overflow-visible">
        <div
          ref={printRef}
          className="w-[210mm] min-h-[297mm] p-10 bg-white text-black print:p-8"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {/* Cabecera */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-300">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{t("compras:orders.purchaseOrder")}</h1>
              <p className="text-lg text-slate-600 mt-1">{orden.NumeroOrden}</p>
            </div>
            <div className="text-right">
              {empresa.logo && (
                <img src={empresa.logo} alt="Logo" className="h-12 mb-2 ml-auto object-contain" />
              )}
              <div className="text-xl font-bold text-slate-800">{empresa.nombre}</div>
              <div className="text-sm text-slate-600 mt-1">
                {empresa.direccion && <p>{empresa.direccion}</p>}
                {empresa.cpCiudad && <p>{empresa.cpCiudad}</p>}
                {empresa.cif && <p>CIF: {empresa.cif}</p>}
                {empresa.telefono && <p>Tel: {empresa.telefono}</p>}
              </div>
            </div>
          </div>

          {/* Info proveedor y fechas */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("compras:fields.supplier")}</h3>
              <p className="text-lg font-semibold text-slate-800">{proveedorNombre}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">{t("compras:orders.orderDate")}</h3>
                  <p className="text-slate-800">
                    {orden.FechaOrden
                      ? new Date(orden.FechaOrden).toLocaleDateString(locale)
                      : "-"}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">{t("compras:orders.expectedDelivery")}</h3>
                  <p className="text-slate-800">
                    {orden.FechaEntregaPrevista
                      ? new Date(orden.FechaEntregaPrevista).toLocaleDateString(locale)
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de productos */}
          <table className="w-full mb-8 text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 text-left">{t("table.code")}</th>
                <th className="p-3 text-left">{t("table.description")}</th>
                <th className="p-3 text-center">{t("table.quantity")}</th>
                <th className="p-3 text-right">{t("table.price")}</th>
                <th className="p-3 text-center">{t("table.discount")}</th>
                <th className="p-3 text-center">{t("table.vat")}</th>
                <th className="p-3 text-right">{t("table.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {lineasConTotales.map((l, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="p-3 border-b border-slate-200">{l.Codigo || "-"}</td>
                  <td className="p-3 border-b border-slate-200">{l.Descripcion}</td>
                  <td className="p-3 border-b border-slate-200 text-center">{l.cantidad}</td>
                  <td className="p-3 border-b border-slate-200 text-right">{l.precio.toFixed(2)} €</td>
                  <td className="p-3 border-b border-slate-200 text-center">{l.descuento > 0 ? `${l.descuento}%` : "-"}</td>
                  <td className="p-3 border-b border-slate-200 text-center">{l.iva}%</td>
                  <td className="p-3 border-b border-slate-200 text-right font-medium">{l.neto.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("totals.taxBase")}</span>
                <span className="font-medium">{baseImponible.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("totals.vat")}</span>
                <span className="font-medium">{totalIva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-3 text-lg">
                <span className="font-bold">{t("totals.total")}</span>
                <span className="font-bold">{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {orden.Observaciones && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("pdf.observations")}</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{orden.Observaciones}</p>
            </div>
          )}

          {/* Pie */}
          <div className="mt-auto pt-8 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>{t("pdf.documentGenerated", { date: new Date().toLocaleDateString(locale), time: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
