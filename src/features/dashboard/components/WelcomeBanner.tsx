"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Clock,
  Clock1,
  Clock2,
  Clock3,
  Clock4,
  Clock5,
  Clock6,
  Clock7,
  Clock8,
  Clock9,
  Clock10,
  Clock11,
  Clock12,
  type LucideIcon,
} from "lucide-react";

type Props = {
  name: string;
  greeting?: string;
  className?: string;
  height?: "compact" | "normal" | "tall";
  size?: "sm" | "md" | "lg";
  showClock?: boolean;
  clockIcon?: LucideIcon;
  dynamicClockByHour?: boolean;
  timeZone?: string;
  withSeconds?: boolean;
  artImgClassName?: string;
  artWrapperClassName?: string;
};

type HeightKey = NonNullable<Props["height"]>;
type SizeKey = NonNullable<Props["size"]>;

const HEIGHTS: Record<HeightKey, string> = {
  compact: "min-h-[110px]",
  normal: "min-h-[160px]",
  tall: "min-h-[220px]",
};

const SIZES: Record<SizeKey, { pad: string; artImg: string; radius: string }> =
  {
    sm: { pad: "pl-4 py-3", artImg: "h-28", radius: "rounded-xl" },
    md: { pad: "pl-6 py-5", artImg: "h-24", radius: "rounded-2xl" },
    lg: { pad: "pl-8 py-6", artImg: "h-32", radius: "rounded-3xl" },
  };

const CLOCK_BY_HOUR: Record<number, LucideIcon> = {
  1: Clock1,
  2: Clock2,
  3: Clock3,
  4: Clock4,
  5: Clock5,
  6: Clock6,
  7: Clock7,
  8: Clock8,
  9: Clock9,
  10: Clock10,
  11: Clock11,
  12: Clock12,
};

function getHour24(date: Date, timeZone?: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(date),
  );
}

function computeGreeting(date: Date, tz?: string) {
  const hour = getHour24(date, tz);

  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";

  return "Buenas noches";
}

function formatTime(date: Date, tz?: string, withSeconds?: boolean) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
    timeZone: tz,
  }).format(date);
}

export function WelcomeBanner({
  name,
  greeting,
  className,
  height = "normal",
  size = "md",
  showClock = false,
  clockIcon,
  dynamicClockByHour = false,
  timeZone = "America/Argentina/Buenos_Aires",
  withSeconds = false,
  artImgClassName,
  artWrapperClassName,
}: Props) {
  const h = HEIGHTS[height];
  const s = SIZES[size];

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateNow = () => setNow(new Date());

    updateNow();

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const delay = withSeconds
      ? 1000 - (Date.now() % 1000)
      : 60_000 - (Date.now() % 60_000);

    const timeoutId = setTimeout(() => {
      updateNow();
      intervalId = setInterval(updateNow, withSeconds ? 1000 : 60_000);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [withSeconds]);

  const gText = greeting ?? computeGreeting(now, timeZone);
  const timeText = formatTime(now, timeZone, withSeconds);

  const hour24 = getHour24(now, timeZone);
  const hour12 = hour24 % 12 || 12;
  const AutoIcon = CLOCK_BY_HOUR[hour12];
  const FinalIcon = clockIcon ?? (dynamicClockByHour ? AutoIcon : Clock);

  return (
    <section className={className}>
      <div
        className={`brand-surface group relative ${h} ${s.radius} overflow-hidden border border-white/15 text-white shadow-sm transition-colors duration-300`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,_rgba(255,255,255,0.18),_transparent_34%)]" />
        <div className="grid h-full grid-cols-[1fr_auto] items-center">
          <div className={`${s.pad} relative z-10 pr-4`}>
            <p className="text-xl text-white/82">
              Hola <span className="font-semibold text-white">{name}</span>,
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white/82">
              <span className="inline-flex items-center gap-2">
                {gText}
                {showClock && (
                  <>
                    <FinalIcon className="h-4 w-4" aria-hidden />
                    <time dateTime={now.toISOString()}>{timeText}</time>
                  </>
                )}
              </span>
            </h2>
          </div>

          <div className="relative z-10 flex h-full items-end justify-end pr-0">
            <div className={artWrapperClassName}>
              <Image
                src="/welcome.png"
                alt="Ilustración de bienvenida"
                width={320}
                height={320}
                priority
                className={`${s.artImg} w-auto pointer-events-none select-none drop-shadow-sm ${artImgClassName ?? ""}`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
