import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DataTable, { type ColumnDef } from "~/components/DataTable";

type Key = React.Key;

export type NestedSubtableProps<C, G> = {
  title?: string;

  // ✅ Acción opcional en cabecera (ej: “+ Nueva revisión”)
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;

  // Hijos (subtabla)
  data: C[];
  columns: ColumnDef<C>[];
  getRowKey: (row: C, index?: number) => Key;

  emptyText?: string;

  // Nietos (subSubtabla) -> opcional
  getGrandChildren?: (child: C) => G[];
  grandColumns?: ColumnDef<G>[];
  getGrandRowKey?: (row: G, index?: number) => Key;

  grandTitle?: string;
  emptyGrandText?: string;

  // Estilos opcionales para encajar en tu UI
  wrapperClassName?: string;

  // ✅ Estilo del wrapper de la subSubtabla (nivel 3)
  grandWrapperClassName?: string;

  // Si quieres controlar cuándo se muestra flecha en hijos (si no, por defecto: si hay nietos)
  isChildExpandable?: (child: C, key: Key, index: number) => boolean;
};

export default function NestedSubtable<C, G>({
  title,

  actionLabel,
  onAction,
  actionDisabled = false,

  data,
  columns,
  getRowKey,
  emptyText,

  getGrandChildren,
  grandColumns,
  getGrandRowKey,
  grandTitle,
  emptyGrandText,

  wrapperClassName = "bg-white rounded border border-slate-200 overflow-hidden",
  grandWrapperClassName = "bg-white rounded border border-slate-200 overflow-hidden",

  isChildExpandable,
}: NestedSubtableProps<C, G>) {
  const { t } = useTranslation("common");
  const resolvedTitle = title ?? t("nestedTable.detail");
  const resolvedEmptyText = emptyText ?? t("nestedTable.empty");
  const resolvedGrandTitle = grandTitle ?? t("nestedTable.subdetail");
  const resolvedEmptyGrandText = emptyGrandText ?? t("nestedTable.empty");
  const [expandedChildId, setExpandedChildId] = useState<Key | null>(null);

  const canHaveGrand = Boolean(getGrandChildren && grandColumns && getGrandRowKey);

  const defaultIsChildExpandable = useMemo(() => {
    if (!canHaveGrand) return () => false;
    return (child: C) => {
      const arr = getGrandChildren!(child) ?? [];
      return arr.length > 0;
    };
  }, [canHaveGrand, getGrandChildren]);

  const showAction = Boolean(actionLabel && onAction);

  return (
    <div className="border-l-4 border-blue-200 pl-4">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {resolvedTitle}
          </h4>
          <span className="text-xs text-slate-400">{t("nestedTable.records", { count: data.length })}</span>
        </div>

        {showAction ? (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <DataTable<C>
        columns={columns}
        data={data}
        getRowKey={getRowKey}
        emptyText={resolvedEmptyText}
        wrapperClassName={wrapperClassName}
        isRowExpandable={(child, key, idx) => {
          if (!canHaveGrand) return false;
          return isChildExpandable
            ? isChildExpandable(child, key, idx)
            : defaultIsChildExpandable(child);
        }}
        isRowExpanded={(_, key) => expandedChildId === key}
        onToggleExpand={(_, key) => setExpandedChildId((prev) => (prev === key ? null : key))}
        renderExpandedRow={
          canHaveGrand
            ? (child) => {
                const grand = (getGrandChildren!(child) ?? []) as G[];

                return (
                  <div className="border-l-4 border-emerald-200 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {resolvedGrandTitle}
                      </h5>
                      <span className="text-xs text-slate-400">
                        {t("nestedTable.records", { count: grand.length })}
                      </span>
                    </div>

                    <DataTable<G>
                      columns={grandColumns!}
                      data={grand}
                      getRowKey={getGrandRowKey!}
                      emptyText={resolvedEmptyGrandText}
                      showExpandColumn={false}
                      wrapperClassName={grandWrapperClassName}
                    />
                  </div>
                );
              }
            : undefined
        }
      />
    </div>
  );
}
