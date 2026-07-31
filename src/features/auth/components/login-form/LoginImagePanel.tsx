"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { AUTH_IMAGES } from "../../constants/auth-theme";

type LoginImagePanelProps = {
  imageSources?: readonly string[];
};

const tileLabels = [
  "Actividad comunitaria de Mas San Miguel",
  "Jornada recreativa de Mas San Miguel",
  "Actividad deportiva de Mas San Miguel",
  "Participante de actividades de Mas San Miguel",
] as const;

export function LoginImagePanel({
  imageSources = AUTH_IMAGES.collage,
}: LoginImagePanelProps) {
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[var(--auth-primary)] lg:grid lg:grid-cols-2 lg:grid-rows-2">
      {imageSources.map((src, index) => {
        const showImage = Boolean(src) && !failedImages[index];

        return (
          <div
            key={src}
            className={cn(
              "relative min-h-0 overflow-hidden border-white/25",
              index === 0 || index === 2 ? "border-r" : "",
              index === 0 || index === 1 ? "border-b" : "",
            )}
          >
            {showImage ? (
              <Image
                src={src}
                alt={tileLabels[index] ?? "Imagen institucional"}
                fill
                priority={index < 2}
                sizes="25vw"
                className="object-cover"
                onError={() =>
                  setFailedImages((current) => ({
                    ...current,
                    [index]: true,
                  }))
                }
              />
            ) : (
              <div className="brand-outline-pattern absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-black/5" />
          </div>
        );
      })}
    </aside>
  );
}
