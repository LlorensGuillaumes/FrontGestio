import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { previewPagos, generarPagos, type PagoSepa } from "~/lib/sepaPagosRest";

export default function SepaPagoModal({ tipo, mes, anyo, onClose, onGenerated }: {
  tipo: "NOMINAS" | "COMPRAS";
  mes?: number;
  anyo?: number;
  onClose: () => void;
  onGenerated?: () => void;
}) {
  const { t } = useTranslation(["escola", "common"]);
  const [pagos, setPagos] = useState<PagoSepa[]>([]);
  const [excl, setExcl] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoy = new Date();
  const [fechaPago, setFechaPago] = useState(new Date(hoy.getTime() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [nombreFichero, setNombreFichero] = useState(`SEPA_pago_${tipo.toLowerCase()}_${hoy.toISOString().slice(0, 10)}`);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const d = await previewPagos(tipo, { mes, anyo });
      setPagos(d.pagos);
      setExcl(new Set(d.pagos.filter((p) => !p.iban).map((p) => p.id)));
    } catch (e: any) { setError(e?.response?.data?.error ?? t("escola:sepa.errorCargandoPagos")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = (id: number) => setExcl((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const incluidos = pagos.filter((p) => !excl.has(p.id) && p.iban);
  const total = Math.round(incluidos.reduce((a, p) => a + p.importe, 0) * 100) / 100;

  const generar = async () => {
    if (!incluidos.length) { setError(t("escola:sepa.sinPagosIban")); return; }
    setLoading(true); setError(null);
    try {
      const { xml } = await generarPagos(tipo, { ids: incluidos.map((p) => p.id), fechaPago, mes, anyo });
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nombre = nombreFichero.trim() || "SEPA_pago";
      a.download = nombre.toLowerCase().endsWith(".xml") ? nombre : `${nombre}.xml`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      onGenerated?.();
      onClose();
    } catch (e: any) { setError(e?.response?.data?.error ?? t("escola:sepa.errorGenerandoFichero")); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{t("escola:sepa.tituloPago", { tipo: tipo === "NOMINAS" ? t("escola:sepa.tipoNominas") : t("escola:sepa.tipoCompras") })}</h2>
            <p className="text-sm text-slate-500">{t("escola:sepa.subtituloPago")}</p>
          </div>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
            {loading && <p className="text-slate-500 text-sm">{t("escola:sepa.cargando")}</p>}

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700">{t("escola:sepa.nombreFichero")}</label>
                <input value={nombreFichero} onChange={(e) => setNombreFichero(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t("escola:sepa.fechaPago")}</label>
                <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              {pagos.map((p) => {
                const sinIban = !p.iban;
                const ex = excl.has(p.id);
                return (
                  <div key={p.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${ex || sinIban ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200"}`}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" disabled={sinIban} checked={!ex && !sinIban} onChange={() => toggle(p.id)} />
                      <span className="font-medium text-slate-900">{p.beneficiario}</span>
                      <span className="text-slate-500">{p.concepto}</span>
                      {sinIban ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t("escola:sepa.sinIban")}</span> : <span className="text-xs text-slate-400 font-mono">{p.iban}</span>}
                    </label>
                    <span className="font-semibold text-slate-700">{p.importe.toFixed(2)} €</span>
                  </div>
                );
              })}
              {pagos.length === 0 && !loading && <p className="text-sm text-slate-500">{t("escola:sepa.sinPagosPendientes")}</p>}
            </div>

            <div className="rounded-lg bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-sm">{t("escola:sepa.transferencias", { count: incluidos.length })}</span>
              <span className="text-lg font-bold">{total.toFixed(2)} €</span>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">{t("escola:sepa.cancelar")}</button>
            <button onClick={generar} disabled={loading || incluidos.length === 0} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50">{loading ? t("escola:sepa.generando") : t("escola:sepa.generarYDescargar")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
