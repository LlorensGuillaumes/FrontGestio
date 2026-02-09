import { useTranslation } from "react-i18next";

type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  windowSize?: number;
  className?: string;
};

export default function PaginacionBar({
  currentPage,
  totalPages,
  onPageChange,
  windowSize = 2,
  className,
}: PaginationBarProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  // Calcula el rango visible [start..end]
  const start = Math.max(1, currentPage - windowSize);
  const end = Math.min(totalPages, currentPage + windowSize);

  // Genera los números visibles
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className={`flex justify-between items-center mt-1 mb-3 ${className ?? ""}`}>
      <p className="text-sm text-slate-500">
        {t("common:pagination.page", { current: currentPage, total: totalPages })}
      </p>

      <div className="flex space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-50 hover:bg-slate-50"
        >
          {t("common:buttons.previous")}
        </button>

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 text-sm rounded-lg border ${
              currentPage === page
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-50 hover:bg-slate-50"
        >
          {t("common:buttons.next")}
        </button>
      </div>
    </div>
  );
}
