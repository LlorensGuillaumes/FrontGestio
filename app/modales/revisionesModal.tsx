// src/modals/RevisionesModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getRevisionFull,
  createRevisionFull,
  updateRevisionFull,
  getHistoriaClinicaFull,
} from "~/lib/revisionesRest";
import { fetchProfesionales, type Profesional } from "~/lib/profesionalesRest";



export type RevisionModalMode = "new" | "view" | "edit";
type RevisionGql = any;

type Props = {
  mode: RevisionModalMode;
  id?: string; // idRevision (view/edit)
  idCliente?: string; // para "new"
  nombreCliente?: string; // nombre del cliente para mostrar en cabecera
  onClose: () => void;
  onSaved: () => void;
  onEdit: () => void;
  onView: () => void;

  // cuando tengas el modal de HC, aquí enganchas
  onOpenHistoriaClinica?: (idCliente: string) => void;
  // token para refrescar HC cuando vuelve del modal de HC
  hcRefreshToken?: number;
};

// --------------------------------------
// Helpers fecha DD/MM/YYYY
// --------------------------------------
function isValidDMY(value: string) {
  const s = (value ?? "").trim();
  // Solo acepta DD/MM/YYYY (siempre 2 dígitos)
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return false;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
}

// Formatea fecha actual como DD/MM/YYYY
function getTodayDMY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Normaliza fecha D/M/YYYY o DD/MM/YYYY a DD/MM/YYYY
function normalizeDMY(value: string): string {
  const s = (value ?? "").trim();
  if (!s) return "";

  // Intenta parsear D/M/YYYY, DD/M/YYYY, D/MM/YYYY o DD/MM/YYYY
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return s; // Si no coincide, devolver tal cual

  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];

  return `${dd}/${mm}/${yyyy}`;
}

// Convierte DD/MM/YYYY a YYYY-MM-DD para enviar al backend
function dmyToISO(value: string): string | null {
  const s = (value ?? "").trim();
  if (!s) return null;

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;

  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];

  return `${yyyy}-${mm}-${dd}`;
}

// Convierte string/number -> number | null (acepta coma)
function toMaybeNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toMaybeString(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-slate-200 bg-white text-slate-700">
      {children}
    </span>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}

type AgudezaRow = {
  id?: string;
  distancia: string; // LEJOS/CERCA/etc
  odSin: string;
  oiSin: string;
  binSin: string;
  odCon: string;
  oiCon: string;
  binCon: string;
};

type RefrObjRow = {
  id?: string;
  metodo: string; // AUTO/RETINOS/etc
  odEsf: string;
  odCil: string;
  odEje: string;
  oiEsf: string;
  oiCil: string;
  oiEje: string;
};

type RefrFinal = {
  odEsf: string;
  odCil: string;
  odEje: string;
  odAdd: string;
  oiEsf: string;
  oiCil: string;
  oiEje: string;
  oiAdd: string;
  prismaOd: string;
  baseOd: string;
  prismaOi: string;
  baseOi: string;
} | null;

type Binocular = {
  coverLejos: string;
  coverCerca: string;
  convergencia: string;
  vergencias: string;
  estereopsis: string;
  observaciones: string;
} | null;

type MotilidadPupilas = {
  motilidad: string;
  pupilas: string;
  observaciones: string;
} | null;

type SaludOcular = {
  biomicroscopia: string;
  fondoOjo: string;
  iopOd: string;
  iopOi: string;
  iopMetodo: string;
  campoVisual: string;
  observaciones: string;
} | null;

type QueratoTopo = {
  odK1: string;
  odK2: string;
  odEje: string;
  oiK1: string;
  oiK2: string;
  oiEje: string;
  observaciones: string;
} | null;

const emptyAgudezaRow = (): AgudezaRow => ({
  distancia: "LEJOS",
  odSin: "",
  oiSin: "",
  binSin: "",
  odCon: "",
  oiCon: "",
  binCon: "",
});

const emptyRefrObjRow = (): RefrObjRow => ({
  metodo: "AUTO",
  odEsf: "",
  odCil: "",
  odEje: "",
  oiEsf: "",
  oiCil: "",
  oiEje: "",
});

const emptyRefrFinal = (): RefrFinal => ({
  odEsf: "",
  odCil: "",
  odEje: "",
  odAdd: "",
  oiEsf: "",
  oiCil: "",
  oiEje: "",
  oiAdd: "",
  prismaOd: "",
  baseOd: "",
  prismaOi: "",
  baseOi: "",
});

const emptyBinocular = (): Binocular => ({
  coverLejos: "",
  coverCerca: "",
  convergencia: "",
  vergencias: "",
  estereopsis: "",
  observaciones: "",
});

const emptyMotilidad = (): MotilidadPupilas => ({
  motilidad: "",
  pupilas: "",
  observaciones: "",
});

const emptySaludOcular = (): SaludOcular => ({
  biomicroscopia: "",
  fondoOjo: "",
  iopOd: "",
  iopOi: "",
  iopMetodo: "",
  campoVisual: "",
  observaciones: "",
});

