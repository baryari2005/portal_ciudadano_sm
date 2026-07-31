"use client";

import Image from "next/image";

type Props = {
  title?: string;
  quote: string;
  author: string;
  subtitle?: string;
  illustrationSrc?: string;
  className?: string;
  height?: "compact" | "normal" | "tall";
  size?: "sm" | "md" | "lg";
};

const HEIGHTS = {
  compact: "min-h-[110px]",
  normal: "min-h-[160px]",
  tall: "min-h-[220px]",
} as const;

const SIZES = {
  sm: {
    pad: "pl-4 py-3",
    artClass: "h-16 w-16",
    radius: "rounded-xl",
    imgSize: 64,
  },
  md: {
    pad: "pl-6 py-5",
    artClass: "h-24 w-24",
    radius: "rounded-2xl",
    imgSize: 96,
  },
  lg: {
    pad: "pl-8 py-6",
    artClass: "h-32 w-32",
    radius: "rounded-3xl",
    imgSize: 128,
  },
} as const;

export function QuoteBanner({
  title = "Frase del día",
  quote,
  author,
  subtitle,
  illustrationSrc = "/quote-illustration.png",
  className,
  height = "normal",
  size = "md",
}: Props) {
  const h = HEIGHTS[height];
  const s = SIZES[size];

  return (
    <section className={className}>
      <div
        className={`brand-surface group relative ${h} ${s.radius} overflow-hidden border border-white/15 text-white shadow-sm transition-colors duration-300`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,_rgba(255,255,255,0.18),_transparent_34%)]" />
        <div className="grid h-full grid-cols-[1fr_auto] items-center">
          <div className={`${s.pad} relative z-10 pr-4`}>
            <p className="text-[16px] font-semibold tracking-wider text-white/70 uppercase">
              {title}
            </p>
            <p className="mt-1 text-sm-plus font-bold leading-6 text-white">
              {quote}
            </p>
            <p className="mt-2 text-sm text-white/70">
              {author}
              {subtitle ? ` — ${subtitle}` : null}
            </p>
          </div>

          <div className="relative z-10 flex h-full items-end justify-end pr-0 pt-5">
            <div
              className={`relative ${s.artClass} pointer-events-none select-none`}
            >
              <Image
                src={illustrationSrc}
                alt="Quote illustration"
                fill
                className="object-contain drop-shadow-sm"
                sizes={`${s.imgSize}px`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
