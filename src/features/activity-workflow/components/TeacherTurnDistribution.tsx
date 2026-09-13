"use client";

import { Clock3, Info, TimerReset } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profesor } from "@/features/profesores/types/profesor.types";
import { effectiveTeacherAssignments } from "../helpers/teacher-slot-assignments";
import type { ActivityDraftPayload } from "../types/activity-draft.types";

const control = "h-12 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-11 font-medium text-[var(--brand-ink)]";

export function TeacherTurnDistribution({ payload, patch, professors }: { payload: ActivityDraftPayload; patch: (value: Partial<ActivityDraftPayload>) => void; professors: Profesor[] }) {
  const usesTurns = ["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "");
  const selectedIds = new Set(payload.schedules.flatMap((schedule) => schedule.profesorIds));
  const available = professors.filter((professor) => selectedIds.has(professor.id));

  const update = (scheduleIndex: number, startTime: string, endTime: string, professorId: string, checked: boolean) => patch({
    schedules: payload.schedules.map((schedule, index) => {
      if (index !== scheduleIndex) return schedule;
      const assignments = effectiveTeacherAssignments(schedule, payload.duracionTurnoMinutos, payload.intervaloTurnoMinutos, true);
      return {
        ...schedule,
        teacherAssignments: assignments.map((assignment) => assignment.startTime === startTime && assignment.endTime === endTime ? {
          ...assignment,
          professorIds: checked ? [...new Set([...assignment.professorIds, professorId])] : assignment.professorIds.filter((id) => id !== professorId),
        } : assignment),
      };
    }),
  });

  if (!usesTurns) return <div className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-panel)] p-4 text-sm text-[var(--brand-text)]"><Info className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]"/><span>La modalidad seleccionada no divide la franja en turnos. Los profesores elegidos dictarán el horario completo.</span></div>;

  return <div className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <IconControl label="Duración de cada turno (minutos)" icon={Clock3}><Input className={control} type="number" min={15} step={15} value={payload.duracionTurnoMinutos ?? ""} onChange={(event) => patch({ duracionTurnoMinutos: event.target.value ? Number(event.target.value) : null, schedules: payload.schedules.map((schedule) => ({ ...schedule, teacherAssignments: [] })) })}/></IconControl>
      <IconControl label="Intervalo entre turnos (minutos)" icon={TimerReset}><Input className={control} type="number" min={0} step={5} value={payload.intervaloTurnoMinutos} onChange={(event) => patch({ intervaloTurnoMinutos: Math.max(0, Number(event.target.value) || 0), schedules: payload.schedules.map((schedule) => ({ ...schedule, teacherAssignments: [] })) })}/></IconControl>
    </div>
    {!available.length ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Primero seleccioná al menos un profesor en el paso anterior.</p> : !payload.duracionTurnoMinutos ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Definí la duración para generar los turnos que debés distribuir.</p> : <section className="border-t border-[var(--brand-border)] pt-5"><h3 className="font-extrabold text-[var(--brand-primary)]">Distribución de profesores por turno</h3><p className="mt-1 text-sm text-[var(--brand-muted)]">Sólo se muestran los profesores seleccionados en el paso anterior. Asigná quién dicta cada bloque.</p><div className="mt-4 grid gap-4">{payload.schedules.map((schedule, scheduleIndex) => <article key={schedule.id ?? schedule.diaSemana} className="rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-4"><h4 className="font-extrabold capitalize text-[var(--brand-primary)]">{schedule.diaSemana.toLocaleLowerCase("es-AR")} · {schedule.horaInicio} a {schedule.horaFin}</h4><div className="mt-3 grid gap-3">{effectiveTeacherAssignments(schedule, payload.duracionTurnoMinutos, payload.intervaloTurnoMinutos, true).map((assignment) => <div key={`${assignment.startTime}:${assignment.endTime}`} className="grid gap-2 rounded-xl border border-[var(--brand-border-soft)] bg-white p-3 sm:grid-cols-[130px_minmax(0,1fr)]"><strong className="text-sm text-[var(--brand-ink)]">{assignment.startTime}–{assignment.endTime}</strong><div className="flex flex-wrap gap-2">{available.filter((professor) => schedule.profesorIds.includes(professor.id)).map((professor) => <label key={professor.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--brand-border)] px-3 py-2 text-xs font-bold text-[var(--brand-primary)]"><Checkbox checked={assignment.professorIds.includes(professor.id)} onCheckedChange={(value) => update(scheduleIndex, assignment.startTime, assignment.endTime, professor.id, value === true)}/>{professor.usuario.nombre} {professor.usuario.apellido}</label>)}</div></div>)}</div></article>)}</div></section>}
  </div>;
}

function IconControl({ label, icon: Icon, children }: { label: string; icon: typeof Clock3; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="font-bold text-[var(--brand-ink)]">{label}</Label><div className="relative"><Icon className="pointer-events-none absolute left-3.5 top-3.5 z-10 size-5 text-[var(--brand-primary)]"/>{children}</div></div>;
}
