"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronRight, FilePenLine, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminFormPage({
  title,
  description,
  breadcrumbs,
  fullWidth = false,
  icon = FilePenLine,
  children,
}: {
  title: string;
  description: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  fullWidth?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <div className={cn(!fullWidth && "mx-auto max-w-5xl")}>
        {breadcrumbs?.length ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[#315644]/75"
          >
            {breadcrumbs.map((item, index) => (
              <span
                key={`${item.label}-${index}`}
                className="flex items-center gap-1"
              >
                {index > 0 && <ChevronRight className="size-4" />}
                {item.href ? (
                  <Link
                    className="font-medium hover:text-[#1D4F36] hover:underline"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <AdminFormHeader title={title} description={description} icon={icon} />
        {children}
      </div>
    </main>
  );
}

export function AdminFormHeader({ title, description, icon: Icon = FilePenLine, action, className }: { title: ReactNode; description: ReactNode; icon?: LucideIcon; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-6 border-b border-[var(--brand-border)] pb-5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="min-w-0 flex-1 text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">{title}</h1>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      <p className="mt-3 flex max-w-3xl items-start gap-2 text-sm text-[var(--brand-muted)] sm:text-base">
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)] sm:size-5" aria-hidden="true" />
        <span>{description}</span>
      </p>
    </header>
  );
}

export function AdminFormLoading({
  label = "Cargando formulario...",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-3xl border border-[#819B56]/20 bg-white/80">
      <Loader2 className="mr-3 size-6 animate-spin text-[#1D4F36]" />
      <span className="font-semibold text-[#1D4F36]">{label}</span>
    </div>
  );
}

export function AdminFormError({
  message,
  backHref,
  onRetry,
}: {
  message: string;
  backHref: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/70 p-8 text-center">
      <p className="font-bold text-red-900">{message}</p>
      <div className="mt-5 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft />
            Volver
          </Link>
        </Button>
        {onRetry && <Button onClick={onRetry}>Reintentar</Button>}
      </div>
    </div>
  );
}
