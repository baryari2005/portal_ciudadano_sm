"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, History, QrCode, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AdminFormLoading, AdminFormPage } from "@/components/layout/admin-form-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAccessEstablishment } from "../hooks/useAccessEstablishment";

const NAV_LINKS: Array<{ href: string; icon: LucideIcon; label: string }> = [
  { href: "/reception/scan", icon: QrCode, label: "Escanear QR" },
  { href: "/reception/manual", icon: Search, label: "Búsqueda manual" },
  { href: "/reception/history", icon: History, label: "Historial" },
];

export function AccessShell({ title, description, children, stateOverride }: { title: string; description: string; children: (state: ReturnType<typeof useAccessEstablishment>) => ReactNode; stateOverride?: ReturnType<typeof useAccessEstablishment> }) {
  const ownState = useAccessEstablishment();
  const state = stateOverride ?? ownState;
  const pathname = usePathname();
  return <AdminFormPage title={title} description={description} fullWidth breadcrumbs={[{ label: "Recepción", href: "/reception" }, { label: title }]}>
    {state.loading ? <AdminFormLoading label="Cargando establecimientos..." /> : <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Building2 className="size-5" /></span>
          <div className="min-w-0">
            <p className="font-extrabold text-[var(--brand-primary)]">Establecimiento de trabajo</p>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">Seleccioná dónde estás realizando la atención.</p>
          </div>
        </div>
        <Select value={state.establishmentId} onValueChange={state.setEstablishmentId}>
          <SelectTrigger className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] lg:w-72"><SelectValue placeholder="Seleccionar establecimiento" /></SelectTrigger>
          <SelectContent>{state.options.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Accesos del módulo">
        {NAV_LINKS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition", active ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] text-[var(--brand-primary)]" : "border-[var(--brand-border-soft)] bg-white text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-primary)]")}><item.icon className="size-4" />{item.label}</Link>;
        })}
      </nav>
      {children(state)}
    </>}
  </AdminFormPage>;
}