const emptyQueratoTopo = (): QueratoTopo => ({
  odK1: "",
  odK2: "",
  odEje: "",
  oiK1: "",
  oiK2: "",
  oiEje: "",
  observaciones: "",
});

export default function RevisionesModal({
  mode,
  id,
  idCliente,
  nombreCliente,
  onClose,
  onSaved,
  onEdit,
  onView,
  onOpenHistoriaClinica,
  hcRefreshToken,
}: Props) {
  const { t } = useTranslation(["ventas", "common"]);

  const isNew = mode === "new";
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState<RevisionGql | null>(null);

  // Form base
  const [fIdCliente, setFIdCliente] = useState(idCliente ?? "");
  const [fecha, setFecha] = useState("");
  const [motivoConsulta, setMotivoConsulta] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [profesional, setProfesional] = useState("");

  // Lista de profesionales para el desplegable
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);

  // Historia clínica (cabecera colapsable)
  const [hcOpen, setHcOpen] = useState(true);
  const [hcLoading, setHcLoading] = useState(false);
  const [hcError, setHcError] = useState<string | null>(null);
  const [hc, setHc] = useState<any | null>(null);

  // Exploración optométrica (colapsable)
  const [expOpen, setExpOpen] = useState(true);

  // Arrays
  const [agudeza, setAgudeza] = useState<AgudezaRow[]>([]);
  const [refrObj, setRefrObj] = useState<RefrObjRow[]>([]);

  // Singles
  const [refrFinal, setRefrFinal] = useState<RefrFinal>(null);
  const [binocular, setBinocular] = useState<Binocular>(null);
  const [motilidadPupilas, setMotilidadPupilas] = useState<MotilidadPupilas>(null);
  const [saludOcular, setSaludOcular] = useState<SaludOcular>(null);
  const [queratoTopo, setQueratoTopo] = useState<QueratoTopo>(null);

  const title = useMemo(() => {
    if (isNew) return t("revisions.newRevision");
    if (isEdit) return t("revisions.editRevision");
    return t("revisions.revisionDetail");
  }, [mode, isNew, isEdit, t]);

  // 0) Cargar lista de profesionales
  useEffect(() => {
    fetchProfesionales(true)
      .then((data) => setProfesionales(data))
      .catch((err) => console.error("Error cargando profesionales:", err));
  }, []);

  // 1) Cargar revisión en view/edit
  useEffect(() => {
    let mounted = true;

    async function loadRevision() {
      if (isNew) {
        setRevision(null);
        setError(null);
        setLoading(false);

        setFIdCliente(idCliente ?? "");
        setFecha(getTodayDMY()); // Fecha actual DD/MM/YYYY
        setMotivoConsulta("");
        setSintomas("");
        setObservaciones("");
        setProfesional("");

        // Inicializar vacío (sin valores de prueba)
        setAgudeza([]);
        setRefrObj([]);
        setRefrFinal(null);
        setBinocular(null);
        setMotilidadPupilas(null);
        setSaludOcular(null);
        setQueratoTopo(null);

        return;
      }

      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getRevisionFull(id);
        if (!mounted) return;

        const r = data?.revision;
        setRevision(r ?? null);

        if (!r) {
          setError(t("revisions.revisionNotFound"));
          return;
        }

        // base
        setFIdCliente(String(r.idCliente ?? ""));
        setFecha(normalizeDMY(r.fecha ?? ""));
        setMotivoConsulta(r.motivoConsulta ?? "");
        setSintomas(r.sintomas ?? "");
        setObservaciones(r.observaciones ?? "");
        setProfesional(r.profesional ?? "");

        // arrays (si el schema las marca non-null deberían venir como [], pero por si acaso)
        const av = Array.isArray(r.agudezaVisual) ? r.agudezaVisual : [];
        setAgudeza(
          av.map((x: any) => ({
            id: String(x.id),
            distancia: x.distancia ?? "",
            odSin: toMaybeString(x.odSin),
            oiSin: toMaybeString(x.oiSin),
            binSin: toMaybeString(x.binSin),
            odCon: toMaybeString(x.odCon),
            oiCon: toMaybeString(x.oiCon),
            binCon: toMaybeString(x.binCon),
          }))
        );

        const ro = Array.isArray(r.refraccionObjetiva) ? r.refraccionObjetiva : [];
        setRefrObj(
          ro.map((x: any) => ({
            id: String(x.id),
            metodo: x.metodo ?? "",
            odEsf: toMaybeString(x.odEsf),
            odCil: toMaybeString(x.odCil),
            odEje: toMaybeString(x.odEje),
            oiEsf: toMaybeString(x.oiEsf),
            oiCil: toMaybeString(x.oiCil),
            oiEje: toMaybeString(x.oiEje),
          }))
        );

        setRefrFinal(
          r.refraccionFinal
            ? {
                odEsf: toMaybeString(r.refraccionFinal.odEsf),
                odCil: toMaybeString(r.refraccionFinal.odCil),
                odEje: toMaybeString(r.refraccionFinal.odEje),
                odAdd: toMaybeString(r.refraccionFinal.odAdd),
                oiEsf: toMaybeString(r.refraccionFinal.oiEsf),
                oiCil: toMaybeString(r.refraccionFinal.oiCil),
                oiEje: toMaybeString(r.refraccionFinal.oiEje),
                oiAdd: toMaybeString(r.refraccionFinal.oiAdd),
                prismaOd: toMaybeString(r.refraccionFinal.prismaOd),
                baseOd: toMaybeString(r.refraccionFinal.baseOd),
                prismaOi: toMaybeString(r.refraccionFinal.prismaOi),
                baseOi: toMaybeString(r.refraccionFinal.baseOi),
              }
            : null
        );

        setBinocular(
          r.binocular
            ? {
                coverLejos: toMaybeString(r.binocular.coverLejos),
                coverCerca: toMaybeString(r.binocular.coverCerca),
                convergencia: toMaybeString(r.binocular.convergencia),
                vergencias: toMaybeString(r.binocular.vergencias),
                estereopsis: toMaybeString(r.binocular.estereopsis),
                observaciones: toMaybeString(r.binocular.observaciones),
              }
            : null
        );

        setMotilidadPupilas(
          r.motilidadPupilas
            ? {
                motilidad: toMaybeString(r.motilidadPupilas.motilidad),
                pupilas: toMaybeString(r.motilidadPupilas.pupilas),
                observaciones: toMaybeString(r.motilidadPupilas.observaciones),
              }
            : null
        );

        setSaludOcular(
          r.saludOcular
            ? {
                biomicroscopia: toMaybeString(r.saludOcular.biomicroscopia),
                fondoOjo: toMaybeString(r.saludOcular.fondoOjo),
                iopOd: toMaybeString(r.saludOcular.iopOd),
                iopOi: toMaybeString(r.saludOcular.iopOi),
                iopMetodo: toMaybeString(r.saludOcular.iopMetodo),
                campoVisual: toMaybeString(r.saludOcular.campoVisual),
                observaciones: toMaybeString(r.saludOcular.observaciones),
              }
            : null
        );

        setQueratoTopo(
          r.queratometriaTopografia
            ? {
                odK1: toMaybeString(r.queratometriaTopografia.odK1),
                odK2: toMaybeString(r.queratometriaTopografia.odK2),
                odEje: toMaybeString(r.queratometriaTopografia.odEje),
                oiK1: toMaybeString(r.queratometriaTopografia.oiK1),
                oiK2: toMaybeString(r.queratometriaTopografia.oiK2),
                oiEje: toMaybeString(r.queratometriaTopografia.oiEje),
                observaciones: toMaybeString(r.queratometriaTopografia.observaciones),
              }
            : null
        );
      } catch (e: any) {
        if (!mounted) return;
        setError(e.message ?? t("revisions.errorLoadingRevision"));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    loadRevision();
    return () => {
      mounted = false;
    };
  }, [mode, id, idCliente, isNew]);

  // 2) Cargar Historia Clínica por idCliente (vale para new/view/edit)
  // Usar idCliente de prop (viene del listado) o fIdCliente (del estado/revisión cargada)
  const effectiveIdCliente = String(idCliente ?? fIdCliente ?? "").trim();

  useEffect(() => {
    let mounted = true;

    async function loadHC() {
      if (!effectiveIdCliente) {
        setHc(null);
        setHcError(null);
        setHcLoading(false);
        return;
      }

      setHcLoading(true);
      setHcError(null);

      try {
        const data = await getHistoriaClinicaFull(effectiveIdCliente);

        if (!mounted) return;
        // Guardar toda la data de HC (historiaClinica, alergias, medicacion, antecedentes, habitos)
        setHc(data ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setHcError(e.message ?? "Error cargando historia clínica");
        setHc(null);
      } finally {
        if (!mounted) return;
        setHcLoading(false);
      }
    }

    loadHC();
    return () => {
      mounted = false;
    };
  }, [effectiveIdCliente, hcRefreshToken]);

  const canSave = useMemo(() => {
    if (!isNew && !isEdit) return false;
    if (isNew && !effectiveIdCliente) return false;
    if (fecha.trim() && !isValidDMY(fecha)) return false; // fecha opcional, pero si viene, válida
    return true;
  }, [isNew, isEdit, effectiveIdCliente, fecha]);

  const onSave = async () => {
    if (!canSave || loading) return;

    setLoading(true);
    setError(null);

    try {
      const inputCommon: any = {
        fecha: dmyToISO(fecha),
        motivoConsulta: motivoConsulta.trim() || null,
        sintomas: sintomas.trim() || null,
        observaciones: observaciones.trim() || null,
        profesional: profesional.trim() || null,

        // Arrays
        agudezaVisual: agudeza.map((x) => ({
          distancia: (x.distancia ?? "").trim(),
          odSin: x.odSin.trim() ? x.odSin.trim() : null,
          oiSin: x.oiSin.trim() ? x.oiSin.trim() : null,
          binSin: x.binSin.trim() ? x.binSin.trim() : null,
          odCon: x.odCon.trim() ? x.odCon.trim() : null,
          oiCon: x.oiCon.trim() ? x.oiCon.trim() : null,
          binCon: x.binCon.trim() ? x.binCon.trim() : null,
        })),

        refraccionObjetiva: refrObj.map((x) => ({
          metodo: (x.metodo ?? "").trim(),
          odEsf: toMaybeNumber(x.odEsf),
          odCil: toMaybeNumber(x.odCil),
          odEje: toMaybeNumber(x.odEje),
          oiEsf: toMaybeNumber(x.oiEsf),
          oiCil: toMaybeNumber(x.oiCil),
          oiEje: toMaybeNumber(x.oiEje),
        })),

        // Singles (si son null explícito, el back debería borrar)
        refraccionFinal:
          refrFinal === null
            ? null
            : {
                odEsf: toMaybeNumber(refrFinal.odEsf),
                odCil: toMaybeNumber(refrFinal.odCil),
                odEje: toMaybeNumber(refrFinal.odEje),
                odAdd: toMaybeNumber(refrFinal.odAdd),
                oiEsf: toMaybeNumber(refrFinal.oiEsf),
                oiCil: toMaybeNumber(refrFinal.oiCil),
                oiEje: toMaybeNumber(refrFinal.oiEje),
                oiAdd: toMaybeNumber(refrFinal.oiAdd),
                prismaOd: toMaybeNumber(refrFinal.prismaOd),
                baseOd: refrFinal.baseOd.trim() ? refrFinal.baseOd.trim() : null,
                prismaOi: toMaybeNumber(refrFinal.prismaOi),
                baseOi: refrFinal.baseOi.trim() ? refrFinal.baseOi.trim() : null,
              },

        binocular:
          binocular === null
            ? null
            : {
                coverLejos: binocular.coverLejos.trim() || null,
                coverCerca: binocular.coverCerca.trim() || null,
                convergencia: binocular.convergencia.trim() || null,
                vergencias: binocular.vergencias.trim() || null,
                estereopsis: binocular.estereopsis.trim() || null,
                observaciones: binocular.observaciones.trim() || null,
              },

        motilidadPupilas:
          motilidadPupilas === null
            ? null
            : {
                motilidad: motilidadPupilas.motilidad.trim() || null,
                pupilas: motilidadPupilas.pupilas.trim() || null,
                observaciones: motilidadPupilas.observaciones.trim() || null,
              },

        saludOcular:
          saludOcular === null
            ? null
            : {
                biomicroscopia: saludOcular.biomicroscopia.trim() || null,
                fondoOjo: saludOcular.fondoOjo.trim() || null,
                iopOd: toMaybeNumber(saludOcular.iopOd),
                iopOi: toMaybeNumber(saludOcular.iopOi),
                iopMetodo: saludOcular.iopMetodo.trim() || null,
                campoVisual: saludOcular.campoVisual.trim() || null,
                observaciones: saludOcular.observaciones.trim() || null,
              },

        queratometriaTopografia:
          queratoTopo === null
            ? null
            : {
                odK1: toMaybeNumber(queratoTopo.odK1),
                odK2: toMaybeNumber(queratoTopo.odK2),
                odEje: toMaybeNumber(queratoTopo.odEje),
                oiK1: toMaybeNumber(queratoTopo.oiK1),
                oiK2: toMaybeNumber(queratoTopo.oiK2),
                oiEje: toMaybeNumber(queratoTopo.oiEje),
                observaciones: queratoTopo.observaciones.trim() || null,
              },
      };

      if (isNew) {
        const input = { idCliente: effectiveIdCliente, ...inputCommon };
        await createRevisionFull(input);

        onSaved();
        return;
      }

      if (!id) throw new Error("Falta id de revisión para actualizar.");

      await updateRevisionFull(id, inputCommon);

      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || e.message || t("revisions.errorSavingRevision");
      console.error("Error guardando revisión:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onEditHC = () => {
    // Usar idCliente de la prop (viene del listado) o del estado (se carga de la revisión)
    const cid = String(idCliente ?? fIdCliente ?? "").trim();
    if (!cid) return;
    onOpenHistoriaClinica?.(cid);
  };

  const subtitle = useMemo(() => {
    const clienteNombre = nombreCliente || (revision?.nombreCliente) || null;
    const fechaFormateada = normalizeDMY(revision?.fecha ?? "") || "—";
    if (!isNew && revision) {
      return clienteNombre
        ? `${clienteNombre} · ${fechaFormateada}`
        : `${t("revisions.title")} #${revision.id} · ${fechaFormateada}`;
    }
    if (isNew) {
      return clienteNombre
        ? `${clienteNombre} · ${t("revisions.newRevision")}`
        : t("revisions.newRevision");
    }
    return "";
  }, [isNew, revision, nombreCliente, t]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">{title}</div>
              {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
            </div>

            <div className="flex items-center gap-2">
              {!isNew && isView ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  {t("common:buttons.edit")}
                </button>
              ) : null}

              {!isNew && isEdit ? (
                <button
                  type="button"
                  onClick={onView}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  {t("common:modes.reading")}
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                {t("common:buttons.close")}
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[78vh] overflow-auto">
            {error ? (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
            ) : null}

            {/* CABECERA: Historia clínica (colapsable) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{t("revisions.clinicalHistory.title")}</div>
                  <div className="text-xs text-slate-500">
                    {hcLoading
                      ? t("revisions.clinicalHistory.loading")
                      : hc
                      ? t("revisions.clinicalHistory.summary", {
                          allergies: hc.alergias?.length ?? 0,
                          medications: hc.medicacion?.length ?? 0,
                          history: hc.antecedentes?.length ?? 0
                        })
                      : hcError
                      ? t("revisions.clinicalHistory.errorLoading")
                      : t("revisions.clinicalHistory.noData")}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHcOpen((v) => !v)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    {hcOpen ? t("revisions.clinicalHistory.hide") : t("revisions.clinicalHistory.show")}
                  </button>

                  <button
                    type="button"
                    onClick={onEditHC}
                    disabled={!String(idCliente ?? fIdCliente ?? "").trim()}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    title={t("revisions.clinicalHistory.editHC")}
                  >
                    {t("revisions.clinicalHistory.editHC")}
                  </button>
                </div>
              </div>

              {hcOpen ? (
                <div className="px-4 pb-4">
                  {hcError ? (
                    <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{hcError}</div>
                  ) : null}

                  {!hcLoading && !hcError ? (
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-6">
                        <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.clinicalHistory.allergies")}</div>
                        <div className="flex flex-wrap gap-2">
                          {(hc?.alergias ?? []).length ? (
                            (hc.alergias ?? []).map((a: any) => (
                              <Chip key={a.IdAlergia || a.id}>
                                {a.Sustancia || a.sustancia}
                                {(a.Reaccion || a.reaccion) ? ` · ${a.Reaccion || a.reaccion}` : ""}
                              </Chip>
                            ))
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
                        </div>
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.clinicalHistory.habits")}</div>
                        {hc?.habitos ? (
                          <div className="text-sm text-slate-700 space-y-1">
                            {(hc.habitos.Fumador === 1 || hc.habitos.fumador === 1) ? (
                              <div>
                                <span className="font-medium text-amber-600">{t("revisions.clinicalHistory.smoker")}</span>
                              </div>
                            ) : null}
                            {(hc.habitos.Observaciones || hc.habitos.observaciones) ? (
                              <div className="text-slate-600">{hc.habitos.Observaciones || hc.habitos.observaciones}</div>
                            ) : null}
                            {!(hc.habitos.Fumador === 1 || hc.habitos.fumador === 1) && !(hc.habitos.Observaciones || hc.habitos.observaciones) ? (
                              <span className="text-slate-500">{t("revisions.clinicalHistory.noRelevantHabits")}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.clinicalHistory.activeMedication")}</div>
                        {(hc?.medicacion ?? []).length ? (
                          <ul className="text-sm text-slate-700 space-y-1">
                            {(hc.medicacion ?? []).slice(0, 8).map((m: any) => (
                              <li key={m.IdMedicacion || m.id} className="flex items-start gap-2">
                                <span className="text-slate-400">•</span>
                                <span>
                                  <span className="font-medium">{m.Medicamento || m.medicamento}</span>
                                  {(m.Dosis || m.dosis) ? ` · ${m.Dosis || m.dosis}` : ""}
                                  {(m.Frecuencia || m.frecuencia) ? ` · ${m.Frecuencia || m.frecuencia}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.clinicalHistory.activeHistory")}</div>
                        {(hc?.antecedentes ?? []).length ? (
                          <ul className="text-sm text-slate-700 space-y-1">
                            {(hc.antecedentes ?? []).slice(0, 8).map((a: any) => (
                              <li key={a.IdAntecedente || a.id} className="flex items-start gap-2">
                                <span className="text-slate-400">•</span>
                                <span>
                                  <span className="font-medium">{a.Tipo || a.tipo}</span>: {a.Descripcion || a.descripcion}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">{t("revisions.clinicalHistory.loadingHC")}</div>
                  )}
                </div>
              ) : null}
            </div>

            {/* FORMULARIO REVISIÓN (base) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <CardTitle title={t("revisions.revisionData")} subtitle={t("revisions.revisionDataSubtitle")} />
              <div className="grid grid-cols-12 gap-3 mt-3">
                <div className="col-span-12 md:col-span-4">
                  <label className="text-xs font-bold text-slate-500">{t("revisions.date")}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    onBlur={(e) => setFecha(normalizeDMY(e.target.value))}
                    disabled={loading || isView}
                    placeholder="DD/MM/YYYY"
                  />
                  {fecha.trim() && !isValidDMY(fecha) ? (
                    <div className="text-xs text-red-600 mt-1">{t("revisions.invalidDateFormat")}</div>
                  ) : null}
                </div>

                <div className="col-span-12 md:col-span-8">
                  <label className="text-xs font-bold text-slate-500">{t("revisions.professional")}</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    value={profesional}
                    onChange={(e) => setProfesional(e.target.value)}
                    disabled={loading || isView}
                  >
                    <option value="">{t("revisions.selectProfessional")}</option>
                    {profesionales.map((p) => (
                      <option key={p.id} value={p.nombreCompleto}>
                        {p.nombreCompleto}
                        {p.especialidad ? ` (${p.especialidad})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-12">
                  <label className="text-xs font-bold text-slate-500">{t("revisions.consultReason")}</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={motivoConsulta}
                    onChange={(e) => setMotivoConsulta(e.target.value)}
                    disabled={loading || isView}
                    rows={2}
                    placeholder={t("revisions.consultReasonPlaceholder")}
                  />
                </div>

                <div className="col-span-12">
                  <label className="text-xs font-bold text-slate-500">{t("revisions.symptoms")}</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={sintomas}
                    onChange={(e) => setSintomas(e.target.value)}
                    disabled={loading || isView}
                    rows={3}
                    placeholder={t("revisions.symptomsPlaceholder")}
                  />
                </div>

                <div className="col-span-12">
                  <label className="text-xs font-bold text-slate-500">{t("fields.observations")}</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    disabled={loading || isView}
                    rows={4}
                    placeholder={t("revisions.observationsPlaceholder")}
                  />
                </div>
              </div>
            </div>

            {/* EXPLORACIÓN OPTOMÉTRICA (colapsable) */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-200">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{t("revisions.optometricExam.title")}</div>
                  <div className="text-xs text-slate-500">
                    {t("revisions.optometricExam.summary", {
                      av: agudeza.length,
                      refrObj: refrObj.length,
                      refrFinal: refrFinal ? t("revisions.optometricExam.yes") : "—"
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpOpen((v) => !v)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                >
                  {expOpen ? t("revisions.clinicalHistory.hide") : t("revisions.clinicalHistory.show")}
                </button>
              </div>

              {expOpen ? (
                <div className="p-4 space-y-6">
                  {/* AGUDEZA VISUAL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-slate-900">{t("revisions.optometricExam.visualAcuity")}</div>

                      {!isView ? (
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                          onClick={() => setAgudeza((prev) => [...prev, emptyAgudezaRow()])}
                        >
                          {t("revisions.optometricExam.addRow")}
                        </button>
                      ) : null}
                    </div>

                    {agudeza.length ? (
                      <div className="overflow-auto border border-slate-200 rounded-xl">
                        <table className="min-w-245 w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">{t("revisions.optometricExam.distance")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.odWithout")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.oiWithout")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.binWithout")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.odWith")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.oiWith")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.binWith")}</th>
                              {!isView ? <th className="p-2" /> : null}
                            </tr>
                          </thead>

                          <tbody>
                            {agudeza.map((row, idx) => (
                              <tr key={row.id ?? idx} className="border-t border-slate-100">
                                <td className="p-2">
                                  <input
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                                    value={row.distancia ?? ""}
                                    disabled={loading || isView}
                                    onChange={(e) =>
                                      setAgudeza((prev) =>
                                        prev.map((r, i) => (i === idx ? { ...r, distancia: e.target.value } : r))
                                      )
                                    }
                                  />
                                </td>

                                {(
                                  [
                                    { k: "odSin", label: "OD sin" },
                                    { k: "oiSin", label: "OI sin" },
                                    { k: "binSin", label: "BIN sin" },
                                    { k: "odCon", label: "OD con" },
                                    { k: "oiCon", label: "OI con" },
                                    { k: "binCon", label: "BIN con" },
                                  ] as const
                                ).map(({ k }) => (
                                  <td className="p-2" key={k}>
                                    <input
                                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                                      value={(row as any)[k] ?? ""}
                                      disabled={loading || isView}
                                      onChange={(e) =>
                                        setAgudeza((prev) =>
                                          prev.map((r, i) => (i === idx ? { ...r, [k]: e.target.value } : r))
                                        )
                                      }
                                    />
                                  </td>
                                ))}

                                {!isView ? (
                                  <td className="p-2">
                                    <button
                                      type="button"
                                      className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                                      onClick={() => setAgudeza((prev) => prev.filter((_, i) => i !== idx))}
                                      title={t("revisions.optometricExam.deleteRow")}
                                    >
                                      🗑
                                    </button>
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>

                  {/* REFRACCIÓN OBJETIVA */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-slate-900">{t("revisions.optometricExam.objectiveRefraction")}</div>

                      {!isView ? (
                        <button
                          type="button"
                          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                          onClick={() => setRefrObj((prev) => [...prev, emptyRefrObjRow()])}
                        >
                          {t("revisions.optometricExam.addRow")}
                        </button>
                      ) : null}
                    </div>

                    {refrObj.length ? (
                      <div className="overflow-auto border border-slate-200 rounded-xl">
                        <table className="min-w-245 w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="p-2 text-left">{t("revisions.optometricExam.method")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.odSphere")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.odCylinder")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.odAxis")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.oiSphere")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.oiCylinder")}</th>
                              <th className="p-2 text-left">{t("revisions.optometricExam.oiAxis")}</th>
                              {!isView ? <th className="p-2" /> : null}
                            </tr>
                          </thead>

                          <tbody>
                            {refrObj.map((row, idx) => (
                              <tr key={row.id ?? idx} className="border-t border-slate-100">
                                <td className="p-2">
                                  <input
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                                    value={row.metodo ?? ""}
                                    disabled={loading || isView}
                                    onChange={(e) =>
                                      setRefrObj((prev) =>
                                        prev.map((r, i) => (i === idx ? { ...r, metodo: e.target.value } : r))
                                      )
                                    }
                                  />
                                </td>

                                {(
                                  ["odEsf", "odCil", "odEje", "oiEsf", "oiCil", "oiEje"] as const
                                ).map((k) => (
                                  <td className="p-2" key={k}>
                                    <input
                                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                                      value={(row as any)[k] ?? ""}
                                      disabled={loading || isView}
                                      onChange={(e) =>
                                        setRefrObj((prev) =>
                                          prev.map((r, i) => (i === idx ? { ...r, [k]: e.target.value } : r))
                                        )
                                      }
                                    />
                                  </td>
                                ))}

                                {!isView ? (
                                  <td className="p-2">
                                    <button
                                      type="button"
                                      className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                                      onClick={() => setRefrObj((prev) => prev.filter((_, i) => i !== idx))}
                                      title={t("revisions.optometricExam.deleteRow")}
                                    >
                                      🗑
                                    </button>
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>

                  {/* REFRACCIÓN FINAL */}
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle title={t("revisions.optometricExam.finalRefraction")} subtitle={t("revisions.optometricExam.finalRefractionSubtitle")} />
                      {!isView ? (
                        <div className="flex items-center gap-2">
                          {refrFinal ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setRefrFinal(null)}
                              title={t("revisions.optometricExam.delete")}
                            >
                              {t("revisions.optometricExam.delete")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setRefrFinal(emptyRefrFinal())}
                            >
                              {t("revisions.optometricExam.add")}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {refrFinal ? (
                      <div className="grid grid-cols-12 gap-3 mt-3">
                        <div className="col-span-12 md:col-span-6">
                          <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.optometricExam.od")}</div>
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.sphere")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.odEsf}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, odEsf: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.cylinder")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.odCil}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, odCil: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.axis")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.odEje}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, odEje: e.target.value } : p))}
                              />
                            </div>

                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.addition")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.odAdd}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, odAdd: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.prism")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.prismaOd}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, prismaOd: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.base")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.baseOd}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, baseOd: e.target.value } : p))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                          <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.optometricExam.oi")}</div>
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.sphere")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.oiEsf}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, oiEsf: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.cylinder")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.oiCil}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, oiCil: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.axis")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.oiEje}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, oiEje: e.target.value } : p))}
                              />
                            </div>

                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.addition")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.oiAdd}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, oiAdd: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.prism")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.prismaOi}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, prismaOi: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.base")}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                value={refrFinal.baseOi}
                                disabled={loading || isView}
                                onChange={(e) => setRefrFinal((p) => (p ? { ...p, baseOi: e.target.value } : p))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 mt-2">—</div>
                    )}
                  </div>

                  {/* BINOCULAR / MOTILIDAD / SALUD OCULAR / QUERATO */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle title={t("revisions.optometricExam.binocular")} />
                        {!isView ? (
                          binocular ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setBinocular(null)}
                            >
                              {t("revisions.optometricExam.delete")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setBinocular(emptyBinocular())}
                            >
                              {t("revisions.optometricExam.add")}
                            </button>
                          )
                        ) : null}
                      </div>

                      {binocular ? (
                        <div className="grid grid-cols-12 gap-2 mt-3">
                          {(
                            [
                              { k: "coverLejos", labelKey: "coverFar" },
                              { k: "coverCerca", labelKey: "coverNear" },
                              { k: "convergencia", labelKey: "convergence" },
                              { k: "vergencias", labelKey: "vergences" },
                              { k: "estereopsis", labelKey: "stereopsis" },
                            ] as const
                          ).map(({ k, labelKey }) => (
                            <div key={k} className="col-span-12 md:col-span-6">
                              <label className="text-xs font-bold text-slate-500">{t(`revisions.optometricExam.${labelKey}`)}</label>
                              <input
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                value={(binocular as any)[k] ?? ""}
                                disabled={loading || isView}
                                onChange={(e) =>
                                  setBinocular((p) => (p ? { ...p, [k]: e.target.value } : p))
                                }
                              />
                            </div>
                          ))}

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("fields.observations")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={binocular.observaciones ?? ""}
                              disabled={loading || isView}
                              rows={3}
                              onChange={(e) => setBinocular((p) => (p ? { ...p, observaciones: e.target.value } : p))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mt-2">—</div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle title={t("revisions.optometricExam.motilityPupils")} />
                        {!isView ? (
                          motilidadPupilas ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setMotilidadPupilas(null)}
                            >
                              {t("revisions.optometricExam.delete")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setMotilidadPupilas(emptyMotilidad())}
                            >
                              {t("revisions.optometricExam.add")}
                            </button>
                          )
                        ) : null}
                      </div>

                      {motilidadPupilas ? (
                        <div className="grid grid-cols-12 gap-2 mt-3">
                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.motility")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={motilidadPupilas.motilidad ?? ""}
                              disabled={loading || isView}
                              rows={2}
                              onChange={(e) =>
                                setMotilidadPupilas((p) => (p ? { ...p, motilidad: e.target.value } : p))
                              }
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.pupils")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={motilidadPupilas.pupilas ?? ""}
                              disabled={loading || isView}
                              rows={2}
                              onChange={(e) =>
                                setMotilidadPupilas((p) => (p ? { ...p, pupilas: e.target.value } : p))
                              }
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("fields.observations")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={motilidadPupilas.observaciones ?? ""}
                              disabled={loading || isView}
                              rows={3}
                              onChange={(e) =>
                                setMotilidadPupilas((p) => (p ? { ...p, observaciones: e.target.value } : p))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mt-2">—</div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle title={t("revisions.optometricExam.ocularHealth")} />
                        {!isView ? (
                          saludOcular ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setSaludOcular(null)}
                            >
                              {t("revisions.optometricExam.delete")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setSaludOcular(emptySaludOcular())}
                            >
                              {t("revisions.optometricExam.add")}
                            </button>
                          )
                        ) : null}
                      </div>

                      {saludOcular ? (
                        <div className="grid grid-cols-12 gap-2 mt-3">
                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.biomicroscopy")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.biomicroscopia ?? ""}
                              disabled={loading || isView}
                              rows={2}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, biomicroscopia: e.target.value } : p))}
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.fundus")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.fondoOjo ?? ""}
                              disabled={loading || isView}
                              rows={2}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, fondoOjo: e.target.value } : p))}
                            />
                          </div>

                          <div className="col-span-6">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.iopOd")}</label>
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.iopOd ?? ""}
                              disabled={loading || isView}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, iopOd: e.target.value } : p))}
                            />
                          </div>

                          <div className="col-span-6">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.iopOi")}</label>
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.iopOi ?? ""}
                              disabled={loading || isView}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, iopOi: e.target.value } : p))}
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.iopMethod")}</label>
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.iopMetodo ?? ""}
                              disabled={loading || isView}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, iopMetodo: e.target.value } : p))}
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("revisions.optometricExam.visualField")}</label>
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.campoVisual ?? ""}
                              disabled={loading || isView}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, campoVisual: e.target.value } : p))}
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("fields.observations")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={saludOcular.observaciones ?? ""}
                              disabled={loading || isView}
                              rows={3}
                              onChange={(e) => setSaludOcular((p) => (p ? { ...p, observaciones: e.target.value } : p))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mt-2">—</div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle title={t("revisions.optometricExam.keratometryTopography")} />
                        {!isView ? (
                          queratoTopo ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setQueratoTopo(null)}
                            >
                              {t("revisions.optometricExam.delete")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setQueratoTopo(emptyQueratoTopo())}
                            >
                              {t("revisions.optometricExam.add")}
                            </button>
                          )
                        ) : null}
                      </div>

                      {queratoTopo ? (
                        <div className="grid grid-cols-12 gap-2 mt-3">
                          <div className="col-span-12">
                            <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.optometricExam.od")}</div>
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-4">
                                <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.k1")}</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={queratoTopo.odK1 ?? ""}
                                  disabled={loading || isView}
                                  onChange={(e) => setQueratoTopo((p) => (p ? { ...p, odK1: e.target.value } : p))}
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.k2")}</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={queratoTopo.odK2 ?? ""}
                                  disabled={loading || isView}
                                  onChange={(e) => setQueratoTopo((p) => (p ? { ...p, odK2: e.target.value } : p))}
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.axis")}</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={queratoTopo.odEje ?? ""}
                                  disabled={loading || isView}
                                  onChange={(e) => setQueratoTopo((p) => (p ? { ...p, odEje: e.target.value } : p))}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="col-span-12">
                            <div className="text-xs font-bold text-slate-500 mb-1">{t("revisions.optometricExam.oi")}</div>
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-4">
                                <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.k1")}</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={queratoTopo.oiK1 ?? ""}
                                  disabled={loading || isView}
                                  onChange={(e) => setQueratoTopo((p) => (p ? { ...p, oiK1: e.target.value } : p))}
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.k2")}</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={queratoTopo.oiK2 ?? ""}
                                  disabled={loading || isView}
                                  onChange={(e) => setQueratoTopo((p) => (p ? { ...p, oiK2: e.target.value } : p))}
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="text-[11px] text-slate-500">{t("revisions.optometricExam.axis")}</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  value={queratoTopo.oiEje ?? ""}
                                  disabled={loading || isView}
                                  onChange={(e) => setQueratoTopo((p) => (p ? { ...p, oiEje: e.target.value } : p))}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-bold text-slate-500">{t("fields.observations")}</label>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={queratoTopo.observaciones ?? ""}
                              disabled={loading || isView}
                              rows={3}
                              onChange={(e) =>
                                setQueratoTopo((p) => (p ? { ...p, observaciones: e.target.value } : p))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 mt-2">—</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">{isNew ? t("revisions.creatingRevision") : t("revisions.viewingEditing")}</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                disabled={loading}
              >
                {t("common:buttons.cancel")}
              </button>

              {!isView ? (
                <button
                  type="button"
                  onClick={onSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  disabled={loading || !canSave}
                >
                  {loading ? t("common:buttons.saving") : t("common:buttons.save")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
