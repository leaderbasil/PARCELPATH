import { useUI } from "@/i18n";
import { cn } from "@/utils/cn";
import { googleMapsSearchUrl, safeGoogleMapsHref } from "@/utils/googleMaps";

interface MapLinkProps {
  query?: string | null;
  url?: string | null;
  className?: string;
}

export function MapLink({ query, url, className }: MapLinkProps) {
  const ui = useUI();
  const target = safeGoogleMapsHref(url) ?? (query?.trim() ? googleMapsSearchUrl(query.trim()) : "");
  if (!target) return null;

  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${ui.checkout.viewOnMap} - ${ui.checkout.mapNewTab}`}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary-strong underline underline-offset-2 hover:text-primary",
        className
      )}
    >
      {ui.checkout.viewOnMap}
    </a>
  );
}
