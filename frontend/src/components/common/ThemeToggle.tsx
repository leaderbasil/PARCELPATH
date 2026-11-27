import { useUI } from "@/i18n";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const ui = useUI();
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? ui.common.switchToLight : ui.common.switchToDark;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-lg text-text-muted transition-colors hover:bg-background hover:text-text", className)}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
