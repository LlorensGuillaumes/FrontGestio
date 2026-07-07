import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getHistoriaClinicaFull, updateHistoriaClinicaFull } from "~/lib/revisionesRest";

type Props = {
  idCliente: string;
  onClose: () => void;
  onSaved?: () => void;
};

type Antecedente = {
  IdAntecedente?: number;
  Tipo: string;
  Descripcion: string;
  FechaInicio?: string;
  FechaFin?: string;
};

type Medicacion = {
  IdMedicacion?: number;
  Medicamento: string;
  Dosis?: string;
  Frecuencia?: string;
  FechaInicio?: string;
  FechaFin?: string;
};

type Alergia = {
  IdAlergia?: number;
  Sustancia: string;
  Reaccion?: string;
};

type Habitos = {
  Fumador: number;
  Observaciones?: string;
};

export default function HistoriaClinicaModal({ idCliente, onClose, onSaved }: Props) {
  const { t } = useTranslation(["ventas", "common"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notasGenerales, setNotasGenerales] = useState("");
  const [antecedentes, setAntecedentes] = useState<Antecedente[]>([]);
  const [medicacion, setMedicacion] = useState<Medicacion[]>([]);
  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [habitos, setHabitos] = useState<Habitos>({ Fumador: 0, Observaciones: "" });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getHistoriaClinicaFull(idCliente);
        if (!mounted) return;

        setNotasGenerales(data?.historiaClinica?.NotasGenerales ?? "");
        setAntecedentes(data?.antecedentes ?? []);
        setMedicacion(data?.medicacion ?? []);
        setAlergias(data?.alergias ?? []);
        setHabitos(data?.habitos ?? { Fumador: 0, Observaciones: "" });
      } catch (e: any) {
        if (!mounted) return;
        setError(e.message ?? t("revisions.clinicalHistory.errorLoading"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [idCliente]);

  const onSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await updateHistoriaClinicaFull(idCliente, {
        historiaClinica: { notasGenerales },
        antecedentes,
        medicacion,
        alergias,
        habitos,
      });

      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e.message ?? t("revisions.clinicalHistory.errorSaving"));
    } finally {
      setSaving(false);
    }
  };

  const addAntecedente = () => {
    setAntecedentes([...antecedentes, { Tipo: "GENERAL", Descripcion: "" }]);
  };

  const removeAntecedente = (idx: number) => {
    setAntecedentes(antecedentes.filter((_, i) => i !== idx));
  };

  const addMedicacion = () => {
    setMedicacion([...medicacion, { Medicamento: "", Dosis: "", Frecuencia: "" }]);
  };

  const removeMedicacion = (idx: number) => {
    setMedicacion(medicacion.filter((_, i) => i !== idx));
  };

  const addAlergia = () => {
    setAlergias([...alergias, { Sustancia: "", Reaccion: "" }]);
  };

  const removeAlergia = (idx: number) => {
    setAlergias(alergias.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">{t("revisions.clinicalHistory.title")}</div>
              <div className="text-xs text-slate-500">{t("revisions.clinicalHistory.clientId", { id: idCliente })}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              {t("common:buttons.close")}
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-auto">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
            )}

            {loading ? (
              <div className="text-sm text-slate-500">{t("revisions.clinicalHistory.loading")}</div>
            ) : (
              <>
                {/* Notas generales */}
                <div>
                  <label className="text-sm font-bold text-slate-700">{t("revisions.clinicalHistory.generalNotes")}</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={notasGenerales}
                    onChange={(e) => setNotasGenerales(e.target.value)}
                    rows={3}
                    placeholder={t("revisions.clinicalHistory.generalNotesPlaceholder")}
                  />
                </div>

                {/* Antecedentes */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-700">{t("revisions.clinicalHistory.medicalHistory")}</div>
                    <button
                      type="button"
                      onClick={addAntecedente}
                      className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      {t("revisions.clinicalHistory.add")}
                    </button>
                  </div>

                  {antecedentes.length === 0 ? (
                    <div className="text-sm text-slate-500">{t("revisions.clinicalHistory.noHistory")}</div>
                  ) : (
                    <div className="space-y-2">
                      {antecedentes.map((ant, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                          <select
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={ant.Tipo}
                            onChange={(e) => {
                              const updated = [...antecedentes];
                              updated[idx] = { ...ant, Tipo: e.target.value };
                              setAntecedentes(updated);
                            }}
                          >
                            <option value="GENERAL">{t("revisions.clinicalHistory.typeGeneral")}</option>
                            <option value="OCULAR">{t("revisions.clinicalHistory.typeOcular")}</option>
                            <option value="FAMILIAR">{t("revisions.clinicalHistory.typeFamiliar")}</option>
                          </select>
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={ant.Descripcion}
                            onChange={(e) => {
                              const updated = [...antecedentes];
                              updated[idx] = { ...ant, Descripcion: e.target.value };
                              setAntecedentes(updated);
                            }}
                            placeholder={t("revisions.clinicalHistory.descriptionPlaceholder")}
                          />
                          <button
                            type="button"
                            onClick={() => removeAntecedente(idx)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-100"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medicacion */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-700">{t("revisions.clinicalHistory.medication")}</div>
                    <button
                      type="button"
                      onClick={addMedicacion}
                      className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      {t("revisions.clinicalHistory.add")}
                    </button>
                  </div>

                  {medicacion.length === 0 ? (
                    <div className="text-sm text-slate-500">{t("revisions.clinicalHistory.noMedication")}</div>
                  ) : (
                    <div className="space-y-2">
                      {medicacion.map((med, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={med.Medicamento}
                            onChange={(e) => {
                              const updated = [...medicacion];
                              updated[idx] = { ...med, Medicamento: e.target.value };
                              setMedicacion(updated);
                            }}
                            placeholder={t("revisions.clinicalHistory.medicationPlaceholder")}
                          />
                          <input
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={med.Dosis ?? ""}
                            onChange={(e) => {
                              const updated = [...medicacion];
                              updated[idx] = { ...med, Dosis: e.target.value };
                              setMedicacion(updated);
                            }}
                            placeholder={t("revisions.clinicalHistory.dosePlaceholder")}
                          />
                          <input
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={med.Frecuencia ?? ""}
                            onChange={(e) => {
                              const updated = [...medicacion];
                              updated[idx] = { ...med, Frecuencia: e.target.value };
                              setMedicacion(updated);
                            }}
                            placeholder={t("revisions.clinicalHistory.frequencyPlaceholder")}
                          />
                          <button
                            type="button"
                            onClick={() => removeMedicacion(idx)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-100"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alergias */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-slate-700">{t("revisions.clinicalHistory.allergies")}</div>
                    <button
                      type="button"
                      onClick={addAlergia}
                      className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      {t("revisions.clinicalHistory.add")}
                    </button>
                  </div>

                  {alergias.length === 0 ? (
                    <div className="text-sm text-slate-500">{t("revisions.clinicalHistory.noAllergies")}</div>
                  ) : (
                    <div className="space-y-2">
                      {alergias.map((ale, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={ale.Sustancia}
                            onChange={(e) => {
                              const updated = [...alergias];
                              updated[idx] = { ...ale, Sustancia: e.target.value };
                              setAlergias(updated);
                            }}
                            placeholder={t("revisions.clinicalHistory.substancePlaceholder")}
                          />
                          <input
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            value={ale.Reaccion ?? ""}
                            onChange={(e) => {
                              const updated = [...alergias];
                              updated[idx] = { ...ale, Reaccion: e.target.value };
                              setAlergias(updated);
                            }}
                            placeholder={t("revisions.clinicalHistory.reactionPlaceholder")}
                          />
                          <button
                            type="button"
                            onClick={() => removeAlergia(idx)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-100"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Habitos */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-bold text-slate-700 mb-3">{t("revisions.clinicalHistory.habits")}</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={habitos.Fumador === 1}
                        onChange={(e) => setHabitos({ ...habitos, Fumador: e.target.checked ? 1 : 0 })}
                      />
                      <span className="text-sm text-slate-700">{t("revisions.clinicalHistory.smoker")}</span>
                    </label>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-medium text-slate-500">{t("revisions.clinicalHistory.habitsObservations")}</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={habitos.Observaciones ?? ""}
                      onChange={(e) => setHabitos({ ...habitos, Observaciones: e.target.value })}
                      rows={2}
                      placeholder={t("revisions.clinicalHistory.habitsObservationsPlaceholder")}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
              disabled={saving}
            >
              {t("common:buttons.cancel")}
            </button>
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
              disabled={loading || saving}
            >
              {saving ? t("common:buttons.saving") : t("common:buttons.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
