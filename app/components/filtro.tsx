import React from "react";
import { Form, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

type Option = { value: string; label: string };

type GridPos = {
  colSpan?: number;   // md:col-span-*
  colStart?: number;  // md:col-start-*
  rowStart?: number;  // md:row-start-*
};

export type FilterField =
  | ({
      name: string;
      label: string;
      type: "text";
      placeholder?: string;
    } & GridPos)
  | ({
      name: string;
      label: string;
      type: "number";
      placeholder?: string;
    } & GridPos)
  | ({
      name: string;
      label: string;
      type: "date";
    } & GridPos)
  | ({
      name: string;
      label: string;
      type: "select";
      options: Option[];
      allowEmpty?: boolean;
      emptyLabel?: string;
    } & GridPos)
  | ({
      name: string;
      label: string;
      type: "checkbox";
    } & GridPos);

type FilterBarProps = {
  fields: FilterField[];

  /** Grid layout en md */
  mdCols?: 6 | 8 | 10 | 12;

  /** Al aplicar filtros, normalmente vuelve a pagina 1 */
  resetPageParamName?: string;
  resetPageTo?: string;

  submitText?: string;
  clearText?: string;

  /** Preserva params no-filtro (porPagina, etc.) */
  preserveParams?: string[];

  /** Opcional: si quieres que el grid "rellene huecos" */
  dense?: boolean;
};

const GRID_COLS: Record<number, string> = {
  6: "md:grid-cols-6",
  8: "md:grid-cols-8",
  10: "md:grid-cols-10",
  12: "md:grid-cols-12",
};

const COL_SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

const COL_START: Record<number, string> = {
  1: "md:col-start-1",
  2: "md:col-start-2",
  3: "md:col-start-3",
  4: "md:col-start-4",
  5: "md:col-start-5",
  6: "md:col-start-6",
  7: "md:col-start-7",
  8: "md:col-start-8",
  9: "md:col-start-9",
  10: "md:col-start-10",
  11: "md:col-start-11",
  12: "md:col-start-12",
};

const ROW_START: Record<number, string> = {
  1: "md:row-start-1",
  2: "md:row-start-2",
  3: "md:row-start-3",
  4: "md:row-start-4",
  5: "md:row-start-5",
  6: "md:row-start-6",
};

const inputBase =
  "w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 shadow-sm " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";

export default function FilterBar({
  fields,
  mdCols = 8,
  resetPageParamName = "pagina",
  resetPageTo = "1",
  submitText,
  clearText,
  preserveParams = ["porPagina"],
  dense = false,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const applyText = submitText ?? t("common:buttons.apply");
  const resetText = clearText ?? t("common:buttons.clear");

  const mdGridColsClass = GRID_COLS[mdCols] ?? "md:grid-cols-8";
  const denseClass = dense ? "md:grid-flow-row-dense" : "";

  const handleClear = () => {
    const next = new URLSearchParams();
    next.set(resetPageParamName, resetPageTo);

    for (const p of preserveParams) {
      const v = searchParams.get(p);
      if (v) next.set(p, v);
    }

    setSearchParams(next, { replace: true });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3">
      <Form
        key={searchParams.toString()}
        method="get"
        className={`grid grid-cols-1 ${mdGridColsClass} ${denseClass} gap-3 items-end`}
      >
        {/* al filtrar, vuelve a página 1 */}
        <input type="hidden" name={resetPageParamName} value={resetPageTo} />

        {/* preserva params en la URL como hidden (porPagina, etc.) */}
        {preserveParams.map((p) => {
          const v = searchParams.get(p);
          return v ? <input key={p} type="hidden" name={p} value={v} /> : null;
        })}

        {fields.map((f) => {
          const colSpan = f.colSpan ?? 1;
          const colClass = COL_SPAN[colSpan] ?? "md:col-span-1";

          const colStartClass = f.colStart ? (COL_START[f.colStart] ?? "") : "";
          const rowStartClass = f.rowStart ? (ROW_START[f.rowStart] ?? "") : "";

          const defaultValue = searchParams.get(f.name) || "";

          const wrapperClass = [colClass, colStartClass, rowStartClass].join(" ").trim();

          return (
            <div key={f.name} className={wrapperClass}>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                {f.label}
              </label>

              {f.type === "select" ? (
                <select name={f.name} defaultValue={defaultValue} className={inputBase}>
                  {(f.allowEmpty ?? true) && (
                    <option value="">{f.emptyLabel ?? t("common:filters.all")}</option>
                  )}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "date" ? (
                <input type="date" name={f.name} defaultValue={defaultValue} className={inputBase} />
              ) : f.type === "number" ? (
                <input
                  type="number"
                  name={f.name}
                  defaultValue={defaultValue}
                  placeholder={f.placeholder}
                  className={inputBase}
                />
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 h-9 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name={f.name}
                    value="1"
                    defaultChecked={defaultValue === "1"}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">{t("common:filters.enabled")}</span>
                </label>
              ) : (
                <input
                  type="text"
                  name={f.name}
                  defaultValue={defaultValue}
                  placeholder={f.placeholder}
                  className={inputBase}
                />
              )}
            </div>
          );
        })}

        {/* Botones: por defecto ocupan toda la fila en md */}
        <div className={`${COL_SPAN[mdCols] ?? "md:col-span-8"} flex gap-2 pt-1`}>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition"
          >
            {applyText}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition"
          >
            {resetText}
          </button>
        </div>
      </Form>
    </div>
  );
}
