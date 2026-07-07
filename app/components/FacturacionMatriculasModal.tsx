import { useState } from "react";
import { useTranslation } from "react-i18next";
import { previewMatriculas, generarMatriculas, type PreviewMensual } from "~/lib/facturacionMensualRest";

export default function FacturacionMatriculasModal({ onClose, onGenerated }: { onClose: () => void; onGenerated?: () => void }) {
  const { t } = useTranslation(["escola", "common"]);
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const [numCuotas, setNumCuotas] = useState<1 | 2>(1);
  const [preview, setPreview] = useState<PreviewMensual | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ creadas: number; mensaje?: string } | null>(null);
  const [alumnosExcl, setAlumnosExcl] = useState<Set<number>>(new Set());
  const [lineasExcl, setLineasExcl] = useState<Set<number>>(new Set());
  const [descuentos, setDescuentos] = useState<Record<number, number>>({});

  const cargarPreview = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const p = await previewMatriculas(anyo);
      setPreview(p);
      setAlumnosExcl(new Set(p.facturas.filter((f) => f.yaFacturado).map((f) => f.idCliente)));
      setLineasExcl(new Set());
      setDescuentos(Object.fromEntries(p.facturas.map((f) => [f.idCliente, f.descuentoPorcentaje ?? 0])));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("escola:facturacion.errorCargandoPreview"));
    } finally {
      setLoading(false);
    }
  };

  const toggleAlumno = (id: number) => setAlumnosExcl((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleLinea = (id: number) => setLineasExcl((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const facturasIncluidas = (preview?.facturas ?? []).filter((f) => !alumnosExcl.has(f.idCliente));
  const lineasIncluidas = (f: PreviewMensual["facturas"][0]) => f.lineas.filter((l) => !lineasExcl.has(l.idMatricula));
  const pctDe = (f: PreviewMensual["facturas"][0]) => descuentos[f.idCliente] ?? f.descuentoPorcentaje ?? 0;
  const totalLinea = (l: PreviewMensual["facturas"][0]["lineas"][0], pct: number) => {
    const base = l.cuota * (1 - pct / 100);
    return Math.round(base * (1 + l.pcIva / 100) * 100) / 100;
  };
  const totalDe = (f: PreviewMensual["facturas"][0]) => {
    const pct = pctDe(f);
    return Math.round(lineasIncluidas(f).reduce((a, l) => a + totalLinea(l, pct), 0) * 100) / 100;
  };
  let nAlumnos = 0, totalGlobal = 0;
  for (const f of facturasIncluidas) {
    const ls = lineasIncluidas(f);
    if (ls.length === 0) continue;
    nAlumnos += 1;
    totalGlobal += totalDe(f);
  }
  totalGlobal = Math.round(totalGlobal * 100) / 100;
  const nFacturas = nAlumnos * numCuotas;

  const generar = async () => {
    if (!preview) return;
    if (!confirm(t("escola:facturacion.confirmGenerarMatriculas", { nFacturas, nAlumnos, cuotas: numCuotas === 2 ? t("escola:facturacion.dosCuotasCadaUno") : "", total: totalGlobal.toFixed(2) }))) return;
    setLoading(true);
    setError(null);
    try {
      const r = await generarMatriculas({
        anyo,
        numCuotas,
        alumnosExcluidos: Array.from(alumnosExcl),
        lineasExcluidas: Array.from(lineasExcl),
        descuentos,
      });
      setResultado(r);
      setPreview(null);
      onGenerated?.();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t("escola:facturacion.errorGenerandoMatriculas"));
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
            <h2 className="text-lg font-bold text-slate-900">{t("escola:facturacion.tituloMatriculas")}</h2>
            <p className="text-sm text-slate-500">{t("escola:facturacion.subtituloMatriculas")}</p>
          </div>

          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
            {resultado && (
              <div className="p-4 rounded-lg bg-green-50 text-green-800 text-sm border border-green-200">
                <b>{resultado.creadas}</b> {t("escola:facturacion.facturasMatriculaGeneradas")}
                {resultado.mensaje && <div className="text-slate-600 mt-1">{resultado.mensaje}</div>}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("escola:facturacion.anyoCurso")}</label>
                <input type="number" value={anyo} onChange={(e) => { setAnyo(Number(e.target.value)); setPreview(null); }} className="mt-1 block w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t("escola:facturacion.formaPago")}</label>
                <select value={numCuotas} onChange={(e) => setNumCuotas(Number(e.target.value) === 2 ? 2 : 1)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value={1}>{t("escola:facturacion.unPago")}</option>
                  <option value={2}>{t("escola:facturacion.dosCuotasOpcion")}</option>
                </select>
              </div>
              <button onClick={cargarPreview} disabled={loading} className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium disabled:opacity-50">
                {loading ? t("escola:facturacion.calculando") : t("escola:facturacion.previsualizar")}
              </button>
            </div>

            {preview && (
              <div className="space-y-3">
                {preview.facturas.length === 0 && <p className="text-sm text-slate-500">{t("escola:facturacion.sinMatriculas")}</p>}
                {preview.facturas.map((f) => {
                  const excluido = alumnosExcl.has(f.idCliente);
                  return (
                    <div key={f.idCliente} className={`rounded-lg border px-3 py-2 ${excluido ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 font-medium text-slate-900 text-sm">
                          <input type="checkbox" checked={!excluido} onChange={() => toggleAlumno(f.idCliente)} />
                          {f.nombreAlumno}
                          {f.yaFacturado && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t("escola:facturacion.yaFacturadoAnyo")}</span>}
                        </label>
                        <div className="flex items-center gap-2">
                          {!excluido && (
                            <label className="flex items-center gap-1 text-xs text-slate-500">
                              {t("escola:facturacion.dto")}
                              <input
                                type="number" min={0} max={100}
                                value={pctDe(f)}
                                onChange={(e) => setDescuentos((p) => ({ ...p, [f.idCliente]: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                                className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-right"
                              />%
                            </label>
                          )}
                          <span className="text-sm font-semibold text-slate-700 w-20 text-right">{totalDe(f).toFixed(2)} €</span>
                        </div>
                      </div>
                      {!excluido && (
                        <div className="mt-1 ml-6 space-y-0.5">
                          {f.lineas.map((l) => {
                            const lExcl = lineasExcl.has(l.idMatricula);
                            return (
                              <label key={l.idMatricula} className={`flex items-center justify-between text-xs ${lExcl ? "text-slate-400 line-through" : "text-slate-600"}`}>
                                <span className="flex items-center gap-2">
                                  <input type="checkbox" checked={!lExcl} onChange={() => toggleLinea(l.idMatricula)} />
                                  {l.descripcion} {l.pcIva > 0 ? t("escola:facturacion.iva", { pct: l.pcIva }) : t("escola:facturacion.exento")}
                                </span>
                                <span>{l.total.toFixed(2)} €</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {preview.facturas.length > 0 && (
                  <div className="rounded-lg bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">{t("escola:facturacion.resumenAlumnos", { nAlumnos })} · <b>{nFacturas}</b> {t("escola:facturacion.facturas")}{numCuotas === 2 ? t("escola:facturacion.dosCuotasSufijo") : ""}</span>
                    <span className="text-lg font-bold">{totalGlobal.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">{t("escola:facturacion.cerrar")}</button>
            {preview && nAlumnos > 0 && (
              <button onClick={generar} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50">
                {loading ? t("escola:facturacion.generando") : t("escola:facturacion.generarFacturas", { count: nFacturas })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
