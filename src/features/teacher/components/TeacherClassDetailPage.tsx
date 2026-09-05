"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import type { AttendanceRoster } from "@/features/attendance/types/attendance.types";
import { getTeacherSessionClient } from "../services/teacher.service";
import { TeacherMobileClassDetail } from "./mobile/TeacherMobileClassDetail";

export function TeacherClassDetailPage({id}:{id:string}) {
  const[data,setData]=useState<AttendanceRoster|null>(null);
  useEffect(()=>{void getTeacherSessionClient(id).then(setData)},[id]);
  if(!data)return <div className="h-72 animate-pulse rounded-3xl bg-[var(--brand-panel)]"/>;
  return <><div className="md:hidden"><TeacherMobileClassDetail data={data}/></div><div className="hidden md:block"><DesktopClassDetail data={data} id={id}/></div></>;
}

function DesktopClassDetail({data,id}:{data:AttendanceRoster;id:string}){return <div><header className="mb-6"><h1 className="text-3xl font-extrabold text-[var(--brand-primary)]">{data.session.activity.name}</h1><p className="mt-1 text-sm text-[var(--brand-muted)]">{data.session.date} · {data.session.startTime} a {data.session.endTime} · {data.session.establishment.name}</p></header><div className="grid gap-5"><section className="grid gap-3 rounded-3xl border border-[var(--brand-secondary)]/25 bg-white p-5 sm:grid-cols-4"><DesktopStat label="Inscriptos" value={data.summary.eligibleCount}/><DesktopStat label="Presentes" value={data.summary.presentCount}/><DesktopStat label="Ausentes" value={data.summary.absentCount}/><DesktopStat label="Justificadas" value={data.summary.justifiedCount}/></section><section className="rounded-3xl border border-[var(--brand-secondary)]/25 bg-white p-5"><h2 className="font-bold text-[var(--brand-primary)]">Inscriptos confirmados</h2><div className="mt-3 grid gap-2">{data.attendees.length?data.attendees.map((attendee)=><div key={attendee.enrollmentId} className="rounded-xl bg-[var(--brand-page)] p-3 text-sm"><strong>{attendee.user.firstName} {attendee.user.lastName}</strong><span className="block text-[var(--brand-muted)]">DNI {attendee.user.documentNumber??"No informado"} · {attendee.status??"Sin asistencia"}</span></div>):<p>No hay inscriptos confirmados.</p>}</div></section><Button asChild className="w-fit"><Link href={`/teacher/attendance/${id}`}>Tomar asistencia</Link></Button></div></div>}
function DesktopStat({label,value}:{label:string;value:number}){return <div className="rounded-3xl border border-[var(--brand-secondary)]/25 bg-white p-5"><p className="text-sm text-[var(--brand-muted)]">{label}</p><p className="mt-2 text-3xl font-bold text-[var(--brand-primary)]">{value}</p></div>}
