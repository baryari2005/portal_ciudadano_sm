import type { ActivityDraftPayload } from "../types/activity-draft.types";

type Schedule = ActivityDraftPayload["schedules"][number];
export type TeacherSlotAssignment = Schedule["teacherAssignments"][number];

const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function buildTeacherSlots(schedule: Pick<Schedule, "horaInicio" | "horaFin">, duration: number | null, gap: number, usesTurns: boolean) {
  if (!usesTurns || !duration) return [{ startTime: schedule.horaInicio, endTime: schedule.horaFin }];
  const slots: Array<{ startTime: string; endTime: string }> = [];
  for (let start = toMinutes(schedule.horaInicio), end = toMinutes(schedule.horaFin); start + duration <= end; start += duration + gap) {
    slots.push({ startTime: toTime(start), endTime: toTime(start + duration) });
  }
  return slots;
}

export function effectiveTeacherAssignments(schedule: Schedule, duration: number | null, gap: number, usesTurns: boolean): TeacherSlotAssignment[] {
  return buildTeacherSlots(schedule, duration, gap, usesTurns).map((slot) => {
    const saved = schedule.teacherAssignments.find((item) => item.startTime === slot.startTime && item.endTime === slot.endTime);
    return { ...slot, professorIds: [...new Set(saved?.professorIds ?? (usesTurns ? [] : schedule.profesorIds))] };
  });
}
