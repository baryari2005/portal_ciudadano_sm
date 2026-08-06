import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronDown, Info, Loader2 } from "lucide-react";

import { adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { AdminSectionHeader } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminRecordSection<T extends string> = {
  id: T;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  group?: string;
};

export function AdminRecordSectionContent({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <AdminSectionHeader title={title} description={description} icon={icon} />
      <div className="mt-6 min-w-0">{children}</div>
    </div>
  );
}

export function AdminRecordLayout<T extends string>({
  title,
  description,
  icon: HeaderIcon,
  backHref,
  sections,
  activeSection,
  onSectionChange,
  navigationDisabled = false,
  loading = false,
  loadingLabel = "información",
  children,
  contentClassName,
}: {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  backHref: string;
  sections: readonly AdminRecordSection<T>[];
  activeSection: T;
  onSectionChange: (section: T) => void;
  navigationDisabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  const standaloneSections = sections.filter((section) => !section.group);
  const groupedSections = sections.reduce<Array<{ label: string; items: AdminRecordSection<T>[] }>>((groups, section) => {
    if (!section.group) return groups;
    const existing = groups.find((group) => group.label === section.group);
    if (existing) existing.items.push(section);
    else groups.push({ label: section.group, items: [section] });
    return groups;
  }, []);
  const sectionButton = ({ id, label, icon: Icon }: AdminRecordSection<T>) => (
    <button
      key={id}
      type="button"
      disabled={navigationDisabled}
      onClick={() => onSectionChange(id)}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-bold transition disabled:cursor-wait",
        activeSection === id ? "bg-[var(--brand-accent)] text-[var(--brand-primary)] shadow-sm" : "text-white hover:bg-white/10",
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-[var(--brand-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-panel)] text-[var(--brand-primary)]">
              <HeaderIcon className="size-6" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">
              {title}
            </h1>
          </div>
          <p className="mt-3 flex items-start gap-2 text-sm font-medium text-[var(--brand-text)]/80 sm:text-base">
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)]" />
            <span>{description}</span>
          </p>
        </div>
        <Button asChild variant="outline" className={cn(adminSecondaryButtonClass, "w-full shrink-0 sm:w-auto")}>
          <Link href={backHref}><ArrowLeft /> Volver</Link>
        </Button>
      </header>

      <div className="mt-6 grid min-h-0 items-start gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <nav
          className="h-fit self-start overflow-hidden rounded-3xl bg-[var(--brand-primary)] p-3 shadow-sm"
          aria-label="Secciones de la ficha"
        >
          <p className="px-4 pb-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/55">
            Secciones de la ficha
          </p>
          <div className="grid gap-1">
            {standaloneSections.map(sectionButton)}
            {groupedSections.map((group) => (
              <details key={group.label} className="group" open={group.items.some((item) => item.id === activeSection) || undefined}>
                <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-xl px-4 text-xs font-extrabold uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
                  <span>{group.label}</span><ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-1 pb-1 pl-2">{group.items.map(sectionButton)}</div>
              </details>
            ))}
          </div>
        </nav>

        <section
          className={cn(
            "relative min-h-72 min-w-0 w-full self-start overflow-hidden rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7",
            contentClassName,
          )}
        >
          {loading ? (
            <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[var(--brand-panel)]">
              <span className="flex items-center gap-3 font-bold text-[var(--brand-primary)]">
                <Loader2 className="animate-spin" /> Cargando {loadingLabel}...
              </span>
            </div>
          ) : null}
          <div className={loading ? "invisible" : undefined}>{children}</div>
        </section>
      </div>
    </main>
  );
}
