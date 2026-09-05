"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";

export function CitizenMobileHeader({
  unreadNotifications,
}: {
  unreadNotifications: number;
}) {
  return (
    <header className="col-[1/2] row-[1/2] z-30 bg-[var(--brand-primary)] pt-[env(safe-area-inset-top)] text-white lg:hidden">
      <div className="flex h-20 items-center justify-between gap-3 px-4">
        <Link href="/citizen" className="flex min-w-0 items-center gap-3" aria-label="MÁS San Miguel - Inicio">
          <Image
            src="/logoentero.png"
            alt=""
            width={595}
            height={364}
            priority
            className="h-10 w-14 shrink-0 object-contain brightness-0 invert"
          />
          <span className="min-w-0 leading-tight">
            <strong className="block truncate text-sm tracking-wide">MÁS SAN MIGUEL</strong>
            <span className="block text-xs text-white/85">Portal ciudadano</span>
          </span>
        </Link>

        <div className="flex items-center">
          <Link
            href="/citizen/notifications"
            className="relative grid size-11 place-items-center rounded-xl bg-white/10 text-white transition active:scale-95"
            aria-label={unreadNotifications ? `${unreadNotifications} notificaciones sin leer` : "Notificaciones"}
          >
            <Bell className="size-5" />
            {unreadNotifications ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-[var(--brand-primary)] bg-[var(--brand-accent)] px-1 text-[10px] font-extrabold text-[var(--brand-primary)]">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
