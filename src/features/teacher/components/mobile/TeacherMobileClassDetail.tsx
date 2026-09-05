"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttendanceRoster } from "@/features/attendance/types/attendance.types";

export function TeacherMobileClassDetail({data}:{data:AttendanceRoster}) {
  const {session,summary,attendees}=data;
  return <main className="min-h-full overflow-x-hidden bg-[var(--brand-page)] px-4 py-5">
    <Link href="/teacher/classes" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[var(--brand-primary)]"><ArrowLeft className="size-4"/>Volver a clases</Link>

    <header className="relative mt-2 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D4F36] via-[#0D6541] to-[#073E2C] p-5 text-white shadow-sm">
      <span aria-hidden className="absolute -right-8 -top-8 size-32 rounded-full bg-[#819B56]/25"/>
      <span aria-hidden className="absolute -bottom-16 left-12 h-28 w-52 rotate-[-10deg] rounded-[50%] bg-emerald-300/10"/>
      <div className="relative"><div className="flex items-start justify-between gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15"><CalendarDays className="size-6"/></span><StatusBadge value={session.status}/></div><h1 className="mt-4 text-2xl font-extrabold leading-7">{session.activity.name}</h1><p className="mt-3 flex items-center gap-2 text-sm text-white/85"><CalendarDays className="size-4"/>{formatDate(session.date)}</p><p className="mt-1.5 flex items-center gap-2 text-sm text-white/85"><Clock3 className="size-4"/>{session.startTime} a {session.endTime}</p></div>
    </header>

    <section className="mt-4 grid grid-cols-4 gap-2"><Metric label="Inscriptos" value={summary.eligibleCount}/><Metric label="Presentes" value={summary.presentCount}/><Metric label="Ausentes" value={summary.absentCount}/><Metric label="Justificadas" value={summary.justifiedCount}/></section>

    <section className="mt-4 grid gap-3">
      <InfoCard icon={MapPin} title="Establecimiento" value={`${session.establishment.name}${session.space?` · ${session.space}`:""}`}/>
      <InfoCard icon={UsersRound} title="Profesores" value={session.professors.join(", ")||"Sin informar"}/>
    </section>

    <section className="mt-4 rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-[var(--brand-border-soft)] pb-3"><h2 className="font-extrabold text-[var(--brand-primary)]">Participantes</h2><span className="grid min-w-7 place-items-center rounded-full bg-[var(--brand-primary)] px-2 py-1 text-[10px] font-bold text-white">{attendees.length}</span></div><div className="divide-y divide-[var(--brand-border-soft)]">{attendees.length?attendees.map((attendee)=><div key={attendee.enrollmentId} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--brand-ink)]">{attendee.user.firstName} {attendee.user.lastName}</p><p className="mt-0.5 text-[10px] text-[var(--brand-muted)]">DNI {attendee.user.documentNumber??"No informado"}</p></div><AttendanceBadge value={attendee.status}/></div>):<p className="py-6 text-center text-sm text-[var(--brand-muted)]">No hay participantes confirmados.</p>}</div></section>

    <Button asChild className="mt-4 h-12 w-full rounded-xl bg-[var(--brand-primary)] text-base font-bold"><Link href={`/teacher/attendance/${session.id}`}><CheckCircle2/>Tomar asistencia</Link></Button>
  </main>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="min-w-0 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-2 text-center shadow-sm"><p className="text-xl font-extrabold text-[var(--brand-primary)]">{value}</p><p className="truncate text-[9px] font-bold text-[var(--brand-muted)]">{label}</p></div>}
function InfoCard({icon:Icon,title,value}:{icon:typeof MapPin;title:string;value:string}){return <article className="flex items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><Icon className="size-5"/></span><div className="min-w-0"><h2 className="text-xs font-bold text-[var(--brand-muted)]">{title}</h2><p className="mt-0.5 break-words text-sm font-extrabold text-[var(--brand-primary)]">{value}</p></div></article>}
function StatusBadge({value}:{value:string}){return <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[9px] font-extrabold uppercase text-white">{label(value)}</span>}
function AttendanceBadge({value}:{value:string|null}){const text=value?label(value):"Sin registrar";return <span className="shrink-0 rounded-full border border-[var(--brand-border-soft)] bg-white px-2 py-1 text-[9px] font-bold text-[var(--brand-primary)]">{text}</span>}
function label(value:string){return value.replaceAll("_"," ").toLocaleLowerCase("es-AR").replace(/^./,(letter)=>letter.toUpperCase())}
function formatDate(value:string){return new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString("es-AR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})}
