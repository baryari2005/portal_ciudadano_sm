"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Files,
  ListChecks,
  QrCode,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CatalogErrorState, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCitizenData } from "./CitizenPrimitives";

export type DashboardData = {
  user: { firstName: string | null };
  counts: { confirmedEnrollments: number; waitlistEnrollments: number; upcomingSessions: number; attendedSessions: number };
  nextSession: { id: string; date: string; startTime: string; activity: { name: string; imageUrl: string | null }; establishment: { name: string } } | null;
  documentation: { pendingEnrollments: number; observedEnrollments: number; underReviewEnrollments: number; completedEnrollments: number; priorityEnrollmentId: string | null };
  notifications: { unreadCount: number; latest: Array<{ id: string; type: string; title: string; message: string; actionUrl: string | null; actionLabel: string | null }> };
};

export function CitizenDashboard() {
  const { data, loading, error, retry } = useCitizenData<DashboardData>("/summary");
  if (loading) return <CatalogLoadingState label="inicio" fullPage />;
  if (error || !data) return <CatalogErrorState message="No pudimos cargar la información de tu cuenta." onRetry={retry} />;

  const observed = data.documentation.observedEnrollments;
  const pending = data.documentation.pendingEnrollments;
  const attentionCount = observed + pending;
  const news = data.notifications.latest.filter((item) => !["DOCUMENTO_APROBADO", "DOCUMENTO_RECHAZADO"].includes(item.type) || !attentionCount).slice(0, 3);

  return (
    <main className="min-h-full bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ClipboardCheck} label="Inscripciones confirmadas" value={data.counts.confirmedEnrollments} href="/citizen/enrollments" />
        <Metric icon={UsersRound} label="Lista de espera" value={data.counts.waitlistEnrollments} href="/citizen/enrollments" />
        <Metric icon={CalendarClock} label="Próximas clases" value={data.counts.upcomingSessions} href="/citizen/schedule" />
        <Metric icon={ListChecks} label="Asistencias" value={data.counts.attendedSessions} href="/citizen/attendance" />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <Panel title="Próxima clase" icon={CalendarCheck2}>
          {data.nextSession ? (
            <Link href="/citizen/schedule" className="group grid gap-4 rounded-2xl bg-[#F1F5EC] p-4 transition hover:bg-[#E7EFE1] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <div className="grid size-12 place-items-center rounded-xl bg-[#1D4F36] text-white"><CalendarClock className="size-6" /></div>
              <div><p className="font-extrabold text-[#173C2A]">{data.nextSession.activity.name}</p><p className="mt-1 text-sm text-[#5F6F68]">{data.nextSession.date} · {data.nextSession.startTime}</p><p className="text-sm text-[#315644]">{data.nextSession.establishment.name}</p></div>
              <ChevronRight className="size-5 text-[#819B56] transition group-hover:translate-x-1" />
            </Link>
          ) : (
            <EmptyMessage title="No tenés clases próximas" description="Explorá las actividades disponibles para encontrar una propuesta." action="Explorar actividades" href="/citizen/activities" />
          )}
        </Panel>

        <Panel title="Atención requerida" icon={attentionCount ? AlertTriangle : CheckCircle2} accent={Boolean(attentionCount)}>
          {attentionCount ? (
            <div className="grid gap-3">
              {observed ? <AttentionItem icon={AlertTriangle} label="Documentación observada" value={observed} tone="danger" /> : null}
              {pending ? <AttentionItem icon={CircleDashed} label="Documentación pendiente" value={pending} tone="warning" /> : null}
              <Button asChild className="mt-1 h-11 rounded-xl bg-[#1D4F36] font-bold hover:bg-[#143A27]"><Link href="/citizen/documents">Revisar mis documentos</Link></Button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#EEF6E9] p-5 text-center"><CheckCircle2 className="mx-auto size-9 text-[#1D4F36]" /><p className="mt-2 font-extrabold text-[#1D4F36]">Todo al día</p><p className="mt-1 text-sm text-[#5F6F68]">No tenés acciones pendientes.</p></div>
          )}
        </Panel>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <Panel title="Novedades" icon={Bell} action={<Button asChild variant="link" className="h-auto p-0 font-bold text-[#1D4F36]"><Link href="/citizen/notifications">Ver todas</Link></Button>}>
          {news.length ? <div className="grid gap-2">{news.map((item) => <Link key={item.id} href={item.actionUrl || "/citizen/notifications"} className="group flex items-center justify-between gap-3 rounded-xl border border-[#DDE8D7] p-3 transition hover:bg-[#F1F5EC]"><span className="min-w-0"><span className="block truncate font-bold text-[#173C2A]">{item.title}</span><span className="line-clamp-1 text-sm text-[#5F6F68]">{item.message}</span></span><ChevronRight className="size-5 shrink-0 text-[#819B56]" /></Link>)}</div> : <p className="rounded-xl bg-[#F1F5EC] p-4 text-sm text-[#5F6F68]">No tenés novedades recientes.</p>}
        </Panel>

        <Panel title="Accesos rápidos" icon={QrCode}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <QuickLink icon={ClipboardCheck} label="Mis inscripciones" href="/citizen/enrollments" />
            <QuickLink icon={Files} label="Mis documentos" href="/citizen/documents" />
            <QuickLink icon={QrCode} label="Mostrar mi QR" href="/citizen/qr" />
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: number; href: string }) {
  return <Link href={href} className="group rounded-2xl border border-[#DDE8D7] bg-white p-5 transition hover:border-[#819B56] hover:shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-3xl font-extrabold text-[#1D4F36]">{value}</p><p className="mt-1 font-bold text-[#315644]">{label}</p><p className="mt-1 text-xs text-[#819B56]">Estado actual</p></div><span className="grid size-11 place-items-center rounded-xl bg-[#EEF6E9] text-[#1D4F36] transition group-hover:bg-[#DDEED2]"><Icon className="size-5" /></span></div></Link>;
}

function Panel({ title, icon: Icon, action, accent, children }: { title: string; icon: LucideIcon; action?: React.ReactNode; accent?: boolean; children: React.ReactNode }) {
  return <section className={`rounded-3xl border p-6 ${accent ? "border-amber-200 bg-amber-50/40" : "border-[#DDE8D7] bg-white"}`}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-extrabold text-[#1D4F36]"><Icon className="size-5" />{title}</h2>{action}</div>{children}</section>;
}

function AttentionItem({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: "danger" | "warning" }) {
  return <div className={`flex items-center justify-between rounded-xl border p-3 ${tone === "danger" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}><span className="flex items-center gap-2 font-bold"><Icon className="size-5" />{label}</span><strong>{value}</strong></div>;
}

function QuickLink({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return <Link href={href} className="flex items-center justify-between rounded-xl border border-[#DDE8D7] p-3 font-bold text-[#173C2A] transition hover:bg-[#F1F5EC]"><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#EEF6E9] text-[#1D4F36]"><Icon className="size-4" /></span>{label}</span><ChevronRight className="size-4 text-[#819B56]" /></Link>;
}

function EmptyMessage({ title, description, action, href }: { title: string; description: string; action: string; href: string }) {
  return <div className="rounded-2xl bg-[#F1F5EC] p-5 text-center"><p className="font-extrabold text-[#1D4F36]">{title}</p><p className="mt-1 text-sm text-[#5F6F68]">{description}</p><Button asChild variant="outline" className="mt-4 rounded-xl border-[#819B56] bg-white font-bold text-[#1D4F36]"><Link href={href}>{action}</Link></Button></div>;
}
