"use client";

import { useEffect, useState } from "react";
import { QuoteBanner } from "@/features/dashboard/components/QuoteBanner";

type Q = {
  text: string;
  author: string;
  provider: string;
  translated?: boolean;
};

export function QuoteBannerSmart({
  className,
  size = "sm",
  height = "compact",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  height?: "compact" | "normal" | "tall";
}) {
  const [q, setQ] = useState<Q | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        const r = await fetch("/api/quote-of-the-day", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as Q;
        if (alive) setQ(data);
      } catch (e: unknown) {
        if (alive) {
          const message =
            e instanceof Error ? e.message : "No se pudo obtener la frase";
          setErr(message);
          setQ(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Loading
  if (!q && !err) {
    return (
      <div
        className={`h-full rounded-xl border p-4 bg-white ${className ?? ""}`}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-4/5 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-1/3 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  // Error → fallback fijo
  if (err) {
    return (
      <QuoteBanner
        className={className}
        quote="La perseverancia no es una carrera larga; son muchas carreras cortas, una tras otra."
        author="Walter Elliot"
        subtitle="(sin conexión)"
        size={size}
        height={height}
      />
    );
  }

  // Ok
  return (
    <QuoteBanner
      className={className}
      quote={q!.text}
      author={q!.author}
      subtitle={q!.translated ? `${q!.provider} (traducido)` : q!.provider}
      size={size}
      height={height}
    />
  );
}
