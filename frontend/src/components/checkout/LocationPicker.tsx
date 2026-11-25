import { useEffect, useState } from "react";

import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { UI } from "@/constants/ui";
import { cn } from "@/utils/cn";
import { googleMapsEmbedUrl, googleMapsSearchUrl, parseMapLocation } from "@/utils/googleMaps";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: (element: HTMLInputElement | null) => void;
  error?: string;
}

export function LocationPicker({ value, onChange, onBlur, inputRef, error }: LocationPickerProps) {
  const parsed = parseMapLocation(value);
  const query = parsed.query;
  const hasLocation = query.length > 0;
  const [previewQuery, setPreviewQuery] = useState(query);

  // Avoid reloading the embedded map on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const openInGoogleMaps = () => {
    const url = parsed.url ?? googleMapsSearchUrl(query || "الرياض");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-2">
      <Input
        label={UI.checkout.mapLocation}
        name="map_query"
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={UI.checkout.mapSearch}
        hint={UI.checkout.mapHint}
        error={error}
        dir="auto"
      />
      <Button type="button" variant="secondary" onClick={openInGoogleMaps} className="w-full">
        {UI.checkout.openInMaps}
      </Button>

      {hasLocation ? (
        <iframe
          title={UI.checkout.mapLocation}
          src={googleMapsEmbedUrl(previewQuery)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className={cn(
            "h-44 w-full rounded-xl border border-border bg-background",
            error && "border-danger"
          )}
        />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 text-center text-xs text-text-muted">
          {UI.checkout.mapSearch}
        </div>
      )}
    </div>
  );
}
