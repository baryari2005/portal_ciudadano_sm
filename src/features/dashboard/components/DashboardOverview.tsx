"use client";

import Link from "next/link";
import { Activity, BarChart3, CalendarCheck2, CalendarDays, ChevronRight, ClipboardCheck, FileCheck2, Gauge, ListChecks, UsersRound } from "lucide-react";
import { AdminPageShell, AdminSectionHeader } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CatalogEmptyState, CatalogErrorState, CatalogLoadingState, CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAdministrativeDashboard } from "../hooks/useAdministrativeDashboard";
import { DashboardFilters, useDashboardFilters } from "./DashboardFilters";

export function DashboardOverview() {
  const filters = useDashboardFilters();
  const { data, loading, error, retry } = useAdministrativeDashboard(filters);
  if (loading) return <CatalogLoadingState label="dashboard" fullPage />;
  if (error || !data) return <CatalogErrorState message={error} onRetry={retry} />;

  const enrollmentChartConfig = { total: { label: "Inscripciones", color: "var(--brand-secondary)" } } satisfies ChartConfig;
  const capacityChartConfig = {
    confirmed: { label: "Ocupados", color: "var(--brand-primary)" },
    available: { label: "Disponibles", color: "var(--brand-accent)" },
  } satisfies ChartConfig;
  const dayLabels: Record<string, string> = { LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié", JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom" };
  const capacityChartData = data.capacityByClass.map((item) => {
    const schedule = `${dayLabels[item.day] ?? item.day} ${item.startTime}`;
    const label = `${item.name} · ${schedule}`;
    return { ...item, chartLabel: `${item.name} · ${schedule} a ${item.endTime}`, displayName: label.length > 24 ? `${label.slice(0, 23)}…` : label };
  });
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
        {data.enrollmentTrend.length ? <div className="mt-6 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-3 sm:p-4">
          <ChartContainer config={enrollmentChartConfig} className="h-56 w-full">
            <AreaChart accessibilityLayer data={data.enrollmentTrend} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
              <defs><linearGradient id="enrollment-area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--brand-secondary)" stopOpacity={0.5} /><stop offset="95%" stopColor="var(--brand-secondary)" stopOpacity={0.04} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--brand-border-soft)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} tickFormatter={(value: string) => value.slice(5).split("-").reverse().join("/")} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={{ stroke: "var(--brand-border)", strokeDasharray: "4 4" }} content={<ChartTooltipContent labelFormatter={(value) => new Date(`${String(value)}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} />} />
              <Area dataKey="total" type="monotone" fill="url(#enrollment-area)" stroke="var(--brand-primary)" strokeWidth={3} activeDot={{ r: 5, fill: "var(--brand-primary)", stroke: "white", strokeWidth: 2 }} />
            </AreaChart>
          </ChartContainer>
        </div> : <div className="mt-6"><CatalogEmptyState title="No hay inscripciones en el período." description="La evolución aparecerá cuando se registren inscripciones." filtered={false} /></div>}
      </div>

      <div className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
        <AdminSectionHeader icon={Gauge} title="Capacidad y ocupación por clase" description="Comparación de lugares ocupados y disponibles en cada actividad." />
        {capacityChartData.length ? <div className="mt-6 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-3 sm:p-4">
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold text-[var(--brand-text)]">
            <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-[var(--brand-primary)]" />Ocupados</span>
            <span className="flex items-center gap-2"><span className="size-3 rounded-sm bg-[var(--brand-accent)]" />Disponibles</span>
          </div>
          <ChartContainer config={capacityChartConfig} className="h-72 w-full sm:h-80">
            <AreaChart accessibilityLayer data={capacityChartData} margin={{ left: 0, right: 12, top: 12, bottom: 8 }}>
              <defs>
                <linearGradient id="capacity-confirmed-area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.5} /><stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0.04} /></linearGradient>
                <linearGradient id="capacity-available-area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--brand-accent)" stopOpacity={0.65} /><stop offset="95%" stopColor="var(--brand-accent)" stopOpacity={0.06} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--brand-border-soft)" />
              <XAxis dataKey="displayName" tickLine={false} axisLine={false} tickMargin={12} minTickGap={18} tick={{ fill: "var(--brand-muted)", fontSize: 10, fontWeight: 600 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={{ stroke: "var(--brand-border)", strokeDasharray: "4 4" }} content={<ChartTooltipContent labelFormatter={(_, payload) => String((payload[0] as { payload?: { chartLabel?: string } })?.payload?.chartLabel ?? "Clase")} />} />
              <Area dataKey="available" type="monotone" fill="url(#capacity-available-area)" stroke="var(--brand-secondary)" strokeWidth={2.5} activeDot={{ r: 5, fill: "var(--brand-secondary)", stroke: "white", strokeWidth: 2 }} />
              <Area dataKey="confirmed" type="monotone" fill="url(#capacity-confirmed-area)" stroke="var(--brand-primary)" strokeWidth={3} activeDot={{ r: 5, fill: "var(--brand-primary)", stroke: "white", strokeWidth: 2 }} />
            </AreaChart>
          </ChartContainer>
          <p className="mt-3 text-xs font-medium text-[var(--brand-muted)]">Se muestran hasta 10 clases/horarios, ordenados por cantidad de inscripciones confirmadas.</p>
        </div> : <div className="mt-6"><CatalogEmptyState title="No hay capacidad configurada." description="El gráfico aparecerá cuando existan actividades con horarios y cupos." filtered={false} /></div>}
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
