"use client";
import Link from "next/link";
import { Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { AdminFormLoading, AdminFormPage } from "@/components/layout/admin-form-page";
import { useAccessEstablishment } from "../hooks/useAccessEstablishment";
export function AccessShell({ title, description, children, stateOverride }: { title: string; description: string; children: (state: ReturnType<typeof useAccessEstablishment>) => ReactNode; stateOverride?: ReturnType<typeof useAccessEstablishment> }) {
  const ownState = useAccessEstablishment();
  const state = stateOverride ?? ownState;
  return <AdminFormPage title={title} description={description} fullWidth breadcrumbs={[{ label: "Recepción", href: "/reception" }, { label: title }]}>
    {state.loading ? <AdminFormLoading label="Cargando establecimientos..." /> : <><div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand-secondary)]/25 bg-white p-4"><Building2 className="size-5 text-[var(--brand-primary)]"/><label className="font-semibold text-[var(--brand-primary)]" htmlFor="access-establishment">Seleccionar establecimiento</label><select id="access-establishment" className="h-10 min-w-64 rounded-xl border border-[var(--brand-secondary)]/35 bg-[var(--brand-page)] px-3 text-sm text-[var(--brand-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-secondary)]" value={state.establishmentId} onChange={(event) => state.setEstablishmentId(event.target.value)}><option value="">Seleccioná una opción</option>{state.options.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><nav className="ml-auto flex gap-3 text-sm font-semibold text-[var(--brand-primary)]"><Link href="/reception/scan">Escanear QR</Link><Link href="/reception/manual">Búsqueda manual</Link><Link href="/reception/history">Historial</Link></nav></div>{children(state)}</>}
  </AdminFormPage>;
}
