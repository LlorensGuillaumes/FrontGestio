import React from "react";
import { useTranslation } from "react-i18next";

type Align = "left" | "center" | "right";

const alignToClass = (a?: Align) => {
  if (a === "center") return "text-center";
  if (a === "right") return "text-right";
  return "text-left";
};

export type ColumnDef<T> = {
  header: string;
  headerAlign?: Align;
  cellAlign?: Align;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  getRowKey: (row: T, index?: number) => React.Key;
  emptyText?: string;

  rowClassName?: (row: T, key: React.Key, index: number) => string;

  // Expandible (solo con flecha)
  isRowExpandable?: (row: T, key: React.Key, index: number) => boolean;
  isRowExpanded?: (row: T, key: React.Key, index: number) => boolean;
  onToggleExpand?: (row: T, key: React.Key, index: number) => void;
  renderExpandedRow?: (row: T, key: React.Key, index: number) => React.ReactNode;

  // ✅ NUEVO: click de fila (para abrir modal, navegar, etc.)
  onRowClick?: (row: T, key: React.Key, index: number) => void;
  isRowClickable?: (row: T, key: React.Key, index: number) => boolean;
  disableRowClickWhenExpanded?: boolean;

  // Wrapper
  wrapperClassName?: string;
  tableClassName?: string;

  // Flecha en columna propia
  showExpandColumn?: boolean;
};

export default function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyText,
  rowClassName,

  isRowExpandable,
  isRowExpanded,
  onToggleExpand,
  renderExpandedRow,

  onRowClick,
  isRowClickable,
  disableRowClickWhenExpanded = false,

  wrapperClassName = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
  tableClassName = "min-w-full",
  showExpandColumn = true,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const defaultEmptyText = emptyText ?? t("common:messages.noResults");
  const colCount = columns.length + (showExpandColumn ? 1 : 0);
  const canExpandFeature = Boolean(renderExpandedRow && onToggleExpand && isRowExpanded);
  const hasRowClick = Boolean(onRowClick);

  return (
    <div className={wrapperClassName}>
      <table className={tableClassName}>
        <thead className="bg-slate-50">
          <tr>
            {showExpandColumn ? <th className="w-10 px-2 py-3" aria-label="Expandir" /> : null}

            {columns.map((c, i) => (
              <th
                key={i}
                className={[
                  "px-6 py-3 text-xs font-bold text-slate-500 uppercase",
                  alignToClass(c.headerAlign),
                  c.headerClassName ?? "",
                ].join(" ")}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length > 0 ? (
            data.map((row, idx) => {
              const key = getRowKey(row, idx);

              const expandable = canExpandFeature
                ? (isRowExpandable ? isRowExpandable(row, key, idx) : true)
                : false;

              const expanded = expandable && isRowExpanded ? isRowExpanded(row, key, idx) : false;

              const clickable = hasRowClick
                ? (isRowClickable ? isRowClickable(row, key, idx) : true)
                : false;

              const allowRowClick = clickable && !(disableRowClickWhenExpanded && expanded);

              const trBase = "border-b border-slate-100";
              const trHover = allowRowClick ? "cursor-pointer hover:bg-blue-50/30 transition-colors" : "";
              const trCustom = rowClassName ? rowClassName(row, key, idx) : "";

              return (
                <React.Fragment key={key}>
                  <tr
                    className={[trBase, trHover, trCustom].join(" ")}
                    onClick={
                      allowRowClick
                        ? () => onRowClick?.(row, key, idx)
                        : undefined
                    }
                  >
                    {showExpandColumn ? (
                      <td className="px-2 py-4 whitespace-nowrap text-sm">
                        {expandable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleExpand?.(row, key, idx);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 active:scale-[0.98] transition"
                            aria-label={expanded ? t("common:buttons.close") : t("common:buttons.edit")}
                          >
                            {expanded ? "▼" : "►"}
                          </button>
                        ) : null}
                      </td>
                    ) : null}

                    {columns.map((c, i) => (
                      <td
                        key={i}
                        className={[
                          "px-6 py-4 whitespace-nowrap text-sm text-slate-600",
                          alignToClass(c.cellAlign),
                          c.cellClassName ?? "",
                        ].join(" ")}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>

                  {expanded && renderExpandedRow ? (
                    <tr className="bg-slate-50/80">
                      <td colSpan={colCount} className="px-10 py-4 shadow-inner">
                        {renderExpandedRow(row, key, idx)}
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={colCount} className="px-6 py-20 text-center text-slate-400">
                {defaultEmptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

