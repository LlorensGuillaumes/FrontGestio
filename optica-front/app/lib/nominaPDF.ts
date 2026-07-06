import type { NominaDetalle } from "~/lib/nominasRest";
import { MESES } from "~/lib/nominasRest";

// Genera y descarga el PDF de una nómina (recibo de salarios)
export async function generarNominaPDF(n: NominaDetalle, empresa?: { nombre?: string; cif?: string }) {
  const jsPDF = (await import("jspdf")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  let y = 20;

  const eur = (v: number) => `${v.toFixed(2)} €`;

  // Cabecera
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE SALARIOS", M, y);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`${MESES[n.mes]} ${n.anyo}`, W - M, y, { align: "right" });
  y += 7;
  if (empresa?.nombre) { doc.text(`Empresa: ${empresa.nombre}${empresa.cif ? ` · ${empresa.cif}` : ""}`, M, y); y += 5; }

  doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 7;

  // Trabajador
  doc.setFont("helvetica", "bold"); doc.text("Trabajador:", M, y);
  doc.setFont("helvetica", "normal"); doc.text(n.nombre, M + 25, y);
  if (n.iban) { doc.text(`IBAN: ${n.iban}`, W - M, y, { align: "right" }); }
  y += 9;

  const devengos = n.lineas.filter((l) => l.tipo === "DEVENGO");
  const deducciones = n.lineas.filter((l) => l.tipo === "DEDUCCION");

  const seccion = (titulo: string, lineas: { concepto: string; importe: number }[], total: number, signo: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(titulo, M, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const l of lineas) {
      doc.text(l.concepto, M + 2, y);
      doc.text(`${signo}${eur(l.importe)}`, W - M, y, { align: "right" });
      y += 5.5;
    }
    doc.setDrawColor(230); doc.line(M, y, W - M, y); y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Total ${titulo.toLowerCase()}`, M + 2, y);
    doc.text(`${signo}${eur(total)}`, W - M, y, { align: "right" });
    y += 9;
  };

  seccion("Devengos", devengos, n.totalDevengado, "");
  seccion("Deducciones", deducciones, n.totalDeducciones, "−");

  // Líquido
  doc.setFillColor(15, 23, 42); doc.rect(M, y - 4, W - 2 * M, 11, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("LÍQUIDO A PERCIBIR", M + 3, y + 3);
  doc.text(eur(n.liquido), W - M - 3, y + 3, { align: "right" });
  doc.setTextColor(0);

  doc.save(`Nomina_${n.nombre.replace(/\s+/g, "_")}_${n.mes}_${n.anyo}.pdf`);
}
