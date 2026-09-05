"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, ClipboardCheck, PauseCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { sessionStatusLabel } from "@/features/activity-sessions/helpers/activity-session-display";
import type { ActivitySession } from "@/features/activity-sessions/types/activity-session.types";

export function TeacherMobileClassOverview({ item }: { item: ActivitySession }) {
  const suspendAllowed = ["PROGRAMADA", "EN_CURSO"].includes(item.status);

  return <main className="min-h-full overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
    <Link href="/teacher/classes" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[var(--brand-primary)]"><ArrowLeft className="size-4"/>Detalle de clase</Link>

    <section className="mt-2 grid min-w-0 grid-cols-[84px_minmax(0,1fr)_auto] items-start gap-3 rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm">
      <ActivityImagePreview source={undefined} alt={`Imagen de ${item.activitySchedule.activity.name}`} className="size-[84px] shrink-0 !rounded-full"/>
      <div className="min-w-0 self-center"><h1 className="break-words text-xl font-extrabold leading-7 text-[var(--brand-primary)]">{item.activitySchedule.activity.name}</h1><p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">Información de la clase.</p></div>
      <StatusBadge value={item.status}/>
    </section>

    <section className="mt-3 rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-3 shadow-sm">
      <div className="grid gap-2">
        <InfoRow icon={CalendarDays} title="Días y horarios"><p>{formatWeekday(item.date)} · {item.startTime} a {item.endTime}</p></InfoRow>
        <InfoRow icon={Building2} title="Establecimiento"><p>{item.establishment.name}</p></InfoRow>
        <InfoRow icon={ClipboardCheck} title="Fecha"><p>{formatDate(item.date)}</p></InfoRow>
      </div>
    </section>

    {suspendAllowed ? <footer className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-[var(--brand-border-soft)] bg-[#F9FAF5]/95 p-3 shadow-[0_-8px_24px_rgba(29,79,54,0.10)] backdrop-blur md:hidden"><Button asChild variant="outline" className="h-12 w-full rounded-xl border-red-300 bg-white font-bold text-red-700"><Link href={`/teacher/classes/${item.id}/suspend`}><PauseCircle/>Suspender clase</Link></Button></footer> : null}
  </main>;
}

function InfoRow({icon:Icon,title,children}:{icon:typeof CalendarDays;title:string;children:React.ReactNode}){return <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><Icon className="size-5"/></span><div className="min-w-0 flex-1 pt-0.5"><h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">{title}</h2><div className="mt-1 break-words text-sm font-extrabold text-[var(--brand-primary)]">{children}</div></div></div>}
function StatusBadge({value}:{value:ActivitySession["status"]}){return <span className="shrink-0 rounded-full border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 px-2.5 py-1 text-[9px] font-extrabold text-[var(--brand-primary)]">{sessionStatusLabel(value)}</span>}
function formatWeekday(value:string){const day=new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString("es-AR",{weekday:"short"}).replace(".","");return day.charAt(0).toUpperCase()+day.slice(1)}
function formatDate(value:string){return new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString("es-AR",{day:"numeric",month:"short",year:"numeric"}).replace(".","")}
