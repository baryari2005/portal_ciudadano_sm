"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { isSafeActivityImageSource } from "../helpers/actividad-display";

export function ActivityImagePreview({
  source,
  alt,
  className = "h-40",
}: {
  source: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const safeSource = isSafeActivityImageSource(source) ? source : null;

  useEffect(() => setFailed(false), [source]);

  if (!safeSource || failed) {
    return (
      <div
        className={`grid place-items-center rounded-2xl border border-dashed border-[var(--brand-border)] bg-[#E7F0E2] text-[var(--brand-muted)] ${className}`}
      >
        <div className="text-center">
          <ImageIcon className="mx-auto size-8 text-[var(--brand-primary)]" />
          <p className="mt-2 text-xs font-semibold">
            {failed ? "No se pudo cargar la imagen" : "Sin imagen"}
          </p>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admite rutas internas y hosts configurables sin proveedor de imágenes.
    <img
      src={safeSource}
      alt={alt}
      onError={() => setFailed(true)}
      className={`rounded-2xl border border-[var(--brand-border)] bg-[#E7F0E2] object-cover ${className}`}
    />
  );
}
