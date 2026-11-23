import { useState } from "react";

import { PackageIcon } from "@/components/common/Icons";
import { cn } from "@/utils/cn";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}

export function ProductImage({ src, alt, className, imgClassName }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-background", className)}>
      {showImage ? (
        <>
          {!loaded ? <div className="absolute inset-0 animate-pulse bg-primary-soft/70" aria-hidden="true" /> : null}
          <img
            src={src ?? undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
              imgClassName
            )}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-muted">
          <PackageIcon className="h-8 w-8 opacity-60" />
        </div>
      )}
    </div>
  );
}
