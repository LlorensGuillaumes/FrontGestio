// app/components/FacturaCompraPDF.tsx
import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FacturaCompraFull } from "~/lib/comprasRest";
import { fetchDatosEmpresa, type DatosEmpresa } from "~/lib/empresaRest";

type Props = {
  factura: FacturaCompraFull;
  onClose: () => void;
};

export default function FacturaCompraPDF({ factura, onClose }: Props) {
  const { t, i18n } = useTranslation(["compras", "common"]);
  const printRef = useRef<HTMLDivElement>(null);
  const [datosEmpresa, setDatosEmpresa] = useState<DatosEmpresa | null>(null);

  const locale = i18n.language === "ca" ? "ca-ES" : "es-ES";

  useEffect(() => {
    fetchDatosEmpresa().then(setDatosEmpresa).catch(console.error);
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;
    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    const numero = `${factura.SerieFactura ? factura.SerieFactura + "-" : ""}${factura.NumeroFactura}`;
    pdf.save(`Factura_Compra_${numero.replace(/[^\w-]/g, "_")}.pdf`);
  };

  // Datos de la empresa (receptora de la factura)
  const empresa = {
    nombre: datosEmpresa?.NombreComercial || datosEmpresa?.NombreEmpresa || "Mi Empresa",
    direccion: datosEmpresa?.Direccion || "",
    cpCiudad: [datosEmpresa?.CodigoPostal, datosEmpresa?.Poblacion, datosEmpresa?.Provincia]
      .filter(Boolean)
      .join(" "),
    cif: datosEmpresa?.CIF || "",
    telefono: datosEmpresa?.Telefono || "",
  };

  const eur = (v: number | null | undefined) => `${(Number(v) || 0).toFixed(2)} €`;
  const formatFecha = (fecha: string | null | undefined) =>
    fecha ? new Date(fecha).toLocaleDateString(locale) : "-";

  const numeroDoc = `${factura.SerieFactura ? factura.SerieFactura + "-" : ""}${factura.NumeroFactura}`;
  const retencion = Number(factura.TotalRetencion) || 0;
  const pagado = Number(factura.ImportePagado) || 0;
  const pendiente = Number(factura.ImportePendiente) || 0;

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
          {t("pdfCompra.imprimir")}
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t("pdfCompra.descargarPdf")}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 shadow-lg"
        >
          {t("pdfCompra.cerrar")}
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
              <h1 className="text-3xl font-bold text-slate-800">{t("pdfCompra.titulo")}</h1>
              <p className="text-lg text-slate-600 mt-1">{numeroDoc}</p>
              <p className="text-sm text-slate-500 mt-2">{t("pdfCompra.fecha")}: {formatFecha(factura.FechaFactura)}</p>
              {factura.FechaVencimiento && (
                <p className="text-sm text-slate-500">{t("pdfCompra.vencimiento")}: {formatFecha(factura.FechaVencimiento)}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400 uppercase">{t("pdfCompra.proveedor")}</div>
              <div className="text-xl font-bold text-slate-800">{factura.NombreProveedor}</div>
            </div>
          </div>

          {/* Datos del receptor (nuestra empresa) */}
          <div className="mb-8 bg-slate-50 p-4 rounded-lg">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("pdfCompra.datosReceptor")}</h3>
            <p className="text-lg font-semibold text-slate-800">{empresa.nombre}</p>
            {empresa.cif && <p className="text-sm text-slate-600">CIF: {empresa.cif}</p>}
            {empresa.direccion && <p className="text-sm text-slate-600">{empresa.direccion}</p>}
            {empresa.cpCiudad && <p className="text-sm text-slate-600">{empresa.cpCiudad}</p>}
            {empresa.telefono && <p className="text-sm text-slate-600">Tel: {empresa.telefono}</p>}
          </div>

          {/* Tabla de líneas */}
          <table className="w-full mb-8 text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 text-left">{t("pdfCompra.descripcion")}</th>
                <th className="p-3 text-center">{t("pdfCompra.cantidad")}</th>
                <th className="p-3 text-right">{t("pdfCompra.precio")}</th>
                <th className="p-3 text-center">{t("pdfCompra.descuento")}</th>
                <th className="p-3 text-center">{t("pdfCompra.iva")}</th>
                <th className="p-3 text-right">{t("pdfCompra.importe")}</th>
              </tr>
            </thead>
            <tbody>
              {factura.lineas.map((l, idx) => {
                const dto = Number(l.PcDescuento) || 0;
                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 border-b border-slate-200">{l.DescripcionItem}</td>
                    <td className="p-3 border-b border-slate-200 text-center">{Number(l.Cantidad) || 0}</td>
                    <td className="p-3 border-b border-slate-200 text-right">{eur(l.PrecioUnitario)}</td>
                    <td className="p-3 border-b border-slate-200 text-center">{dto > 0 ? `${dto}%` : "-"}</td>
                    <td className="p-3 border-b border-slate-200 text-center">{Number(l.PcIva) || 0}%</td>
                    <td className="p-3 border-b border-slate-200 text-right font-medium">{eur(l.ImporteLinea)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("pdfCompra.baseImponible")}</span>
                <span className="font-medium">{eur(factura.TotalBaseImponible)}</span>
              </div>
              {(factura.resumenIva ?? []).map((r, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">{t("pdfCompra.iva")} ({Number(r.PorcentajeIva) || 0}%)</span>
                  <span className="font-medium">{eur(r.CuotaIva)}</span>
                </div>
              ))}
              {(!factura.resumenIva || factura.resumenIva.length === 0) && (
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">{t("pdfCompra.iva")}</span>
                  <span className="font-medium">{eur(factura.TotalCuotaIva)}</span>
                </div>
              )}
              {retencion > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-200 text-amber-700">
                  <span>{t("pdfCompra.retencion")}</span>
                  <span className="font-medium">-{eur(retencion)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 text-lg border-b-2 border-slate-300">
                <span className="font-bold">{t("pdfCompra.totalFactura")}</span>
                <span className="font-bold">{eur(factura.TotalFactura)}</span>
              </div>
              {pagado > 0 && (
                <>
                  <div className="flex justify-between py-2 text-emerald-600">
                    <span>{t("pdfCompra.pagado")}</span>
                    <span>-{eur(pagado)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold text-blue-700">
                    <span>{t("pdfCompra.pendiente")}</span>
                    <span>{eur(pendiente)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Observaciones */}
          {factura.Observaciones && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("pdfCompra.observaciones")}</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{factura.Observaciones}</p>
            </div>
          )}

          {/* Pie */}
          <div className="mt-auto pt-8 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>
              {t("pdfCompra.documentoGenerado", {
                fecha: new Date().toLocaleDateString(locale),
                hora: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
              })}
            </p>
            {empresa.cif && <p className="mt-1">CIF: {empresa.cif}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
