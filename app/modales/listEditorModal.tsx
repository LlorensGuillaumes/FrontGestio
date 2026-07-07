import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type UpdateFn<T> = (patch: Partial<T>) => void;

export type ListEditorModalProps<T extends Record<string, any>> = {
  open: boolean;
  title: string;
  subtitle?: string;

  value: T[];
  onChange: (next: T[]) => void;

  createEmpty: () => T;
  normalize?: (items: T[]) => T[]; // para limpiar (trim, quitar vacíos, etc.)

  disabled?: boolean;
  maxWidthClassName?: string; // por si quieres abrirlo aún más ancho
  renderRow: (item: T, index: number, update: UpdateFn<T>, disabled: boolean) => React.ReactNode;

  onClose: () => void;
};

export function ListEditorModal<T extends Record<string, any>>(props: ListEditorModalProps<T>) {
  const { t } = useTranslation("common");
  const {
    open,
    title,
    subtitle,
    value,
    onChange,
    createEmpty,
    normalize,
    disabled = false,
    maxWidthClassName = "max-w-3xl",
    renderRow,
    onClose,
  } = props;

  const [draft, setDraft] = useState<T[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(value?.length ? value : [createEmpty()]);
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canApply = useMemo(() => !disabled, [disabled]);

  const updateItem = (idx: number, patch: Partial<T>) => {
    setTouched(true);
    setDraft((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setTouched(true);
    setDraft((prev) => [...prev, createEmpty()]);
  };

  const removeItem = (idx: number) => {
    setTouched(true);
    setDraft((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [createEmpty()];
    });
  };

  const apply = () => {
    if (!canApply) return;
    const cleaned = normalize ? normalize(draft) : draft;
    onChange(cleaned);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!disabled) onClose();
        }}
      />

      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={`w-[96vw] ${maxWidthClassName} bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">{title}</div>
              {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
            >
              {t("buttons.close")}
            </button>
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-auto">
            {draft.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-medium text-slate-700">{t("listEditor.element", { number: idx + 1 })}</div>

                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                      disabled={draft.length === 1}
                    >
                      {t("listEditor.remove")}
                    </button>
                  ) : null}
                </div>

                {renderRow(item, idx, (patch) => updateItem(idx, patch), disabled)}
              </div>
            ))}

            {!disabled ? (
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
              >
                {t("listEditor.add")}
              </button>
            ) : null}
          </div>

          {/* footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {disabled ? t("modes.reading") : touched ? t("listEditor.pendingChanges") : t("listEditor.noChanges")}
            </div>

            <div className="flex items-center gap-2">
              {!disabled ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  >
                    {t("buttons.cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={apply}
                    className="px-4 py-2 rounded-lg text-sm text-white bg-slate-900 hover:bg-slate-800"
                    disabled={!canApply}
                  >
                    {t("buttons.apply")}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
