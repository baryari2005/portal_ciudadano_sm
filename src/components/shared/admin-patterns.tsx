import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Inbox, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const adminControlClass =
  "h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] font-medium text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)] focus-visible:ring-[var(--brand-secondary)]/30";
export const adminPrimaryButtonClass =
  "h-12 rounded-xl bg-[var(--brand-primary)] px-7 text-base font-bold text-white shadow-sm hover:bg-[var(--brand-primary-hover)]";
export const adminSecondaryButtonClass =
  "h-12 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] px-7 text-base font-bold text-[var(--brand-ink)] shadow-sm hover:bg-[var(--brand-panel)]";
export const adminDangerButtonClass =
  "h-11 rounded-xl border-red-200 bg-white font-bold text-red-700 hover:bg-red-50";

export function AdminPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </main>
  );
}
export function AdminSplitLayout({
  list,
  detail,
  className,
}: {
  list: ReactNode;
  detail: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,.95fr)_minmax(420px,1.05fr)]",
        className,
      )}
    >
      {list}
      {detail}
    </section>
  );
}
export function AdminListPane({
  children,
  detailOpen,
  className,
}: {
  children: ReactNode;
  detailOpen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-col gap-4",
        detailOpen ? "hidden lg:flex" : "flex",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  filtered = false,
  className,
}: {
  title: string;
  description?: string;
  filtered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--brand-secondary)]/45 bg-white/60 p-8 text-center",
        className,
      )}
    >
      <Inbox
        className="size-10 text-[var(--brand-secondary)]"
        aria-hidden="true"
      />
      <p className="mt-4 font-bold text-[var(--brand-primary)]">
        {filtered
          ? "No hay resultados que coincidan con la búsqueda o los filtros seleccionados."
          : title}
      </p>
      {!filtered && description ? (
        <p className="mt-2 max-w-sm text-sm text-[var(--brand-text)]/75">
          {description}
        </p>
      ) : null}
    </div>
  );
}
export function AdminDetailPanel({
  children,
  empty,
  loading = false,
  loadingLabel = "información",
  onBack,
  backLabel = "Volver al listado",
  className,
}: {
  children?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  if (!children && !loading)
    return (
      <aside
        className={cn(
          "hidden h-full min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-8 text-center text-sm font-semibold text-[var(--brand-text)]/70 lg:flex",
          className,
        )}
      >
        {empty}
      </aside>
    );
  return (
    <aside
      className={cn(
        "brand-scrollbar relative h-fit overflow-hidden rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7 lg:h-full lg:min-h-0 lg:overflow-y-auto",
        loading && "min-h-72",
        className,
      )}
    >
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="mb-4 -ml-2 text-[var(--brand-primary)] lg:hidden"
        >
          <ArrowLeft />
          {backLabel}
        </Button>
      ) : null}
      {loading ? (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-3xl bg-[var(--brand-panel)]">
          <span className="flex items-center gap-3 font-bold text-[var(--brand-primary)]">
            <Loader2 className="animate-spin" />
            Cargando {loadingLabel}...
          </span>
        </div>
      ) : (
        children
      )}
    </aside>
  );
}

export function AdminDetailHeader({
  title,
  subtitle,
  leading,
  badge,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-panel)] pb-5 lg:sticky lg:top-0 lg:z-10">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-2xl font-extrabold text-[var(--brand-primary)]">
          {title}
        </h2>
        {subtitle ? (
          <div className="mt-1 text-sm text-[var(--brand-muted)]">
            {subtitle}
          </div>
        ) : null}
        {badge ? <div className="mt-2">{badge}</div> : null}
      </div>
      {action ? (
        <div className="w-full shrink-0 sm:w-auto">{action}</div>
      ) : null}
    </header>
  );
}

export function AdminDetailActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-8 !important flex flex-col gap-3 border-t border-[var(--brand-border)] bg-[var(--brand-panel)] pt-5 [&>*]:h-12 [&>*]:rounded-xl [&>*]:text-base [&>*]:font-bold sm:flex-row sm:flex-wrap sm:items-center sm:[&>*]:flex-1 lg:sticky lg:bottom-0 lg:z-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <header className="border-b border-[var(--brand-border)] pb-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
          <Icon className="size-5" />
        </span>
        <h2 className="text-2xl font-extrabold text-[var(--brand-primary)]">
          {title}
        </h2>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-[var(--brand-muted)]">
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)]" />
        <span>{description}</span>
      </p>
    </header>
  );
}
export function AdminFormCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 text-[var(--brand-ink)] shadow-sm sm:p-6 lg:p-8",
        className,
      )}
    >
      <header className="mb-6 border-b border-[var(--brand-border)] pb-5">
        <h2 className="text-lg font-extrabold text-[var(--brand-heading)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">
            {description}
          </p>
        ) : null}
      </header>
      {children}
      {footer ? (
        <footer className="mt-6 border-t border-[var(--brand-border)] pt-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
export function AdminFormField({
  label,
  icon: Icon,
  children,
  className,
  align = "center",
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="font-extrabold text-[var(--brand-ink)]">{label}</Label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 z-10 size-5 text-[var(--brand-primary)]",
            align === "start" ? "top-3.5" : "top-1/2 -translate-y-1/2",
          )}
        />
        <div className="[&_input]:pl-10 [&_[role=combobox]]:pl-10 [&_textarea]:pl-10">
          {children}
        </div>
      </div>
    </div>
  );
}
export function AdminStatusSwitchField({
  checked,
  onCheckedChange,
  icon: Icon,
  activeDescription,
  inactiveDescription,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  disabled = false,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: LucideIcon;
  activeDescription: string;
  inactiveDescription: string;
  activeLabel?: string;
  inactiveLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="font-extrabold text-[var(--brand-ink)]">Estado</Label>
      <div
        className={cn(
          "flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-control)] px-4 py-3",
          disabled && "opacity-75",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <Icon
            className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-[var(--brand-ink)]">
              {checked ? activeLabel : inactiveLabel}
            </p>
            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
              {checked ? activeDescription : inactiveDescription}
            </p>
          </div>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function AdminListCard({
  title,
  description,
  meta,
  leading,
  badges,
  trailing,
  selected = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  badges?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      data-admin-list-card=""
      className={cn(
        "grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]",
        selected
          ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm"
          : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm",
        className,
      )}
      {...props}
    >
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-extrabold text-[var(--brand-ink)]">
            {title}
          </span>
          {badges ? (
            <span className="flex shrink-0 items-center gap-2">{badges}</span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-1 block truncate text-sm font-medium text-[var(--brand-text)]">
            {description}
          </span>
        ) : null}
        {meta ? (
          <span className="mt-1 block truncate text-xs font-medium text-[var(--brand-muted)]">
            {meta}
          </span>
        ) : null}
      </span>
      {trailing ? (
        <span className="shrink-0 text-[var(--brand-secondary)]">
          {trailing}
        </span>
      ) : (
        <span />
      )}
    </button>
  );
}
