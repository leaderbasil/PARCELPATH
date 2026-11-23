import { UI } from "@/constants/ui";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? UI.common.switchToLight : UI.common.switchToDark;
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
