"use client";

import Link from "next/link";
import { ClipboardCheck, Home, LibraryBig, QrCode, UserRound, type LucideIcon } from "lucide-react";

const ITEMS: Array<{ href: string; label: string; icon: LucideIcon; central?: boolean }> = [
  { href: "/citizen", label: "Inicio", icon: Home },
  { href: "/citizen/activities", label: "Actividades", icon: LibraryBig },
  { href: "/citizen/qr", label: "Mi QR", icon: QrCode, central: true },
  { href: "/citizen/enrollments", label: "Inscripciones", icon: ClipboardCheck },
  { href: "/citizen/profile", label: "Mi perfil", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/citizen") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CitizenMobileBottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navegación principal del Portal Ciudadano"
      className="relative col-[1/2] row-[3/4] z-40 border-t border-[var(--brand-border-soft)] bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(29,79,54,0.10)] lg:hidden"
    >
      <div className="grid h-[72px] grid-cols-5 items-end">
        {ITEMS.map(({ href, label, icon: Icon, central }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className={central
                ? "relative flex h-full min-w-0 flex-col items-center justify-end pb-2"
                : `flex h-full min-w-0 flex-col items-center justify-end gap-1 pb-2 text-[10px] font-bold transition ${active ? "text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
            >
              {central ? (
                <>
                  <span className={`absolute -top-5 grid size-[58px] place-items-center rounded-full border-4 border-white shadow-lg transition ${active ? "bg-[var(--brand-secondary)] text-white" : "bg-[var(--brand-primary)] text-white"}`}>
                    <Icon className="size-7" />
                  </span>
                  <span className={`text-[10px] font-extrabold ${active ? "text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}>{label}</span>
                </>
              ) : (
                <>
                  <Icon className={`size-5 ${active ? "stroke-[2.5]" : ""}`} />
                  <span className="w-full truncate px-0.5 text-center">{label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
