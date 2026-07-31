export function AuthDivider() {
  return (
    <div className="flex items-center gap-4 py-0.5" aria-hidden="true">
      <span className="h-px flex-1 bg-[var(--auth-border)]" />
      <span className="text-sm font-medium tracking-normal text-[var(--auth-muted)]">
        o continuar con
      </span>
      <span className="h-px flex-1 bg-[var(--auth-border)]" />
    </div>
  );
}
