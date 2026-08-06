import Image from "next/image";
import Link from "next/link";
import { ClipboardPenLine, Info, User } from "lucide-react";

import { RequestAccessForm } from "./RequestAccessForm";

export function RequestAccessPageShell() {
  return (
    <main className="min-h-screen bg-[var(--brand-page)]">
      <header className="relative overflow-hidden border-b border-white/15 bg-primary">
        <div className="relative z-10 mx-auto flex h-[88px] w-full items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
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

            <div className="min-w-0 leading-tight">
              <p className="text-base font-bold sm:text-lg">Portal ciudadano</p>
              <p className="mt-1 text-sm font-medium text-[#D8E178] sm:text-base">
                Sistema de Ayuda
                <span className="block">y Actividades</span>
              </p>
            </div>
          </div>

          <Link href="/login" className="hidden items-center gap-4 text-white sm:flex">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#e9f3d8] text-[var(--brand-heading)] shadow-sm">
              <User
                className="size-7 fill-current stroke-[2.4]"
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-bold">Iniciar sesión</span>
          </Link>
        </div>
      </header>

      <section className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <header className="mb-6 border-b border-[var(--brand-border)] pb-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
                <ClipboardPenLine className="size-6" aria-hidden="true" />
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">
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
