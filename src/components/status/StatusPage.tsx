"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, LockKeyhole, ShieldAlert, Wrench } from "lucide-react";
import { Logo } from "../ui/logo";

type Props = {
  code: "401" | "403" | "404" | "501";
  title: string;
  description?: string;
  imageSrc: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

function getStatusMeta(code: Props["code"]) {
  switch (code) {
    case "401":
      return {
        label: "Sesión requerida",
        icon: LockKeyhole,
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
      };
    case "403":
      return {
        label: "Acceso restringido",
        icon: ShieldAlert,
        badgeClass:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300",
      };
    case "404":
      return {
        label: "Página no encontrada",
        icon: AlertTriangle,
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
      };
    case "501":
    default:
      return {
        label: "Sección en construcción",
        icon: Wrench,
        badgeClass:
          "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-300",
      };
  }
}

export function StatusPage({
  code,
  title,
  description,
  imageSrc,
  primaryAction = { label: "Volver al inicio", href: "/" },
  secondaryAction,
}: Props) {
  const meta = getStatusMeta(code);
  const StatusIcon = meta.icon;

  return (
    <div className="w-full min-h-[75vh] px-6 py-10 md:px-10 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex justify-center">
          <div className="relative aspect-[4/3] w-full max-w-[620px]">
            <Image
              src={imageSrc}
              alt={title}
              fill
              priority
              className="object-contain drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-xl rounded-3xl border bg-background/90 p-6 shadow-xl backdrop-blur-sm md:p-8">
            <div className="flex flex-col items-center text-center">
              <Logo size="lg" className="w-auto justify-center px-0" />
              <div
                className={`mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${meta.badgeClass}`}
              >
                <StatusIcon className="h-4 w-4" />
                <span>
                  Error {code} · {meta.label}
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-2xl">
                {title}
              </h1>

              {description ? (
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-sm">
                  {description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  className="h-11 rounded bg-[#008C93] hover:bg-[#007381]"
                >
                  <Link
                    href={primaryAction.href}
                    className="inline-flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />{" "}
                    <span>{primaryAction.label}</span>
                  </Link>
                </Button>

                {secondaryAction ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="min-w-[180px]"
                  >
                    <Link href={secondaryAction.href}>
                      {secondaryAction.label}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
