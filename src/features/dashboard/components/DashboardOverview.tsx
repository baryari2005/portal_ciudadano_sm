"use client";

import Link from "next/link";
import { Activity, BarChart3, CalendarCheck2, CalendarDays, ChevronRight, ClipboardCheck, FileCheck2, Gauge, ListChecks, UsersRound } from "lucide-react";
import { AdminPageShell, AdminSectionHeader } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { CatalogEmptyState, CatalogErrorState, CatalogLoadingState, CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useAdministrativeDashboard } from "../hooks/useAdministrativeDashboard";
import { DashboardFilters, useDashboardFilters } from "./DashboardFilters";

export function DashboardOverview() {
  const filters = useDashboardFilters();
  const { data, loading, error, retry } = useAdministrativeDashboard(filters);
  if (loading) return <CatalogLoadingState label="dashboard" fullPage />;
  if (error || !data) return <CatalogErrorState message={error} onRetry={retry} />;

  const max = Math.max(1, ...data.enrollmentTrend.map((item) => item.total));
  const metrics = [
    ["Actividades activas", data.current.activeActivities, Activity, "Estado actual"],
    ["Horarios activos", data.current.activeSchedules, CalendarCheck2, "Estado actual"],
    ["Vecinos participando", data.current.participatingCitizens, UsersRound, "Estado actual"],
    ["Inscripciones confirmadas", data.current.confirmedEnrollments, ClipboardCheck, "Estado actual"],
    ["Lista de espera", data.current.waitlistEnrollments, ListChecks, "Estado actual"],
    ["Cupos disponibles", data.current.availableCapacity, Gauge, "Estado actual"],
    ["Clases programadas", data.period.sessionsScheduled, CalendarDays, "En el período"],
    ["Presentes", data.period.attendancePresent, UsersRound, "En el período"],
    ["Documentos pendientes", data.current.pendingDocuments, FileCheck2, "Estado actual"],
    ["Documentos rechazados", data.current.rejectedDocuments, FileCheck2, "Estado actual"],
  ] as const;
  const capacity = [
    ["Cupo total", data.capacity.total, UsersRound],
    ["Lugares disponibles", data.capacity.available, Gauge],
    ["Horarios completos", data.capacity.fullSchedules, CalendarCheck2],
    ["Baja ocupación", data.capacity.lowOccupancySchedules, BarChart3],
  ] as const;

  return <AdminPageShell>
    <CatalogPageHeader icon={BarChart3} title="Dashboard general" description="Visualizá los indicadores principales para la gestión de actividades municipales." total={data.current.activeActivities} actions={<Button asChild className="h-11 rounded-xl bg-[var(--brand-primary)] px-5 font-bold text-white hover:bg-[var(--brand-primary-hover)]"><Link href="/reports"><BarChart3 />Ver reportes</Link></Button>} />
    <div className="mt-6"><DashboardFilters /></div>

    <section className="mt-6 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
      <AdminSectionHeader icon={BarChart3} title="Indicadores principales" description="Resumen de la situación actual y de los movimientos registrados en el período seleccionado." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, Icon, period]) => <article key={label} className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><strong className="text-3xl font-extrabold text-[var(--brand-primary)]">{value}</strong></div><p className="mt-4 font-bold text-[var(--brand-text)]">{label}</p><p className="mt-1 text-xs font-bold text-[var(--brand-secondary)]">{period}</p></article>)}</div>
    </section>

    <section className="mt-6 grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
        <AdminSectionHeader icon={ClipboardCheck} title="Tendencia de inscripciones" description="Cantidad de inscripciones registradas por día durante el período." />
        {data.enrollmentTrend.length ? <div className="mt-6 flex h-56 items-end gap-2 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4">{data.enrollmentTrend.map((item) => <div key={item.date} className="group flex min-w-3 flex-1 flex-col items-center gap-1"><span className="text-[10px] font-bold text-[var(--brand-primary)]">{item.total}</span><div className="w-full rounded-t bg-[var(--brand-secondary)] transition-colors group-hover:bg-[var(--brand-primary)]" style={{ height: `${Math.max(4, (item.total / max) * 160)}px` }} title={`${item.date}: ${item.total}`} /><span className="hidden text-[9px] font-medium text-[var(--brand-muted)] sm:block">{item.date.slice(5)}</span></div>)}</div> : <div className="mt-6"><CatalogEmptyState title="No hay inscripciones en el período." description="La evolución aparecerá cuando se registren inscripciones." filtered={false} /></div>}
      </div>

      <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
        <AdminSectionHeader icon={Gauge} title="Capacidad y ocupación" description="Estado consolidado de cupos y horarios disponibles." />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">{capacity.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><strong className="text-3xl font-extrabold text-[var(--brand-primary)]">{value}</strong></div><p className="mt-4 font-bold text-[var(--brand-text)]">{label}</p></article>)}</div>
      </div>
    </section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]">
      <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
        <AdminSectionHeader icon={CalendarDays} title="Próximas clases" description="Clases programadas que requieren seguimiento operativo." />
        {data.upcomingSessions.length ? <div className="mt-6 grid gap-3">{data.upcomingSessions.map((item) => <Link key={item.id} href="/activity-sessions" className="grid items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 transition hover:border-[var(--brand-secondary)] hover:shadow-sm sm:grid-cols-[120px_minmax(0,1fr)_auto_auto]"><span className="font-bold text-[var(--brand-primary)]">{item.date} · {item.startTime}</span><span className="font-medium text-[var(--brand-text)]">{item.activity} · {item.establishment}</span><span className="text-sm font-bold text-[var(--brand-muted)]">{item.confirmed} inscriptos</span><ChevronRight className="size-5 text-[var(--brand-secondary)]" /></Link>)}</div> : <div className="mt-6"><CatalogEmptyState title="No hay próximas clases." description="Las clases programadas aparecerán en esta sección." filtered={false} /></div>}
      </div>

      <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
        <AdminSectionHeader icon={ListChecks} title="Atención administrativa" description="Pendientes que requieren una revisión por parte del equipo." />
        {data.alerts.length ? <div className="mt-6 grid gap-3">{data.alerts.map((item) => <Link key={item.label} href={item.href} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 transition hover:border-[var(--brand-secondary)] hover:shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><ListChecks className="size-5" /></span><span className="font-bold text-[var(--brand-text)]">{item.label}</span><strong className="text-xl text-[var(--brand-primary)]">{item.value}</strong></Link>)}</div> : <div className="mt-6"><CatalogEmptyState title="No hay pendientes administrativos." description="Las alertas aparecerán cuando requieran atención." filtered={false} /></div>}
      </div>
    </section>

    <p className="mt-6 text-right text-xs font-medium text-[var(--brand-muted)]">Actualizado: {new Date(data.updatedAt).toLocaleString("es-AR")}</p>
  </AdminPageShell>;
}
