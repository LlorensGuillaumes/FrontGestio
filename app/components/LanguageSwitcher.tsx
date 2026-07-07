import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const currentLang = i18n.language?.startsWith("ca") ? "ca" : "es";

  const toggleLanguage = () => {
    const newLang = currentLang === "es" ? "ca" : "es";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="w-full flex items-center justify-between p-2 hover:bg-slate-800 rounded text-slate-300 transition-colors text-sm"
      title={t("common:language.language")}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{t("common:language.language")}</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`px-1.5 py-0.5 text-xs rounded ${
            currentLang === "es"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          ES
        </span>
        <span
          className={`px-1.5 py-0.5 text-xs rounded ${
            currentLang === "ca"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          CA
        </span>
      </div>
    </button>
  );
}
