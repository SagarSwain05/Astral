import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { LANGUAGES } from "../../i18n";

const LanguageSwitcher = ({ className = "" }) => {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || "en";

  return (
    <label
      className={`relative flex items-center gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${className}`}
      title={t("nav.language")}
    >
      <Languages className="w-5 h-5 text-white/70" />
      <span className="text-xs font-semibold text-white/70 uppercase">
        {current}
      </span>
      <select
        aria-label={t("nav.language")}
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
