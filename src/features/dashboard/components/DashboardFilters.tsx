"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { adminControlClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const presets = [{ label: "Últimos 7 días", days: 7 }, { label: "Últimos 30 días", days: 30 }, { label: "Últimos 90 días", days: 90 }, { label: "Este año", days: 365 }];
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

export function useDashboardFilters() {
  const params = useSearchParams();
  return { from: params.get("from") ?? daysAgo(30), to: params.get("to") ?? today(), activityId: params.get("activityId") ?? undefined, establishmentId: params.get("establishmentId") ?? undefined };
}

export function DashboardFilters() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const from = params.get("from") ?? daysAgo(30);
  const to = params.get("to") ?? today();
  const set = (nextFrom: string, nextTo: string) => { const query = new URLSearchParams(params); query.set("from", nextFrom); query.set("to", nextTo); router.replace(`${path}?${query}`, { scroll: false }); };

  return <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3 border-b border-[var(--brand-border)] pb-4"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><CalendarDays className="size-5" /></span><div><h2 className="font-extrabold text-[var(--brand-primary)]">Período del reporte</h2><p className="text-xs font-medium text-[var(--brand-muted)]">Elegí un rango rápido o definí fechas personalizadas.</p></div></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="flex flex-wrap gap-2">{presets.map((preset) => <Button key={preset.label} type="button" variant="outline" className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] px-4 font-bold text-[var(--brand-primary)]" onClick={() => set(daysAgo(preset.days), today())}>{preset.label}</Button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-sm font-extrabold text-[var(--brand-ink)]">Desde</span><Input type="date" max={to} value={from} onChange={(event) => set(event.target.value, to)} className={adminControlClass} /></label><label className="space-y-1.5"><span className="text-sm font-extrabold text-[var(--brand-ink)]">Hasta</span><Input type="date" min={from} max={today()} value={to} onChange={(event) => set(from, event.target.value)} className={adminControlClass} /></label></div>
    </div>
  </section>;
}
