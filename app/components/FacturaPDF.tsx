// app/components/FacturaPDF.tsx
import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Factura } from "~/lib/facturasRest";
import { fetchDatosEmpresa, type DatosEmpresa } from "~/lib/empresaRest";

type Props = {
  factura: Factura;
  onClose: () => void;
};

export default function FacturaPDF({ factura, onClose }: Props) {
  const { t, i18n } = useTranslation(["common", "ventas"]);
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
    pdf.save(`Factura_${factura.Serie}-${factura.Numero}.pdf`);
  };

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

  // Formatear fecha
  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString(locale);
  };

  // Título según tipo
  const getTitulo = () => {
    switch (factura.TipoFactura) {
      case "ANTICIPO":
        return t("ventas:invoices.advanceInvoice");
      case "FINAL":
        return t("ventas:invoices.invoice");
      default:
        return t("ventas:invoices.invoice");
    }
  };

  const clienteNombre = `${factura.NombreCliente || ""} ${factura.ApellidosCliente || ""}`.trim();
  const anticipo = Number(factura.anticipo) || 0;
  const totalFactura = Number(factura.TotalFactura) || 0;
  const pendiente = Number(factura.pendiente) || (totalFactura - anticipo);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      {/* Barra de acciones */}
      <div className="fixed top-4 right-4 z-[70] flex gap-2 print:hidden">
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
              <h1 className="text-3xl font-bold text-slate-800">{getTitulo()}</h1>
              <p className="text-lg text-slate-600 mt-1">
                {factura.Serie}-{String(factura.Numero).padStart(6, "0")}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                {t("fields.date")}: {formatFecha(factura.FechaFactura)}
              </p>
              {factura.NumeroDocumentoOrigen && (
                <p className="text-sm text-slate-500">
                  {t("pdf.orderRef", { ref: factura.NumeroDocumentoOrigen })}
                </p>
              )}
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

          {/* Info cliente */}
          <div className="mb-8 bg-slate-50 p-4 rounded-lg">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("pdf.clientData")}</h3>
            <p className="text-lg font-semibold text-slate-800">{clienteNombre || t("ventas:fields.client")}</p>
            {factura.CifCliente && (
              <p className="text-sm text-slate-600">CIF/NIF: {factura.CifCliente}</p>
            )}
            {factura.DireccionCliente && (
              <p className="text-sm text-slate-600">{factura.DireccionCliente}</p>
            )}
          </div>

          {/* Tabla de productos */}
          <table className="w-full mb-8 text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 text-left">{t("table.description")}</th>
                <th className="p-3 text-center">{t("table.quantity")}</th>
                <th className="p-3 text-right">{t("table.price")}</th>
                <th className="p-3 text-center">{t("table.discount")}</th>
                <th className="p-3 text-center">{t("table.vat")}</th>
                <th className="p-3 text-right">{t("table.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {factura.lineas.map((l, idx) => {
                const precio = Number(l.precioUnitario) || 0;
                const cantidad = Number(l.cantidad) || 0;
                const descuento = Number(l.pcDescuento) || 0;
                const iva = Number(l.pcIva) || 0;
                const importe = Number(l.importeLinea) || 0;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 border-b border-slate-200">{l.descripcionItem}</td>
                    <td className="p-3 border-b border-slate-200 text-center">{cantidad}</td>
                    <td className="p-3 border-b border-slate-200 text-right">{precio.toFixed(2)} €</td>
                    <td className="p-3 border-b border-slate-200 text-center">{descuento > 0 ? `${descuento}%` : "-"}</td>
                    <td className="p-3 border-b border-slate-200 text-center">{iva}%</td>
                    <td className="p-3 border-b border-slate-200 text-right font-medium">{importe.toFixed(2)} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("totals.taxBase")}</span>
                <span className="font-medium">{(Number(factura.TotalBaseImponible) || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("totals.vatPercent", { percent: 21 })}</span>
                <span className="font-medium">{(Number(factura.TotalCuotaIva) || 0).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-3 text-lg border-b-2 border-slate-300">
                <span className="font-bold">{t("totals.totalInvoice")}</span>
                <span className="font-bold">{(Number(factura.TotalFactura) || 0).toFixed(2)} €</span>
              </div>

              {/* Si es factura final con anticipo previo */}
              {factura.TipoFactura === "FINAL" && anticipo > 0 && (
                <>
                  <div className="flex justify-between py-2 text-emerald-600">
                    <span>{t("totals.previousAdvance")}</span>
                    <span>-{anticipo.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold text-blue-700">
                    <span>{t("totals.pendingPayment")}</span>
                    <span>{pendiente.toFixed(2)} €</span>
                  </div>
                </>
              )}

              {/* Si es factura de anticipo */}
              {factura.TipoFactura === "ANTICIPO" && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                  {t("pdf.advanceNote")}
                </div>
              )}
            </div>
          </div>

          {/* Observaciones */}
          {factura.Observaciones && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("pdf.observations")}</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{factura.Observaciones}</p>
            </div>
          )}

          {/* Referencia a factura de anticipo si existe */}
          {factura.facturaAnticipo && (
            <div className="mb-8 p-4 border border-slate-200 rounded-lg text-sm">
              <p className="text-slate-600">
                <strong>{t("pdf.associatedAdvanceInvoice")}</strong> {factura.facturaAnticipo.serie}-{String(factura.facturaAnticipo.numero).padStart(6, "0")} por {(Number(factura.facturaAnticipo.total) || 0).toFixed(2)} €
              </p>
            </div>
          )}

          {/* Pie */}
          <div className="mt-auto pt-8 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>{t("pdf.documentGenerated", { date: new Date().toLocaleDateString(locale), time: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}</p>
            {empresa.cif && <p className="mt-1">CIF: {empresa.cif}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
