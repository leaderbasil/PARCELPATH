import { useEffect, useState } from "react";

import { PackageIcon } from "@/components/common/Icons";
import { getObjectUrl, isObjectRef } from "@/services/objectStorage";
import { cn } from "@/utils/cn";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}

export function ProductImage({ src, alt, className, imgClassName }: ProductImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setLoaded(false);
    setResolvedSrc(null);

    if (!src) return () => { active = false; };
    if (!isObjectRef(src)) {
      setResolvedSrc(src);
      return () => { active = false; };
    }

    void getObjectUrl(src)
      .then((url) => {
        if (active) setResolvedSrc(url);
        if (!url && active) setFailed(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [src]);

  const showImage = Boolean(resolvedSrc) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-background", className)}>
      {showImage ? (
        <>
          {!loaded ? <div className="skeleton absolute inset-0" aria-hidden="true" /> : null}
          <img
            src={resolvedSrc ?? undefined}
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
