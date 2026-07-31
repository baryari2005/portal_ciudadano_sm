"use client";

import Link from "next/link";
import { Activity, ArrowRight, BarChart3, Building2, ClipboardCheck, FileCheck2, ListChecks } from "lucide-react";
import { AdminPageShell, AdminSectionHeader } from "@/components/shared/admin-patterns";
import { CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";

const items = [
  { href: "/reports/activities", title: "Actividades", description: "Capacidad, demanda, ocupación y clases programadas.", icon: Activity },
  { href: "/reports/enrollments", title: "Inscripciones", description: "Altas, confirmaciones, cancelaciones y listas de espera.", icon: ClipboardCheck },
  { href: "/reports/attendance", title: "Asistencias", description: "Presentes, ausentes, justificaciones y evolución temporal.", icon: ListChecks },
  { href: "/reports/establishments", title: "Establecimientos", description: "Oferta, capacidad, ocupación y participación por sede.", icon: Building2 },
  { href: "/reports/documentation", title: "Documentación", description: "Documentos pendientes, aprobados, rechazados y cargados.", icon: FileCheck2 },
];

export function ReportsPage() {
  return <AdminPageShell>
    <CatalogPageHeader icon={BarChart3} title="Reportes administrativos" description="Consultá indicadores operativos agregados sin exponer datos personales innecesarios." total={items.length} />
    <section className="mt-6 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7">
      <AdminSectionHeader icon={BarChart3} title="Paneles disponibles" description="Seleccioná el área que querés analizar y luego ajustá el período desde sus filtros." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="group grid min-h-44 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-5 text-left transition hover:border-[var(--brand-secondary)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]">
          <span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm"><Icon className="size-6" /></span>
          <span className="min-w-0"><span className="block text-xl font-extrabold text-[var(--brand-ink)]">{title}</span><span className="mt-2 block text-sm font-medium leading-6 text-[var(--brand-text)]">{description}</span><span className="mt-4 block text-xs font-bold uppercase tracking-wide text-[var(--brand-secondary)]">Abrir reporte</span></span>
          <ArrowRight className="mt-1 size-5 text-[var(--brand-secondary)] transition-transform group-hover:translate-x-1" />
        </Link>)}
      </div>
    </section>
  </AdminPageShell>;
}
