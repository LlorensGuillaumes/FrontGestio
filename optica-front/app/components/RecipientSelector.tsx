// app/components/RecipientSelector.tsx
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

export type EmpresaInfo = {
  id: number;
  nombre: string;
  dbName: string;
};

export type Recipient = {
  id: number;
  username: string;
  nombre: string | null;
  puesto?: string | null;
  departamentos: string[];
  empresas?: EmpresaInfo[];
};

interface RecipientSelectorProps {
  recipients: Recipient[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function RecipientSelector({
  recipients,
  selected,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
}: RecipientSelectorProps) {
  const { t } = useTranslation(["comunicacion", "common"]);
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState<number | null>(null);

  // Get unique empresas from all recipients
  const empresas = useMemo(() => {
    const empresaMap = new Map<number, EmpresaInfo>();
    recipients.forEach((r) => {
      r.empresas?.forEach((e) => {
        if (!empresaMap.has(e.id)) {
          empresaMap.set(e.id, e);
        }
      });
    });
    return Array.from(empresaMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [recipients]);

  // Filter recipients by search and empresa
  const filteredRecipients = useMemo(() => {
    let result = recipients;

    // Filter by empresa
    if (filterEmpresa !== null) {
      result = result.filter((r) =>
        r.empresas?.some((e) => e.id === filterEmpresa)
      );
    }

    // Filter by search (nombre, username, puesto, departamento)
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.username.toLowerCase().includes(searchLower) ||
          (r.nombre && r.nombre.toLowerCase().includes(searchLower)) ||
          (r.puesto && r.puesto.toLowerCase().includes(searchLower)) ||
          r.departamentos.some((d) => d.toLowerCase().includes(searchLower))
      );
    }

    return result.sort((a, b) => {
      const nameA = a.nombre || a.username;
      const nameB = b.nombre || b.username;
      return nameA.localeCompare(nameB);
    });
  }, [recipients, filterEmpresa, search]);

  const handleToggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleRemove = (id: number) => {
    onChange(selected.filter((s) => s !== id));
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredRecipients.map((r) => r.id);
    const newSelected = [...new Set([...selected, ...filteredIds])];
    onChange(newSelected);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredRecipients.map((r) => r.id));
    const newSelected = selected.filter((id) => !filteredIds.has(id));
    onChange(newSelected);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Check how many of the filtered recipients are selected
  const filteredSelectedCount = filteredRecipients.filter((r) => selected.includes(r.id)).length;
  const allFilteredSelected = filteredSelectedCount === filteredRecipients.length && filteredRecipients.length > 0;
  const someFilteredSelected = filteredSelectedCount > 0;

  const selectedRecipients = recipients.filter((r) => selected.includes(r.id));

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        {t("common:loading", "Cargando...")}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Selected recipients chips */}
      {selectedRecipients.length > 0 && (
        <div className="p-3 bg-blue-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              {selectedRecipients.length} {t("comunicacion:recipients.selected", "seleccionados")}
            </span>
            <button
              onClick={handleClearAll}
              disabled={disabled}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {t("comunicacion:recipients.clearAll", "Quitar todos")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRecipients.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 text-blue-800 text-sm rounded-full shadow-sm"
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                  {(r.nombre || r.username).charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[150px] truncate">{r.nombre || r.username}</span>
                {!disabled && (
                  <button
                    onClick={() => handleRemove(r.id)}
                    className="ml-0.5 text-blue-400 hover:text-blue-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters section */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder || t("comunicacion:recipients.searchPlaceholder", "Buscar por nombre o puesto...")}
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          />
        </div>

        {/* Empresa filter tabs */}
        {empresas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterEmpresa(null)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filterEmpresa === null
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              } disabled:opacity-50`}
            >
              {t("comunicacion:recipients.allCompanies", "Todas las empresas")}
            </button>
            {empresas.map((e) => (
              <button
                key={e.id}
                onClick={() => setFilterEmpresa(e.id)}
                disabled={disabled}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  filterEmpresa === e.id
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                } disabled:opacity-50`}
              >
                {e.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {filteredRecipients.length} {t("comunicacion:recipients.available", "disponibles")}
            {someFilteredSelected && (
              <span className="text-blue-600 ml-1">
                ({filteredSelectedCount} {t("comunicacion:recipients.selectedFromVisible", "sel.")})
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {someFilteredSelected && (
              <button
                onClick={handleDeselectAllFiltered}
                disabled={disabled}
                className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("comunicacion:recipients.deselectAllVisible", "Quitar visibles")}
              </button>
            )}
            {!allFilteredSelected && filteredRecipients.length > 0 && (
              <button
                onClick={handleSelectAllFiltered}
                disabled={disabled}
                className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("comunicacion:recipients.selectAllVisible", "Seleccionar visibles")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recipients list */}
      <div className="max-h-72 overflow-y-auto">
        {filteredRecipients.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium">{t("comunicacion:recipients.noResults", "No se encontraron usuarios")}</p>
            <p className="text-sm mt-1">{t("comunicacion:recipients.tryOtherFilter", "Prueba con otro filtro o busqueda")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecipients.map((user) => {
              const isSelected = selected.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => handleToggle(user.id)}
                  disabled={disabled}
                  className={`w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-slate-50 transition-colors disabled:opacity-50 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 flex items-center justify-center text-base font-semibold flex-shrink-0">
                    {(user.nombre || user.username).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {user.nombre || user.username}
                      </p>
                      {/* Department tags - aligned right */}
                      {user.departamentos.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1 flex-shrink-0">
                          {user.departamentos.slice(0, 2).map((dept) => (
                            <span
                              key={dept}
                              className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full whitespace-nowrap"
                            >
                              {dept}
                            </span>
                          ))}
                          {user.departamentos.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-full">
                              +{user.departamentos.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {user.puesto && (
                        <span className="text-xs text-slate-500">{user.puesto}</span>
                      )}
                      {user.puesto && user.empresas && user.empresas.length > 0 && (
                        <span className="text-slate-300">·</span>
                      )}
                      {user.empresas && user.empresas.length > 0 && (
                        <span className="text-xs text-slate-400 truncate">
                          {user.empresas.map((e) => e.nombre).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
