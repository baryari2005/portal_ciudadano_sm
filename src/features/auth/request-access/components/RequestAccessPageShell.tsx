import Image from "next/image";
import Link from "next/link";
import { ClipboardPenLine, Info, User } from "lucide-react";

import { RequestAccessForm } from "./RequestAccessForm";

export function RequestAccessPageShell() {
  return (
    <main className="min-h-screen bg-[var(--brand-page)]">
      <header className="relative h-[174px] overflow-hidden sm:hidden">
        <svg className="absolute inset-0 size-full" viewBox="0 0 440 190" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="mobile-request-header" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#1D4F36"/><stop offset="72%" stopColor="#14543A"/><stop offset="100%" stopColor="#0B6843"/></linearGradient></defs><path d="M0 0H440V154C354 130 300 174 197 170C111 168 48 154 0 135V0Z" fill="url(#mobile-request-header)"/></svg>
        <span className="pointer-events-none absolute -left-3 top-[92px] h-16 w-12 rotate-[-22deg] rounded-[80%_15%_80%_15%] bg-[var(--brand-secondary)]/12" aria-hidden="true" />
        <span className="pointer-events-none absolute left-7 top-[110px] h-12 w-8 rotate-[30deg] rounded-[80%_15%_80%_15%] bg-white/[0.045]" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="drop-shadow-sm"><p className="text-base font-extrabold tracking-wide text-white">MÁS SAN MIGUEL</p><p className="mt-0.5 text-sm font-medium text-white/90">Portal ciudadano</p></div>
          <Link href="/login" aria-label="Iniciar sesión" className="grid size-10 place-items-center rounded-xl bg-white/15 text-white backdrop-blur"><User className="size-5"/></Link>
        </div>
      </header>
      <header className="relative hidden overflow-hidden border-b border-white/15 bg-primary sm:block">
        <div className="relative z-10 mx-auto flex min-h-[72px] w-full items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:h-[88px] sm:gap-6 sm:px-8 sm:py-0 lg:px-10">
          <div className="flex min-w-0 items-center gap-5 text-white">
            <Image
              src="/logoentero.png"
              alt="MAS San Miguel"
              width={112}
              height={52}
              priority
              className="h-auto w-24 shrink-0 object-contain brightness-0 invert sm:w-28"
            />

            <div className="hidden h-14 w-px bg-white/45 sm:block" />

            <div className="hidden min-w-0 leading-tight min-[390px]:block">
              <p className="text-base font-bold sm:text-lg">Portal ciudadano</p>
              <p className="mt-1 text-sm font-medium text-[#D8E178] sm:text-base">
                Sistema de Ayuda
                <span className="block">y Actividades</span>
              </p>
            </div>
          </div>

          <Link href="/login" className="flex shrink-0 items-center gap-3 text-white sm:gap-4">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#e9f3d8] text-[var(--brand-heading)] shadow-sm">
              <User
                className="size-7 fill-current stroke-[2.4]"
                aria-hidden="true"
              />
            </div>
            <span className="hidden text-sm font-bold sm:inline">Iniciar sesión</span>
          </Link>
        </div>
      </header>

      <section className="px-3 py-5 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <header className="relative z-10 mb-5 pt-1 text-center sm:hidden">
            <h1 className="text-3xl font-extrabold text-[var(--brand-primary)]">Solicitar acceso</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--brand-muted)]">Cargá tus datos personales, la foto y las credenciales de acceso.</p>
          </header>
          <header className="mb-6 hidden border-b border-[var(--brand-border)] pb-5 sm:block">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
                <ClipboardPenLine className="size-6" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">
                Solicitar acceso
              </h1>
            </div>
            <p className="mt-3 flex max-w-3xl items-start gap-2 text-sm text-[var(--brand-muted)] sm:text-base">
              <Info className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)] sm:size-5" aria-hidden="true" />
              <span>Cargá los datos personales, la foto y las credenciales de acceso.</span>
            </p>
          </header>
          <RequestAccessForm />
        </div>
      </section>
    </main>
  );
}
