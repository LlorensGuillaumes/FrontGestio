import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchNominas, previewNominas, generarNominas, fetchNomina, deleteNomina,
  MESES, type Nomina, type NominaPreview, type NominaDetalle,
} from "~/lib/nominasRest";
import SepaPagoModal from "~/components/SepaPagoModal";
import { generarNominaPDF } from "~/lib/nominaPDF";

export default function NominasListado() {
  const { t } = useTranslation("trabajadores");
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anyo, setAnyo] = useState(hoy.getFullYear());
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showGenerar, setShowGenerar] = useState(false);
  const [showSepaPago, setShowSepaPago] = useState(false);
  const [detalle, setDetalle] = useState<NominaDetalle | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setNominas(await fetchNominas({ anyo })); }
    catch (e: any) { setError(e?.response?.data?.error ?? t("trabajadores:nominas.errorCargando")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [anyo]);

  const verDetalle = async (id: number) => { try { setDetalle(await fetchNomina(id)); } catch { alert(t("trabajadores:nominas.errorCargandoNomina")); } };
  const borrar = async (n: Nomina) => {
    if (!confirm(t("trabajadores:nominas.confirmarEliminar", { nombre: n.nombre, mes: MESES[n.mes], anyo: n.anyo }))) return;
    try { await deleteNomina(n.id); load(); } catch { alert(t("trabajadores:nominas.errorEliminar")); }
  };

  const totalLiquido = nominas.reduce((a, n) => a + n.liquido, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("trabajadores:nominas.titulo")}</h1>
          <p className="text-slate-500 text-sm">{loading ? t("trabajadores:nominas.cargando") : t("trabajadores:nominas.resumen", { count: nominas.length, total: totalLiquido.toFixed(2) })}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={anyo} onChange={(e) => setAnyo(Number(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
            {[anyo - 1, anyo, anyo + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowGenerar(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">{t("trabajadores:nominas.generarNominas")}</button>
          <button onClick={() => setShowSepaPago(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">{t("trabajadores:nominas.sepaPago")}</button>
        </div>
      </div>
      {showSepaPago && <SepaPagoModal tipo="NOMINAS" onClose={() => setShowSepaPago(false)} onGenerated={() => load()} />}

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("trabajadores:nominas.colTrabajador")}</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-600">{t("trabajadores:nominas.colPeriodo")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("trabajadores:nominas.colDevengado")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("trabajadores:nominas.colLiquido")}</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-600">{t("trabajadores:nominas.colPago")}</th>
              <th className="text-right p-4 text-sm font-semibold text-slate-600">{t("trabajadores:nominas.colAcciones")}</th>
            </tr>
          </thead>
          <tbody>
            {nominas.length === 0 && !loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">{t("trabajadores:nominas.sinNominas")}</td></tr>}
            {nominas.map((n) => (
              <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => verDetalle(n.id)}>
                <td className="p-4 font-medium text-slate-900">{n.nombre}</td>
                <td className="p-4 text-slate-600 text-sm">{MESES[n.mes]} {n.anyo}</td>
                <td className="p-4 text-right text-slate-600">{n.totalDevengado.toFixed(2)} €</td>
                <td className="p-4 text-right font-semibold text-slate-900">{n.liquido.toFixed(2)} €</td>
                <td className="p-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${n.estadoPago === "PAGADA" ? "bg-green-100 text-green-700" : n.estadoPago === "SEPA_GENERADO" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                    {n.estadoPago === "SEPA_GENERADO" ? t("trabajadores:nominas.estadoSepaGenerado") : n.estadoPago === "PAGADA" ? t("trabajadores:nominas.estadoPagada") : t("trabajadores:nominas.estadoPendiente")}
                  </span>
                </td>
                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => borrar(n)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">{t("trabajadores:nominas.eliminar")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGenerar && <GenerarNominasModal mes={mes} anyo={anyo} setMes={setMes} setAnyo={setAnyo} onClose={() => setShowGenerar(false)} onDone={() => { setShowGenerar(false); load(); }} />}
      {detalle && <DetalleNominaModal n={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function GenerarNominasModal({ mes, anyo, setMes, setAnyo, onClose, onDone }: any) {
  const { t } = useTranslation("trabajadores");
  const [preview, setPreview] = useState<{ nominas: NominaPreview[]; resumen: any } | null>(null);
  const [excl, setExcl] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true); setError(null); setResultado(null);
    try {
      const p = await previewNominas(mes, anyo);
      setPreview(p);
      setExcl(new Set(p.nominas.filter((n) => n.yaGenerada).map((n) => n.idUsuario)));
    } catch (e: any) { setError(e?.response?.data?.error ?? t("trabajadores:nominas.error")); }
    finally { setLoading(false); }
  };

  const toggle = (id: number) => setExcl((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const incluidas = (preview?.nominas ?? []).filter((n) => !excl.has(n.idUsuario));
  const totalLiq = incluidas.reduce((a, n) => a + n.liquido, 0);

  const generar = async () => {
    setLoading(true);
    try {
      const r = await generarNominas({ mes, anyo, usuariosExcluidos: Array.from(excl) });
      setResultado(`${t("trabajadores:nominas.nominasGeneradas", { count: r.creadas })} ${r.mensaje ?? ""}`);
      setPreview(null);
      onDone();
    } catch (e: any) { setError(e?.response?.data?.error ?? t("trabajadores:nominas.errorGenerando")); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{t("trabajadores:nominas.generarNominas")}</h2>
            <p className="text-sm text-slate-500">{t("trabajadores:nominas.generarSubtitulo")}</p>
          </div>
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
            {resultado && <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm border border-green-200">{resultado}</div>}
            <div className="flex items-end gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("trabajadores:nominas.mes")}</label>
                <select value={mes} onChange={(e) => { setMes(Number(e.target.value)); setPreview(null); }} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t("trabajadores:nominas.anyo")}</label>
                <input type="number" value={anyo} onChange={(e) => { setAnyo(Number(e.target.value)); setPreview(null); }} className="mt-1 block w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <button onClick={cargar} disabled={loading} className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium">{loading ? "..." : t("trabajadores:nominas.previsualizar")}</button>
            </div>

            {preview && (
              <div className="space-y-2">
                {preview.nominas.length === 0 && <p className="text-sm text-slate-500">{t("trabajadores:nominas.sinPersonalSalario")}</p>}
                {preview.nominas.map((n) => {
                  const ex = excl.has(n.idUsuario);
                  return (
                    <div key={n.idUsuario} className={`rounded-lg border px-3 py-2 ${ex ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200"}`}>
                      <label className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium text-slate-900 text-sm">
                          <input type="checkbox" checked={!ex} onChange={() => toggle(n.idUsuario)} />
                          {n.nombre}
                          {n.yaGenerada && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t("trabajadores:nominas.yaGenerada")}</span>}
                        </span>
                        <span className="text-sm font-semibold">{n.liquido.toFixed(2)} €</span>
                      </label>
                    </div>
                  );
                })}
                {preview.nominas.length > 0 && (
                  <div className="rounded-lg bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">{t("trabajadores:nominas.numNominas", { count: incluidas.length })}</span>
                    <span className="text-lg font-bold">{t("trabajadores:nominas.totalLiquido", { total: totalLiq.toFixed(2) })}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">{t("trabajadores:nominas.cerrar")}</button>
            {preview && incluidas.length > 0 && <button onClick={generar} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50">{t("trabajadores:nominas.generarNNominas", { count: incluidas.length })}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetalleNominaModal({ n, onClose }: { n: NominaDetalle; onClose: () => void }) {
  const { t } = useTranslation("trabajadores");
  const devengos = n.lineas.filter((l) => l.tipo === "DEVENGO");
  const deducciones = n.lineas.filter((l) => l.tipo === "DEDUCCION");
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{n.nombre}</h2>
            <p className="text-sm text-slate-500">{MESES[n.mes]} {n.anyo}{n.iban ? ` · ${n.iban}` : ""}</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">{t("trabajadores:nominas.devengos")}</div>
              {devengos.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5"><span className="text-slate-700">{l.concepto}</span><span className="text-slate-900">{l.importe.toFixed(2)} €</span></div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-slate-100 mt-1 pt-1"><span>{t("trabajadores:nominas.totalDevengado")}</span><span>{n.totalDevengado.toFixed(2)} €</span></div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">{t("trabajadores:nominas.deducciones")}</div>
              {deducciones.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5"><span className="text-slate-700">{l.concepto}</span><span className="text-red-600">−{l.importe.toFixed(2)} €</span></div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-slate-100 mt-1 pt-1"><span>{t("trabajadores:nominas.totalDeducciones")}</span><span className="text-red-600">−{n.totalDeducciones.toFixed(2)} €</span></div>
            </div>
            <div className="rounded-lg bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-sm">{t("trabajadores:nominas.liquidoPercibir")}</span>
              <span className="text-xl font-bold">{n.liquido.toFixed(2)} €</span>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={() => generarNominaPDF(n)} className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium">{t("trabajadores:nominas.descargarPdf")}</button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">{t("trabajadores:nominas.cerrar")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
