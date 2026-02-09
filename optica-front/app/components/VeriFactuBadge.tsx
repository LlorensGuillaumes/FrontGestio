// app/components/VeriFactuBadge.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { enviarFacturaVenta, enviarFacturaCompra } from "~/lib/verifactuRest";

type EstadoVeriFactu = "NO_ENVIADA" | "PENDIENTE" | "ACEPTADO" | "RECHAZADO" | "ERROR" | string;

interface VeriFactuBadgeProps {
  estado: EstadoVeriFactu;
  csv?: string | null;
  tipo: "venta" | "compra";
  idFactura: number;
  onEnviado?: () => void;
  showEnviarButton?: boolean;
}

const estadoStyles: Record<string, string> = {
  NO_ENVIADA: "bg-slate-100 text-slate-600",
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  ACEPTADO: "bg-green-100 text-green-700",
  RECHAZADO: "bg-red-100 text-red-700",
  ERROR: "bg-red-100 text-red-700",
};

export default function VeriFactuBadge({
  estado,
  csv,
  tipo,
  idFactura,
  onEnviado,
  showEnviarButton = true,
}: VeriFactuBadgeProps) {
  const { t } = useTranslation("common");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estadoLabels: Record<string, string> = {
    NO_ENVIADA: t("verifactu.notSent"),
    PENDIENTE: t("verifactu.pending"),
    ACEPTADO: t("verifactu.accepted"),
    RECHAZADO: t("verifactu.rejected"),
    ERROR: t("verifactu.error"),
  };

  const label = estadoLabels[estado] || estado;
  const className = estadoStyles[estado] || "bg-slate-100 text-slate-600";

  const handleEnviar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setEnviando(true);
    setError(null);

    try {
      const result = tipo === "venta"
        ? await enviarFacturaVenta(idFactura)
        : await enviarFacturaCompra(idFactura);

      if (result.success) {
        onEnviado?.();
      } else {
        setError(result.error || result.mensaje || t("verifactu.sendError"));
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? t("verifactu.errorSending"));
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar = estado === "NO_ENVIADA" || estado === "ERROR" || estado === "RECHAZADO";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
        {label}
      </span>

      {csv && (
        <span className="text-xs text-slate-500 font-mono" title={`CSV: ${csv}`}>
          {csv.substring(0, 8)}...
        </span>
      )}

      {showEnviarButton && puedeEnviar && (
        <button
          onClick={handleEnviar}
          disabled={enviando}
          className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
        >
          {enviando ? "..." : estado === "NO_ENVIADA" ? t("buttons.send") : t("buttons.retry")}
        </button>
      )}

      {error && (
        <span className="text-xs text-red-600" title={error}>
          {t("verifactu.error")}
        </span>
      )}
    </div>
  );
}
