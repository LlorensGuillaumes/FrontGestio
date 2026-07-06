import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { previewSepa, generarSepa, type SepaFactura } from "~/lib/sepaRest";

export default function SepaModal({ idsFactura, onClose }: { idsFactura: number[]; onClose: () => void }) {
  const { t } = useTranslation(["escola", "common"]);
  const [facturas, setFacturas] = useState<SepaFactura[]>([]);
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoy = new Date();
  const fechaCobroDefault = new Date(hoy.getTime() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [fechaCobro, setFechaCobro] = useState(fechaCobroDefault);
  const [nombreFichero, setNombreFichero] = useState(`SEPA_${hoy.toISOString().slice(0, 10)}`);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await previewSepa(idsFactura);
      setFacturas(d.facturas);
      // Excluir por defecto las que no tienen IBAN (no se pueden cobrar)
      setExcluidas(new Set(d.facturas.filter((f) => !f.iban).map((f) => f.idFactura)));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("escola:sepa.errorCargandoFacturas"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idsFactura.length) load();
    else setError(t("escola:sepa.sinFacturasListado"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: number) => setExcluidas((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const incluidas = facturas.filter((f) => !excluidas.has(f.idFactura) && f.iban);
  const total = Math.round(incluidas.reduce((a, f) => a + f.importe, 0) * 100) / 100;

  const generar = async () => {
    if (incluidas.length === 0) { setError(t("escola:sepa.sinFacturasIban")); return; }
    setLoading(true);
    setError(null);
    try {
      const ids = incluidas.map((f) => f.idFactura);
      const { xml } = await generarSepa(ids, fechaCobro);
      // Descargar el fichero con el nombre elegido
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nombre = nombreFichero.trim() || "SEPA";
      a.download = nombre.toLowerCase().endsWith(".xml") ? nombre : `${nombre}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("escola:sepa.errorGenerandoFichero"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{t("escola:sepa.tituloRemesa")}</h2>
            <p className="text-sm text-slate-500">{t("escola:sepa.subtituloRemesa")}</p>
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
                <label className="text-sm font-medium text-slate-700">{t("escola:sepa.fechaCobro")}</label>
                <input type="date" value={fechaCobro} onChange={(e) => setFechaCobro(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              {facturas.map((f) => {
                const sinIban = !f.iban;
                const excl = excluidas.has(f.idFactura);
                return (
                  <div key={f.idFactura} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${excl || sinIban ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200"}`}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" disabled={sinIban} checked={!excl && !sinIban} onChange={() => toggle(f.idFactura)} />
                      <span className="font-medium text-slate-900">{f.numero}</span>
                      <span className="text-slate-600">{f.nombreCliente}</span>
                      {sinIban
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t("escola:sepa.sinIban")}</span>
                        : <span className="text-xs text-slate-400 font-mono">{f.iban}</span>}
                    </label>
                    <span className="font-semibold text-slate-700">{f.importe.toFixed(2)} €</span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-sm">{t("escola:sepa.adeudosEnRemesa", { count: incluidas.length })}</span>
              <span className="text-lg font-bold">{total.toFixed(2)} €</span>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">{t("escola:sepa.cancelar")}</button>
            <button onClick={generar} disabled={loading || incluidas.length === 0} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50">
              {loading ? t("escola:sepa.generando") : t("escola:sepa.generarYDescargar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
