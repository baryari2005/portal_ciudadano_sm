"use client";

import Link from "next/link";
import { Building2, CalendarClock, CheckCircle2, ChevronRight, History, QrCode, Search, ShieldCheck, UserRound, XCircle, type LucideIcon } from "lucide-react";
import { AdminPageShell, AdminSectionHeader } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatalogEmptyState, CatalogErrorState, CatalogLoadingState, CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useAccessEstablishment } from "@/features/access/hooks/useAccessEstablishment";
import { usePendingUsersAlert } from "@/components/layout/dashboard-topbar/usePendingUsersAlert";
import { useReceptionDashboard } from "../hooks/useReceptionDashboard";
import { ReceptionMobileDashboard } from "./mobile/ReceptionMobileDashboard";

const originLabels: Record<string, string> = { QR: "QR", QR_DIGITAL: "QR digital", CARNET_FISICO: "Carnet físico", MANUAL: "Búsqueda manual" };

export function ReceptionDashboard() {
  const establishment = useAccessEstablishment();
  const dashboard = useReceptionDashboard(establishment.establishmentId);
  const alerts = usePendingUsersAlert(true);
  if (establishment.loading) return <CatalogLoadingState label="experiencia de recepción" fullPage />;

  return <><div className="md:hidden">{dashboard.loading||alerts.loading?<CatalogLoadingState label="Dashboard de Recepción" fullPage/>:<ReceptionMobileDashboard data={dashboard.data} loading={false} establishment={establishment.selected} pendingRequests={alerts.pendingCount} unreadNotifications={alerts.unreadNotificationCount}/>}</div><div className="hidden md:block"><AdminPageShell>
    <CatalogPageHeader icon={ShieldCheck} title="Dashboard de Recepción" description="Resumen operativo del establecimiento y las tareas de atención del día." total={dashboard.data?.metrics.totalEntries ?? 0} />
    <Card className="mt-6 rounded-2xl border-[var(--brand-border-soft)] bg-white shadow-sm"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Building2 className="size-5" /></span><div><h2 className="font-extrabold text-[var(--brand-primary)]">Establecimiento de trabajo</h2><p className="mt-1 text-sm text-[var(--brand-muted)]">Seleccioná dónde estás realizando la atención.</p></div></div><Select value={establishment.establishmentId} onValueChange={establishment.setEstablishmentId}><SelectTrigger className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] sm:w-80"><SelectValue placeholder="Seleccionar establecimiento" /></SelectTrigger><SelectContent>{establishment.options.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent></Select></CardContent></Card>

    {!establishment.establishmentId ? <div className="mt-6"><CatalogEmptyState title="Seleccioná un establecimiento para comenzar." description="Los indicadores y movimientos se mostrarán para el establecimiento activo." filtered={false} /></div> : dashboard.loading ? <CatalogLoadingState label="resumen operativo" /> : dashboard.error || !dashboard.data ? <div className="mt-6"><CatalogErrorState message={dashboard.error ?? "No pudimos cargar el resumen operativo."} onRetry={dashboard.retry} /></div> : <DashboardContent data={dashboard.data} />}
  </AdminPageShell></div></>;
}

function DashboardContent({ data }: { data: NonNullable<ReturnType<typeof useReceptionDashboard>["data"]> }) {
  const metrics = [
    ["Ingresos registrados hoy", data.metrics.totalEntries, UserRound],
    ["Ingresos autorizados", data.metrics.allowedEntries, CheckCircle2],
    ["Ingresos rechazados", data.metrics.rejectedEntries, XCircle],
    ["Personas atendidas", data.metrics.attendedPeople, ShieldCheck],
  ] as const;
  return <>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <Metric key={label} label={label} value={value} icon={Icon} />)}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
      <Panel icon={QrCode} title="Accesos rápidos" description="Herramientas habituales para la atención en recepción."><div className="grid gap-3"><QuickAction href="/reception/scan" icon={QrCode} label="Escanear QR" description="Validar una credencial de ingreso." /><QuickAction href="/reception/manual" icon={Search} label="Búsqueda manual" description="Buscar y registrar una persona." /><QuickAction href="/reception/history" icon={History} label="Ver historial" description="Consultar los movimientos registrados." /></div></Panel>
      <Panel icon={History} title="Actividad reciente" description="Últimos movimientos operativos del establecimiento.">{data.recentAccesses.length ? <div className="grid gap-3">{data.recentAccesses.map((item) => <Link key={item.id} href={`/reception/${item.id}`} className="grid gap-2 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 transition hover:border-[var(--brand-secondary)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-extrabold text-[var(--brand-ink)]">{item.personName ?? "Persona no identificada"}</p><p className="mt-1 text-sm text-[var(--brand-muted)]">{new Date(item.occurredAt).toLocaleString("es-AR")} · {originLabels[item.origin] ?? item.origin}</p><p className="mt-1 text-xs text-[var(--brand-muted)]">Operador: {item.operatorName ?? "No informado"}</p></div><span className={item.result === "PERMITIDO" ? "font-bold text-[var(--brand-primary)]" : "font-bold text-red-700"}>{item.result === "PERMITIDO" ? "Autorizado" : "Rechazado"}</span></Link>)}</div> : <CatalogEmptyState title="No hay movimientos recientes." description="Los ingresos registrados aparecerán en esta sección." filtered={false} />}</Panel>
    </section>
    <section className="mt-6"><Panel icon={CalendarClock} title="Próximas clases" description="Clases programadas en el establecimiento que pueden requerir control de ingreso.">{data.upcomingSessions.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.upcomingSessions.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4"><p className="font-extrabold text-[var(--brand-ink)]">{item.activityName}</p><p className="mt-2 text-sm font-bold text-[var(--brand-primary)]">{item.date} · {item.startTime}</p></article>)}</div> : <CatalogEmptyState title="No hay próximas clases." description="Las clases programadas aparecerán en esta sección." filtered={false} />}</Panel></section>
    <p className="mt-6 text-right text-xs font-medium text-[var(--brand-muted)]">Actualizado: {new Date(data.updatedAt).toLocaleString("es-AR")}</p>
  </>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) { return <Card className="rounded-2xl border-[var(--brand-border-soft)] bg-white shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-5"><div><p className="text-3xl font-extrabold text-[var(--brand-primary)]">{value}</p><p className="mt-2 font-bold text-[var(--brand-text)]">{label}</p><p className="mt-1 text-xs font-bold text-[var(--brand-secondary)]">Hoy</p></div><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Icon className="size-5" /></span></CardContent></Card>; }
function Panel({ icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 shadow-sm sm:p-7"><AdminSectionHeader icon={icon} title={title} description={description} /><div className="mt-6">{children}</div></section>; }
function QuickAction({ href, icon: Icon, label, description }: { href: string; icon: LucideIcon; label: string; description: string }) { return <Button asChild variant="outline" className="h-auto justify-start rounded-2xl border-[var(--brand-border-soft)] bg-white p-4 text-left hover:border-[var(--brand-secondary)] hover:bg-white"><Link href={href} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><span><span className="block font-extrabold text-[var(--brand-ink)]">{label}</span><span className="mt-1 block whitespace-normal text-xs font-medium text-[var(--brand-muted)]">{description}</span></span><ChevronRight className="size-5 text-[var(--brand-secondary)]" /></Link></Button>; }
