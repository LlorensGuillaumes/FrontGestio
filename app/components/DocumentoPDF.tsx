// app/components/DocumentoPDF.tsx
import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DocumentoFull } from "~/lib/documentosRest";
import { fetchDatosEmpresa, type DatosEmpresa } from "~/lib/empresaRest";

type Props = {
  documento: DocumentoFull;
  clienteNombre: string;
  onClose: () => void;
};

export default function DocumentoPDF({ documento, clienteNombre, onClose }: Props) {
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
    pdf.save(`${documento.Tipo}_${documento.NumeroDocumento}.pdf`);
  };

  // Calcular totales
  const lineas = documento.lineas ?? [];
  let baseImponible = 0;
  let totalIva = 0;
  let totalDescuentos = 0;

  const lineasConTotales = lineas.map((l) => {
    const cantidad = Number(l.Cantidad) || 0;
    const precio = Number(l.PrecioUnitario) || 0;
    const descuento = Number(l.Descuento) || 0;
    const iva = Number(l.PorcentajeIva) || 21;

    const bruto = cantidad * precio;
    const descuentoImporte = bruto * (descuento / 100);
    const neto = bruto - descuentoImporte;
    const ivaImporte = neto * (iva / 100);

    baseImponible += neto;
    totalIva += ivaImporte;
    totalDescuentos += descuentoImporte;

    return { ...l, cantidad, precio, descuento, iva, neto, ivaImporte };
  });

  const total = baseImponible + totalIva;
  const pagoACuenta = Number(documento.PagoACuenta) || 0;
  const pendiente = total - pagoACuenta;

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
    piePagina: datosEmpresa?.TextoPieDocumento || "",
  };

  // Título según estado: si está confirmado es ENCARGO, si no es PRESUPUESTO
  const estadoUpper = (documento.Estado || "").toUpperCase();
  const titulo = estadoUpper === "CONFIRMADO" || estadoUpper === "ENTREGADO"
    ? t("ventas:documents.order")
    : t("ventas:documents.budget");

  // Formatear fecha
  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString(locale);
  };

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
              <h1 className="text-3xl font-bold text-slate-800">{titulo}</h1>
              <p className="text-lg text-slate-600 mt-1">{documento.NumeroDocumento}</p>
              <p className="text-sm text-slate-500 mt-2">
                {t("fields.date")}: {formatFecha(documento.Fecha)}
              </p>
              {documento.FechaEntrega && (
                <p className="text-sm text-slate-500">
                  {t("pdf.expectedDelivery", { date: formatFecha(documento.FechaEntrega) })}
                </p>
              )}
              {/* Validez del presupuesto */}
              {titulo === t("ventas:documents.budget") && documento.ValidezDias && (
                <p className="text-sm text-amber-600 font-medium mt-2">
                  {t("pdf.validUntil", {
                    date: (() => {
                      const fechaDoc = documento.Fecha ? new Date(documento.Fecha) : new Date();
                      fechaDoc.setDate(fechaDoc.getDate() + Number(documento.ValidezDias));
                      return fechaDoc.toLocaleDateString(locale);
                    })(),
                    days: documento.ValidezDias
                  })}
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
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("ventas:fields.client")}</h3>
            <p className="text-lg font-semibold text-slate-800">{clienteNombre}</p>
          </div>

          {/* Graduación si existe */}
          {(documento.OD_Esfera || documento.OI_Esfera) && (
            <div className="mb-8 p-4 border border-slate-200 rounded-lg">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">{t("pdf.graduation")}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-2 text-left"></th>
                    <th className="p-2 text-center">Esf</th>
                    <th className="p-2 text-center">Cil</th>
                    <th className="p-2 text-center">Eje</th>
                    <th className="p-2 text-center">Add</th>
                    <th className="p-2 text-center">DNP</th>
                    <th className="p-2 text-center">Altura</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-2 font-medium">OD</td>
                    <td className="p-2 text-center">{documento.OD_Esfera ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OD_Cilindro ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OD_Eje ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OD_Adicion ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OD_DNP ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OD_Altura ?? "-"}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">OI</td>
                    <td className="p-2 text-center">{documento.OI_Esfera ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OI_Cilindro ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OI_Eje ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OI_Adicion ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OI_DNP ?? "-"}</td>
                    <td className="p-2 text-center">{documento.OI_Altura ?? "-"}</td>
                  </tr>
                </tbody>
              </table>
              {(documento.DIP_Lejos || documento.DIP_Cerca) && (
                <div className="mt-2 flex gap-4 text-sm">
                  {documento.DIP_Lejos && <span>DIP Lejos: {documento.DIP_Lejos}</span>}
                  {documento.DIP_Cerca && <span>DIP Cerca: {documento.DIP_Cerca}</span>}
                </div>
              )}
            </div>
          )}

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
              {lineasConTotales.map((l, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
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
            <div className="w-72">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("totals.taxBase")}</span>
                <span className="font-medium">{baseImponible.toFixed(2)} €</span>
              </div>
              {totalDescuentos > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-200 text-green-600">
                  <span>{t("totals.appliedDiscounts")}</span>
                  <span>-{totalDescuentos.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("totals.vat")}</span>
                <span className="font-medium">{totalIva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-3 text-lg border-b-2 border-slate-300">
                <span className="font-bold">{t("totals.total")}</span>
                <span className="font-bold">{total.toFixed(2)} €</span>
              </div>
              {pagoACuenta > 0 && (
                <>
                  <div className="flex justify-between py-2 text-emerald-600">
                    <span>{t("totals.advancePayment")}</span>
                    <span>-{pagoACuenta.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold text-blue-700">
                    <span>{t("totals.pending")}</span>
                    <span>{pendiente.toFixed(2)} €</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Observaciones */}
          {documento.Observaciones && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("pdf.observations")}</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{documento.Observaciones}</p>
            </div>
          )}

          {/* Texto pie de página de la empresa */}
          {empresa.piePagina && (
            <div className="mb-8 p-4 border border-slate-200 rounded-lg text-xs text-slate-600">
              <p className="whitespace-pre-wrap">{empresa.piePagina}</p>
            </div>
          )}

          {/* Firma cliente */}
          <div className="mt-8 flex justify-between">
            <div className="w-64">
              <p className="text-xs text-slate-500 mb-16">{t("pdf.clientSignature")}</p>
              <div className="border-t border-slate-300 pt-1">
                <p className="text-xs text-slate-500">{t("pdf.agree")}</p>
              </div>
            </div>
            <div className="w-64 text-right">
              <p className="text-xs text-slate-500 mb-16">{t("pdf.companySignature")}</p>
              <div className="border-t border-slate-300 pt-1">
                <p className="text-xs text-slate-500">{empresa.nombre}</p>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div className="mt-auto pt-8 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>{t("pdf.documentGenerated", { date: new Date().toLocaleDateString(locale), time: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
