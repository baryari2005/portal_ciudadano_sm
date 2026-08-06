"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, QrCode, Save, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CatalogLoadingState, CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import type { AttendanceRoster, AttendanceRosterItem, AttendanceStatus } from "@/features/attendance/types/attendance.types";
import { getTeacherAttendanceClient, updateTeacherAttendanceClient } from "../services/teacher.service";

export function TeacherAttendancePage({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<AttendanceRoster | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, AttendanceRosterItem>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { void getTeacherAttendanceClient(sessionId).then(setData).catch(() => toast.error("La planilla solo está disponible el día de la clase.")); }, [sessionId]);
  const rows = useMemo(() => data?.attendees.map((row) => draft[row.enrollmentId] ?? row).filter((row) => `${row.user.firstName} ${row.user.lastName} ${row.user.documentNumber}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, draft, query]);
  if (!data) return <CatalogLoadingState label="planilla de asistencia" />;
  const closed = data.session.attendanceState === "CLOSED";
  const patch = (row: AttendanceRosterItem, value: Partial<AttendanceRosterItem>) => setDraft((current) => ({ ...current, [row.enrollmentId]: { ...row, ...current[row.enrollmentId], ...value } }));

  async function save() {
    const records = Object.values(draft).map((row) => ({ enrollmentId: row.enrollmentId, status: row.status!, justificationReason: row.status === "JUSTIFICADA" ? row.justificationReason : null, observations: row.observations }));
    if (!records.length) return;
    if (records.some((row) => row.status === "JUSTIFICADA" && !row.justificationReason?.trim())) return toast.error("Indicá el motivo de cada ausencia justificada.");
    setSaving(true);
    try { setData(await updateTeacherAttendanceClient(sessionId, { action: "batch", records })); setDraft({}); toast.success("Asistencia guardada."); }
    catch (error: any) { toast.error(error?.response?.data?.message ?? "No pudimos guardar la asistencia."); }
    finally { setSaving(false); }
  }

  async function close() {
    setSaving(true);
    try { if (Object.keys(draft).length) await save(); setData(await updateTeacherAttendanceClient(sessionId, { action: "close" })); setDraft({}); toast.success("Planilla cerrada."); }
    catch (error: any) { toast.error(error?.response?.data?.message ?? "No pudimos cerrar la planilla."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-full bg-[var(--brand-page)] p-4 sm:p-6"><header className="rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-[var(--brand-secondary)]">Tomar asistencia</p><h1 className="mt-1 text-3xl font-extrabold text-[var(--brand-primary)]">{data.session.activity.name}</h1><p className="mt-2 text-sm text-[var(--brand-muted)]">{data.session.date} · {data.session.startTime} a {data.session.endTime} · {data.session.establishment.name}</p></div><Button asChild variant="outline" className="rounded-xl border-[var(--brand-border)] bg-white"><Link href={`/teacher/attendance/${sessionId}/scan`}><QrCode />Escanear QR</Link></Button></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Stat label="Inscriptos" value={data.summary.eligibleCount}/><Stat label="Presentes" value={data.summary.presentCount}/><Stat label="Ausentes" value={data.summary.absentCount}/><Stat label="Justificadas" value={data.summary.justifiedCount}/></div></header><section className="mt-5 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, apellido o DNI..."/><div className="flex gap-2"><Button variant="outline" disabled={closed||saving||!Object.keys(draft).length} onClick={() => void save()} className="h-12 rounded-xl border-[var(--brand-border)] bg-white"><Save/>Guardar</Button><Button disabled={closed||saving} onClick={() => void close()} className="h-12 rounded-xl bg-[var(--brand-primary)]">{saving?<Loader2 className="animate-spin"/>:<CheckCircle2/>}Cerrar planilla</Button></div></div><div className="mt-5 grid gap-3">{rows.map((row) => <article key={row.enrollmentId} className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-extrabold text-[var(--brand-ink)]">{row.user.firstName} {row.user.lastName}</p><p className="text-sm text-[var(--brand-muted)]">DNI {row.user.documentNumber ?? "No informado"}</p></div><div className="flex flex-wrap gap-2">{(["PRESENTE","AUSENTE","JUSTIFICADA"] as AttendanceStatus[]).map((status) => <Button key={status} disabled={closed} variant={row.status===status?"default":"outline"} className={row.status===status?"bg-[var(--brand-primary)]":""} onClick={() => patch(row,{status,justificationReason:status==="JUSTIFICADA"?row.justificationReason:null})}>{status==="PRESENTE"?<CheckCircle2/>:status==="AUSENTE"?<XCircle/>:<Search/>}{status==="PRESENTE"?"Presente":status==="AUSENTE"?"Ausente":"Justificada"}</Button>)}</div></div>{row.status==="JUSTIFICADA"?<Input className="mt-3 bg-[var(--brand-page)]" value={row.justificationReason??""} onChange={(event)=>patch(row,{justificationReason:event.target.value})} placeholder="Motivo obligatorio de la justificación"/>:null}<Textarea className="mt-3 bg-[var(--brand-page)]" value={row.observations??""} onChange={(event)=>patch(row,{observations:event.target.value})} placeholder="Observaciones opcionales"/></article>)}</div></section></main>;
}

function Stat({label,value}:{label:string;value:number}){return <div className="rounded-2xl bg-white p-3 text-center"><p className="text-2xl font-extrabold text-[var(--brand-primary)]">{value}</p><p className="text-xs font-bold text-[var(--brand-muted)]">{label}</p></div>}
