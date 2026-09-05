"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/shared/admin-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CatalogStatusFilter = "all" | "active" | "inactive";
export type CatalogFilterSection = {
  id: string;
  title: string;
  value: string;
  options?: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  content?: ReactNode;
  active?: boolean;
  onClear?: () => void;
};
export let CATALOG_PAGE_SIZE = 6;
export function setCatalogPageSize(value: number) {
  CATALOG_PAGE_SIZE = Math.min(100, Math.max(3, Math.trunc(value)));
}

export function formatCatalogDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CatalogPageHeader({
  title,
  description,
  icon: Icon,
  total,
  createLabel,
  canCreate,
  onCreate,
  actions,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  total: number;
  createLabel?: string;
  canCreate?: boolean;
  onCreate?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--brand-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          {Icon ? <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-panel)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-border-soft)]"><Icon className="size-6" aria-hidden="true" /></span> : null}
          <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">
            {title}
          </h1>
          <Badge
            variant="secondary"
            className="rounded-full bg-[var(--brand-secondary)]/15 px-3 py-1 font-bold text-[var(--brand-primary)]"
          >
            {total} {total === 1 ? "registro" : "registros"}
          </Badge>
        </div>
        <p className="mt-3 flex max-w-2xl items-start gap-2 text-sm text-[var(--brand-text)]/80 sm:text-base"><Info className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)]" aria-hidden="true" /><span>{description}</span></p>
      </div>
      {actions ?? (canCreate ? (
        <Button
          type="button"
          onClick={onCreate}
          className="h-11 shrink-0 rounded-xl bg-[var(--brand-primary)] px-5 font-bold text-white hover:bg-[var(--brand-primary-hover)]"
        >
          <Plus aria-hidden="true" />
          {createLabel}
        </Button>
      ) : null)}
    </header>
  );
}

export function CatalogFilters({
  query,
  status,
  searchPlaceholder,
  onQueryChange,
  onStatusChange,
}: {
  query: string;
  status: CatalogStatusFilter;
  searchPlaceholder: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: CatalogStatusFilter) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <CatalogSearchInput
        value={query}
        placeholder={searchPlaceholder}
        onChange={onQueryChange}
      />
      <CatalogFilterPopover
        sections={[{
          id: "status",
          title: "Estado",
          value: status,
          options: [
            { value: "all", label: "Todas" },
            { value: "active", label: "Activas" },
            { value: "inactive", label: "Inactivas" },
          ],
          onChange: (value) => onStatusChange(value as CatalogStatusFilter),
        }]}
      />
    </div>
  );
}

export function CatalogFilterPopover({ sections, trigger }: { sections: CatalogFilterSection[]; trigger?: ReactNode }) {
  const activeCount = sections.filter((section) => section.active ?? section.value !== "all").length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? <Button type="button" variant="outline" className="h-12 gap-2 rounded-xl border-0 bg-[var(--brand-search)] px-5 font-bold text-[var(--brand-primary)] shadow-sm hover:brightness-95">
          <SlidersHorizontal className="size-5" /> Filtros
          {activeCount ? <Badge className="rounded-full bg-[var(--brand-primary)] px-2 text-white">{activeCount}</Badge> : null}
        </Button>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-2rem))] rounded-2xl border-[var(--brand-border-soft)] p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--brand-border-soft)] px-5 py-4">
          <div><p className="font-extrabold text-[var(--brand-primary)]">Filtros</p><p className="text-xs text-[var(--brand-muted)]">Refiná los resultados</p></div>
          {activeCount ? <Button type="button" variant="ghost" size="sm" onClick={() => sections.forEach((section) => section.onClear ? section.onClear() : section.onChange("all"))} className="text-[var(--brand-primary)]">Limpiar</Button> : null}
        </div>
        <div className="max-h-[65dvh] overflow-y-auto px-5 pb-3">
          {sections.map((section, index) => (
            <details key={section.id} open={index === 0} className="group border-b border-[var(--brand-border-soft)] py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-bold text-[var(--brand-ink)]">{section.title}<ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-open:rotate-180" /></summary>
              <div className="grid gap-2 pb-4">
                {section.content ?? section.options?.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-[var(--brand-text)] hover:bg-[var(--brand-secondary)]/10">
                    <input type="radio" name={`catalog-filter-${section.id}`} checked={section.value === option.value} onChange={() => section.onChange(option.value)} className="size-4 accent-[var(--brand-primary)]" />
                    {option.label}
                  </label>
                ))}
              </div>
            </details>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CatalogSearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full p-0.5">
      <Label className="sr-only">Buscar</Label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-[22px] top-1/2 h-6 w-6 -translate-y-1/2 text-primary"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-0 bg-[var(--brand-search)] pl-16 text-base text-[var(--brand-ink)] shadow-sm placeholder:text-[var(--brand-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]/25"
      />
    </div>
  );
}

