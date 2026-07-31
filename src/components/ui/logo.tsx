"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type LogoSize = "sm" | "md" | "lg";

type LogoProps = {
  size?: LogoSize;
  className?: string;
};

const sizeMap: Record<
  LogoSize,
  {
    container: string;
    gap: string;
    iconWidth: number;
    iconHeight: number;
    textWidth: number;
    textHeight: number;
  }
> = {
  sm: {
    container: "h-16 px-4",
    gap: "gap-2",
    iconWidth: 24,
    iconHeight: 24,
    textWidth: 110,
    textHeight: 26,
  },
  md: {
    container: "h-20 px-6",
    gap: "gap-2",
    iconWidth: 30,
    iconHeight: 30,
    textWidth: 130,
    textHeight: 30,
  },
  lg: {
    container: "h-24 px-6",
    gap: "gap-3",
    iconWidth: 42,
    iconHeight: 42,
    textWidth: 180,
    textHeight: 42,
  },
};

export function Logo({ size = "md", className }: LogoProps) {
  const router = useRouter();

  const logoR = "/r.png";
  const logoRecibo = "/recibo2.png";

  const config = sizeMap[size];

  return (
    <div
      role="link"
      aria-label="Go to home"
      className={clsx(
        "w-full flex items-center justify-center cursor-pointer",
        config.container,
        config.gap,
        className,
      )}
      onClick={() => router.push("/")}
    >
      <Image
        src={logoR}
        alt="Logo R"
        width={config.iconWidth}
        height={config.iconHeight}
        className="rounded-lg"
        priority
      />
      <Image
        src={logoRecibo}
        alt="Recibo Digital"
        width={config.textWidth}
        height={config.textHeight}
        className="rounded-lg"
        priority
      />
    </div>
  );
}
