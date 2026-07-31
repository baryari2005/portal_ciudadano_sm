"use client";

import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Building2, CalendarCheck2, ClipboardCheck, FileCheck2, Gauge, ListChecks, UsersRound } from "lucide-react";
import { AdminPageShell, AdminSectionHeader } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { CatalogEmptyState, CatalogErrorState, CatalogLoadingState, CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useAdministrativeDashboard } from "../hooks/useAdministrativeDashboard";
import { DashboardFilters, useDashboardFilters } from "./DashboardFilters";

const config = {
  activities: { title: "Reporte de actividades", description: "Analizá la capacidad, oferta y ocupación de las actividades.", icon: Activity },
  enrollments: { title: "Reporte de inscripciones", description: "Consultá altas, confirmaciones, cancelaciones y listas de espera.", icon: ClipboardCheck },
  attendance: { title: "Reporte de asistencias", description: "Revisá presentes, ausentes, justificaciones y evolución del período.", icon: ListChecks },
  establishments: { title: "Reporte de establecimientos", description: "Compará capacidad, ocupación y participación entre sedes.", icon: Building2 },
  documentation: { title: "Reporte de documentación", description: "Controlá documentos pendientes, aprobados, rechazados y cargados.", icon: FileCheck2 },
} as const;
type Kind = keyof typeof config;
const number = (value: unknown) => typeof value === "number" ? value : 0;
const text = (value: unknown) => typeof value === "string" ? value : "";

export function AdministrativeReport({ kind }: { kind: Kind }) {
  const filters = useDashboardFilters();
  const { data, loading, error, retry } = useAdministrativeDashboard(filters, kind);
  if (loading) return <CatalogLoadingState label="reporte" fullPage />;
  if (error || !data) return <CatalogErrorState message={error} onRetry={retry} />;

  const page = config[kind];
  const metrics = kind === "activities" ? [["Actividades activas", data.current.activeActivities, Activity], ["Horarios activos", data.current.activeSchedules, CalendarCheck2], ["Cupos disponibles", data.current.availableCapacity, UsersRound], ["Horarios completos", data.current.fullSchedules, Gauge]] : kind === "enrollments" ? [["Altas", data.period.newEnrollments, ClipboardCheck], ["Confirmadas", data.current.confirmedEnrollments, UsersRound], ["Lista de espera", data.current.waitlistEnrollments, ListChecks], ["Canceladas y bajas", data.period.cancelledEnrollments, Gauge]] : kind === "attendance" ? [["Presentes", data.period.attendancePresent, UsersRound], ["Ausentes", data.period.attendanceAbsent, ListChecks], ["Justificadas", data.period.attendanceJustified, ClipboardCheck], ["Clases finalizadas", data.period.sessionsCompleted, CalendarCheck2]] : kind === "documentation" ? [["Pendientes", data.current.pendingDocuments, FileCheck2], ["Rechazados actuales", data.current.rejectedDocuments, ListChecks], ["Aprobados", data.period.documentsApproved, ClipboardCheck], ["Cargados", data.period.documentsUploaded, UsersRound]] : [["Horarios activos", data.current.activeSchedules, CalendarCheck2], ["Cupo total", data.capacity.total, UsersRound], ["Confirmadas", data.capacity.confirmed, ClipboardCheck], ["Lista de espera", data.capacity.waitlist, ListChecks]];
  const ranking = kind === "establishments" ? data.topEstablishments : data.topActivities;

  return <AdminPageShell>
    <CatalogPageHeader icon={page.icon} title={page.title} description={page.description} total={ranking.length} actions={<Button asChild variant="outline" className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] px-5 font-bold text-[var(--brand-primary)]"><Link href="/reports"><ArrowLeft />Volver</Link></Button>} />
    <div className="mt-6"><DashboardFilters /></div>

    <section className="mt-6 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
      <AdminSectionHeader icon={BarChart3} title="Indicadores del período" description="Los valores se actualizan según el rango de fechas seleccionado." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, MetricIcon]) => { const Icon = MetricIcon as typeof Activity; return <article key={String(label)} className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><strong className="text-3xl font-extrabold text-[var(--brand-primary)]">{number(value)}</strong></div><p className="mt-4 font-bold text-[var(--brand-text)]">{String(label)}</p></article>; })}</div>
    </section>

    {kind === "attendance" ? <section className="mt-6 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7"><AdminSectionHeader icon={ListChecks} title="Evolución temporal" description="Porcentaje de asistencia registrado para cada fecha del período." /><div className="mt-6 grid gap-3">{data.attendanceTrend.length ? data.attendanceTrend.map((item) => <div key={item.date} className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--brand-border-soft)] bg-white p-3 text-sm"><span className="font-bold text-[var(--brand-text)]">{item.date}</span><div className="h-3 overflow-hidden rounded-full bg-[var(--brand-border-soft)]"><div className="h-full rounded-full bg-[var(--brand-secondary)]" style={{ width: `${item.attendanceRate ?? 0}%` }} /></div><strong className="min-w-12 text-right text-[var(--brand-primary)]">{item.attendanceRate ?? 0}%</strong></div>) : <CatalogEmptyState title="No hay datos de asistencia." description="Los registros aparecerán cuando existan clases con asistencia en el período." filtered={false} />}</div></section> : null}

    <section className="mt-6 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
      <AdminSectionHeader icon={kind === "establishments" ? Building2 : Activity} title={kind === "establishments" ? "Establecimientos con mayor actividad" : "Actividades con mayor participación"} description="Comparativa ordenada según la información operativa disponible." />
      {ranking.length ? <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--brand-border-soft)] bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[var(--brand-control)] text-[var(--brand-text)]"><tr><th className="p-4">Nombre</th><th className="p-4">Horarios</th><th className="p-4">Capacidad</th><th className="p-4">Confirmadas</th><th className="p-4">Espera</th><th className="p-4">Ocupación</th></tr></thead><tbody>{ranking.map((row) => <tr key={text(row.id)} className="border-t border-[var(--brand-border-soft)] text-[var(--brand-text)]"><td className="p-4 font-bold text-[var(--brand-ink)]">{text(row.name)}</td><td className="p-4">{number(row.schedules)}</td><td className="p-4">{number(row.capacity)}</td><td className="p-4">{number(row.confirmed)}</td><td className="p-4">{number(row.waitlist)}</td><td className="p-4 font-bold text-[var(--brand-primary)]">{number(row.occupancy)}%</td></tr>)}</tbody></table></div> : <div className="mt-6"><CatalogEmptyState title="No hay información para comparar." description="Los resultados aparecerán cuando existan datos en el período seleccionado." filtered /></div>}
    </section>
  </AdminPageShell>;
}
