import { useI18n } from "@/i18n";
import { cn } from "@/utils/cn";

/** Compact switcher: Arabic is the default, English flips the whole app to LTR. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale, ui } = useI18n();
  const label = locale === "ar" ? ui.common.switchToEnglish : ui.common.switchToArabic;

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 min-w-9 items-center justify-center rounded-lg px-1.5 text-xs font-bold text-text-muted transition-colors hover:bg-background hover:text-text",
        className
      )}
    >
      {locale === "ar" ? "EN" : "ع"}
    </button>
  );
}