export function CatalogStatusBadge({
  active,
  activeLabel = "Activa",
  inactiveLabel = "Inactiva",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 font-bold",
        active
          ? "border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]"
          : "border-[var(--brand-neutral)] bg-[var(--brand-neutral)]/15 text-[#555]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-[var(--brand-primary)]" : "bg-[#777]",
        )}
      />
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

export function CatalogLoadingState({
  label,
  fullPage = false,
  viewport = false,
}: {
  label: string;
  fullPage?: boolean;
  viewport?: boolean;
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "grid w-full place-items-center bg-[var(--brand-page)]",
        viewport
          ? "min-h-dvh p-6 sm:p-10"
          : fullPage
          ? "min-h-[calc(100dvh-var(--topbar-h,0px)-48px)] p-8"
          : "min-h-72 rounded-3xl border border-[var(--brand-secondary)]/20 p-6",
      )}
    >
      <div className={cn(
        "relative aspect-[1464/1024] w-full",
        viewport ? "w-[min(86vw,760px)]" : fullPage ? "max-w-2xl" : "max-w-md",
      )}>
          <Image
            src="/Cargando.png"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-contain drop-shadow-[0_22px_35px_rgba(29,79,54,0.08)]"
          />
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="absolute left-1/2 top-[30.5%] z-10 aspect-square w-[18.75%] -translate-x-1/2 -translate-y-1/2"
          >
            <circle cx="50" cy="50" r="43" fill="none" stroke="#D9DDD8" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="43"
              fill="none"
              stroke="var(--brand-secondary)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="88 183"
              className="origin-center animate-spin [animation-duration:1.45s]"
            />
          </svg>
          <span className="sr-only">Cargando {label}. Estamos preparando la información.</span>
      </div>
    </section>
  );
}

export function CatalogPagination({
  page,
  total,
  onPageChange,
  pageSize = CATALOG_PAGE_SIZE,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 pt-2">
      <p className="text-sm text-[var(--brand-muted)]">
        Mostrando {from} a {to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-[var(--brand-border-soft)]"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="grid h-10 min-w-10 place-items-center rounded-xl bg-[var(--brand-primary)] px-3 text-sm font-bold text-white">
          {currentPage}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-[var(--brand-border-soft)]"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function CatalogErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50/70 p-8 text-center">
      <AlertCircle className="size-9 text-red-700" aria-hidden="true" />
      <p className="mt-3 font-bold text-red-900">
        No pudimos cargar el catálogo
      </p>
      <p className="mt-1 max-w-md text-sm text-red-800/80">{message}</p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="mt-5"
      >
        Reintentar
      </Button>
    </div>
  );
}

export function CatalogEmptyState({
  title,
  description,
  filtered,
}: {
  title: string;
  description: string;
  filtered: boolean;
}) {
  return <AdminEmptyState title={title} description={description} filtered={filtered} />;
}

export function CatalogDetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl bg-white/65 p-3">
      <Icon className="mt-0.5 size-5 text-[var(--brand-secondary)]" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wide text-[var(--brand-text)]/65">
          {label}
        </dt>
        <dd className="mt-1 break-words text-sm font-medium text-[var(--brand-ink)]">
          {children}
        </dd>
      </div>
    </div>
  );
}
