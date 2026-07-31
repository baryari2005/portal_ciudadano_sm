export function SecureNotice() {
  return (
    <div className="flex items-center gap-4 rounded-sm border border-[#E5E2D8] bg-[#ECEEE6] px-5 py-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--auth-primary)] text-white">
        <img
          src="/icons/cerrar.svg"
          alt=""
          className="size-6 invert"
          aria-hidden="true"
        />
      </span>
      <div className="space-y-1">
        <p className="text-base font-bold text-[var(--auth-primary)]">
          Acceso seguro
        </p>
        <p className="text-sm leading-5 text-[var(--auth-muted)]">
          Tu información está protegida y encriptada.
        </p>
      </div>
    </div>
  );
}
