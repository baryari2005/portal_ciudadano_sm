"use client";

import { useState } from "react";
import { CalendarClock, Check, CircleAlert, Clock3, Loader2, Plus, TimerReset, Trash2, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCheckList } from "./SearchableCheckList";
import { checkDraftProfessorAvailabilityClient } from "../services/activity-drafts.service";
import { buildTeacherSlots } from "../helpers/teacher-slot-assignments";
import type { ActivityDraftPayload } from "../types/activity-draft.types";
import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";
import type { Profesor } from "@/features/profesores/types/profesor.types";
import type { Resource } from "@/features/resources/types/resource.types";

type Schedule = ActivityDraftPayload["schedules"][number];
type Day = Schedule["diaSemana"];
type TeacherSlotAssignment = Schedule["teacherAssignments"][number];

const days: Array<[Day, string, string]> = [
  ["LUNES", "LUN", "Lunes"],
  ["MARTES", "MAR", "Martes"],
  ["MIERCOLES", "MIÉ", "Miércoles"],
  ["JUEVES", "JUE", "Jueves"],
  ["VIERNES", "VIE", "Viernes"],
  ["SABADO", "SÁB", "Sábado"],
  ["DOMINGO", "DOM", "Domingo"],
];

type Group = {
  key: string;
  horaInicio: string;
  horaFin: string;
  establecimientoId: string;
  days: Set<Day>;
  profesorIds: string[];
  recursoIds: string[];
  cupoMaximo: number;
  duracionTurnoMinutos: number | null;
};

function groupKey(item: Pick<Schedule, "horaInicio" | "horaFin" | "establecimientoId">) {
  return `${item.horaInicio}|${item.horaFin}|${item.establecimientoId}`;
}

function groupSchedules(schedules: Schedule[]): Group[] {
  const map = new Map<string, Group>();
  for (const item of schedules) {
    const key = groupKey(item);
    const group = map.get(key) ?? { key, horaInicio: item.horaInicio, horaFin: item.horaFin, establecimientoId: item.establecimientoId, days: new Set<Day>(), profesorIds: item.profesorIds, recursoIds: item.recursoIds, cupoMaximo: item.cupoMaximo, duracionTurnoMinutos: item.duracionTurnoMinutos };
    group.days.add(item.diaSemana);
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.horaFin.localeCompare(b.horaFin) || a.establecimientoId.localeCompare(b.establecimientoId));
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

function conflictingDays(editor: Editor, groups: Group[]): Set<Day> {
  const conflicts = new Set<Day>();
  for (const group of groups) {
    if (group.key === editor.originalKey) continue;
    if (group.establecimientoId !== editor.establecimientoId) continue;
    if (!rangesOverlap(editor.horaInicio, editor.horaFin, group.horaInicio, group.horaFin)) continue;
    for (const day of group.days) if (editor.days.has(day)) conflicts.add(day);
  }
  return conflicts;
}

// Un mismo profesor no puede dictar dos horarios superpuestos de la misma
// actividad aunque sean en sedes distintas, así que este chequeo ignora la sede.
function professorConflictingDays(professorId: string, editor: Editor, groups: Group[]): Set<Day> {
  const conflicts = new Set<Day>();
  for (const group of groups) {
    if (group.key === editor.originalKey) continue;
    if (!group.profesorIds.includes(professorId)) continue;
    if (!rangesOverlap(editor.horaInicio, editor.horaFin, group.horaInicio, group.horaFin)) continue;
    for (const day of group.days) if (editor.days.has(day)) conflicts.add(day);
  }
  return conflicts;
}

function nextDefaultRange(groups: Group[]): { horaInicio: string; horaFin: string } {
  const used = new Set(groups.map((group) => group.horaInicio));
  for (let hour = 8; hour <= 20; hour += 1) {
    const horaInicio = `${String(hour).padStart(2, "0")}:00`;
    if (!used.has(horaInicio)) return { horaInicio, horaFin: `${String(hour + 1).padStart(2, "0")}:00` };
  }
  return { horaInicio: "10:00", horaFin: "11:00" };
}

type Editor = {
  originalKey: string | null;
  days: Set<Day>;
  horaInicio: string;
  horaFin: string;
  establecimientoId: string;
  profesorIds: string[];
  recursoIds: string[];
  cupoMaximo: number;
  duracionTurnoMinutos: number | null;
  intervaloTurnoMinutos: number;
  teacherAssignments: TeacherSlotAssignment[];
};

export function HorariosStep({
  draftId,
  payload,
  patch,
  establishments,
  professors,
  resources,
}: {
  draftId: string;
  payload: ActivityDraftPayload;
  patch: (value: Partial<ActivityDraftPayload>) => void;
  establishments: Establecimiento[];
  professors: Profesor[];
  resources: Resource[];
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [checkingProfessor, setCheckingProfessor] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const usesTurns = ["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "");
  const groups = groupSchedules(payload.schedules);
  const showEstablishments = establishments.length > 1;
  const teacherProfessors = professors.filter((professor) => ["teacher", "profesor"].includes(professor.usuario.rol?.codigo));

  function openNew() {
    const { horaInicio, horaFin } = nextDefaultRange(groups);
    setEditor({ originalKey: null, days: new Set(), horaInicio, horaFin, establecimientoId: establishments[0]?.id ?? "", profesorIds: [], recursoIds: [], cupoMaximo: payload.cupo ?? 1, duracionTurnoMinutos: payload.duracionTurnoMinutos, intervaloTurnoMinutos: payload.intervaloTurnoMinutos, teacherAssignments: [] });
    setConflict(null);
  }

  function openExisting(group: Group) {
    const previousRows = payload.schedules.filter((item) => groupKey(item) === group.key);
    setEditor({ originalKey: group.key, days: new Set(group.days), horaInicio: group.horaInicio, horaFin: group.horaFin, establecimientoId: group.establecimientoId, profesorIds: [...group.profesorIds], recursoIds: [...group.recursoIds], cupoMaximo: group.cupoMaximo, duracionTurnoMinutos: group.duracionTurnoMinutos, intervaloTurnoMinutos: previousRows[0]?.intervaloTurnoMinutos ?? 0, teacherAssignments: previousRows[0]?.teacherAssignments ?? [] });
    setConflict(null);
  }

  function closeEditor() {
    setEditor(null);
    setConflict(null);
  }

  // El cupo y la duración de turno general de la actividad se derivan de sus
  // horarios (se usan como referencia/valor por defecto; cada horario mantiene lo suyo propio).
  function withDerivedDefaults(schedules: Schedule[]): Partial<ActivityDraftPayload> {
    const cupo = schedules.length ? Math.max(...schedules.map((item) => item.cupoMaximo)) : null;
    const reference = schedules.find((item) => item.duracionTurnoMinutos);
    const establecimientoIds = [...new Set(schedules.map((item) => item.establecimientoId))];
    return { schedules, cupo, duracionTurnoMinutos: reference?.duracionTurnoMinutos ?? null, intervaloTurnoMinutos: reference?.intervaloTurnoMinutos ?? 0, establecimientoIds };
  }

  function removeGroup(group: Group) {
    patch(withDerivedDefaults(payload.schedules.filter((item) => groupKey(item) !== group.key)));
  }

  function saveEditor() {
    if (!editor || !editor.days.size || editor.horaFin <= editor.horaInicio || editor.cupoMaximo < 1 || conflictingDays(editor, groups).size) return;
    if (editor.profesorIds.some((professorId) => professorConflictingDays(professorId, editor, groups).size)) return;
    const previousRows = editor.originalKey ? payload.schedules.filter((item) => groupKey(item) === editor.originalKey) : [];
    const previousByDay = new Map(previousRows.map((row) => [row.diaSemana, row]));
    const rest = editor.originalKey ? payload.schedules.filter((item) => groupKey(item) !== editor.originalKey) : payload.schedules;
    const nextRows: Schedule[] = [...editor.days].map((day) => {
      const previous = previousByDay.get(day);
      return {
        id: previous?.id,
        establecimientoId: editor.establecimientoId,
        diaSemana: day,
        horaInicio: editor.horaInicio,
        horaFin: editor.horaFin,
        espacio: previous?.espacio ?? null,
        cupoMaximo: editor.cupoMaximo,
        duracionTurnoMinutos: editor.duracionTurnoMinutos,
        intervaloTurnoMinutos: editor.intervaloTurnoMinutos,
        profesorIds: editor.profesorIds,
        recursoIds: editor.recursoIds,
        teacherAssignments: editor.teacherAssignments,
      };
    });
    patch(withDerivedDefaults([...rest, ...nextRows]));
    closeEditor();
  }

  function toggleEditorDay(day: Day, checked: boolean) {
    setEditor((current) => {
      if (!current) return current;
      const nextDays = new Set(current.days);
      if (checked) nextDays.add(day);
      else nextDays.delete(day);
      return { ...current, days: nextDays };
    });
  }

  async function toggleProfessor(professorId: string, checked: boolean) {
    if (!editor) return;
    if (checked && editor.days.size) {
      const draftConflictDays = professorConflictingDays(professorId, editor, groups);
      if (draftConflictDays.size) {
        const label = days.filter(([value]) => draftConflictDays.has(value)).map(([, , dayLabel]) => dayLabel).join(", ");
        setConflict(`Este profesor ya está asignado a otro horario de esta actividad que se superpone (${label}), en otra sede.`);
        return;
      }
      setCheckingProfessor(true);
      setConflict(null);
      try {
        const rowsForCheck: Schedule[] = [...editor.days].map((day) => ({ establecimientoId: editor.establecimientoId, diaSemana: day, horaInicio: editor.horaInicio, horaFin: editor.horaFin, espacio: null, cupoMaximo: editor.cupoMaximo, duracionTurnoMinutos: editor.duracionTurnoMinutos, intervaloTurnoMinutos: editor.intervaloTurnoMinutos, profesorIds: [], recursoIds: [], teacherAssignments: [] }));
        const availability = await checkDraftProfessorAvailabilityClient(draftId, professorId, rowsForCheck);
        if (!availability.available) {
          setConflict(availability.message ?? "El profesor no está disponible en ese horario.");
          setCheckingProfessor(false);
          return;
        }
      } catch {
        setConflict("No pudimos verificar la disponibilidad del profesor.");
        setCheckingProfessor(false);
        return;
      }
      setCheckingProfessor(false);
    }
    setEditor((current) => current && {
      ...current,
      profesorIds: checked ? [...new Set([...current.profesorIds, professorId])] : current.profesorIds.filter((id) => id !== professorId),
      teacherAssignments: checked ? current.teacherAssignments : current.teacherAssignments.map((assignment) => ({ ...assignment, professorIds: assignment.professorIds.filter((id) => id !== professorId) })),
    });
  }

  function toggleResource(resourceId: string, checked: boolean) {
    setEditor((current) => current && { ...current, recursoIds: checked ? [...new Set([...current.recursoIds, resourceId])] : current.recursoIds.filter((id) => id !== resourceId) });
  }

  function updateTurnoSettings(duracionTurnoMinutos: number | null, intervaloTurnoMinutos: number) {
    setEditor((current) => current && { ...current, duracionTurnoMinutos, intervaloTurnoMinutos, teacherAssignments: [] });
  }

  function slotProfessorIds(slot: { startTime: string; endTime: string }) {
    if (!editor) return [];
    const saved = editor.teacherAssignments.find((assignment) => assignment.startTime === slot.startTime && assignment.endTime === slot.endTime);
    return saved?.professorIds ?? [];
  }

  function toggleSlotProfessor(slot: { startTime: string; endTime: string }, professorId: string, checked: boolean) {
    setEditor((current) => {
      if (!current) return current;
      const existing = current.teacherAssignments.find((assignment) => assignment.startTime === slot.startTime && assignment.endTime === slot.endTime);
      const nextProfessorIds = checked
        ? [...new Set([...(existing?.professorIds ?? []), professorId])]
        : (existing?.professorIds ?? []).filter((id) => id !== professorId);
      const others = current.teacherAssignments.filter((assignment) => !(assignment.startTime === slot.startTime && assignment.endTime === slot.endTime));
      return { ...current, teacherAssignments: [...others, { startTime: slot.startTime, endTime: slot.endTime, professorIds: nextProfessorIds }] };
    });
  }

  const editorResources = editor ? resources.filter((resource) => resource.establecimientoId === editor.establecimientoId && resource.estado === "ACTIVO") : [];
  const editorProfessors = editor ? teacherProfessors.filter((professor) => editor.profesorIds.includes(professor.id)) : [];
  const turnoSlots = editor && usesTurns ? buildTeacherSlots({ horaInicio: editor.horaInicio, horaFin: editor.horaFin }, editor.duracionTurnoMinutos, editor.intervaloTurnoMinutos, true) : [];
  const editorConflicts = editor ? conflictingDays(editor, groups) : new Set<Day>();
  const editorConflictLabel = editorConflicts.size
    ? days.filter(([value]) => editorConflicts.has(value)).map(([, , label]) => label).join(", ")
    : "";
  const editorProfessorConflictIds = editor
    ? editor.profesorIds.filter((professorId) => professorConflictingDays(professorId, editor, groups).size)
    : [];
  const editorProfessorConflictLabel = editorProfessorConflictIds.length
    ? editorProfessorConflictIds
        .map((professorId) => teacherProfessors.find((professor) => professor.id === professorId))
        .filter((professor): professor is Profesor => Boolean(professor))
        .map((professor) => `${professor.usuario.nombre ?? ""} ${professor.usuario.apellido ?? ""}`.trim() || "Profesor")
        .join(", ")
    : "";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {groups.map((group) => {
          const establishment = establishments.find((item) => item.id === group.establecimientoId);
          const orderedDays = days.filter(([value]) => group.days.has(value)).map(([, , label]) => label);
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => openExisting(group)}
              className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 text-left transition hover:border-[var(--brand-secondary)] hover:shadow-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
                <CalendarClock className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-[15px] font-extrabold text-[var(--brand-ink)]">
                    {orderedDays.join(", ")} · {group.horaInicio} a {group.horaFin}
                  </strong>
                  {showEstablishments ? (
                    <span className="shrink-0 rounded-full border border-[var(--brand-secondary)] bg-[var(--brand-panel)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--brand-primary)]">
                      {establishment?.nombre ?? "Sede"}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block truncate text-sm text-[var(--brand-muted)]">
                  {group.profesorIds.length} profesor{group.profesorIds.length === 1 ? "" : "es"} · {group.recursoIds.length ? `${group.recursoIds.length} recurso${group.recursoIds.length === 1 ? "" : "s"}` : "Sin recursos"} · Cupo {group.cupoMaximo}
                  {usesTurns && group.duracionTurnoMinutos ? ` · Turnos de ${group.duracionTurnoMinutos} min` : ""}
                </span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => { event.stopPropagation(); removeGroup(group); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); removeGroup(group); } }}
                className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50"
                aria-label="Eliminar este horario"
              >
                <Trash2 className="size-4" />
              </span>
            </button>
          );
        })}
        {!groups.length ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Todavía no cargaste ningún horario. Agregá al menos uno para continuar.
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={openNew}>
          <Plus />
          Agregar horario
        </Button>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Cerrar" onClick={closeEditor} className="absolute inset-0 bg-black/45" />
          <aside className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--brand-border-soft)] p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
                  <CalendarClock className="size-5" />
                </span>
                <div>
                  <h3 className="text-[17px] font-extrabold text-[var(--brand-heading)]">{editor.originalKey ? "Editar horario" : "Nuevo horario"}</h3>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">Días, hora, sede, profesores y recursos de este horario.</p>
                </div>
              </div>
              <button type="button" onClick={closeEditor} aria-label="Cerrar" className="shrink-0 rounded-lg p-1.5 text-[var(--brand-muted)] hover:bg-[var(--brand-panel)]">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <Label className="font-bold text-[var(--brand-ink)]">Días</Label>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {days.map(([value, shortLabel]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-[11px] font-extrabold transition ${editor.days.has(value) ? "border-[var(--brand-primary)] bg-[var(--brand-accent)] text-[var(--brand-ink)]" : "border-[var(--brand-border)] bg-white text-[var(--brand-text)]"}`}
                    >
                      <Checkbox className="sr-only" checked={editor.days.has(value)} onCheckedChange={(checked) => toggleEditorDay(value, checked === true)} />
                      {shortLabel}
                    </label>
                  ))}
                </div>
                {!editor.days.size ? <p className="mt-2 text-xs font-medium text-amber-800">Elegí al menos un día.</p> : null}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-bold text-[var(--brand-ink)]">Hora de inicio</Label>
                  <div className="relative mt-2">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
                    <Input type="time" value={editor.horaInicio} onChange={(event) => setEditor((current) => current && { ...current, horaInicio: event.target.value })} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9" />
                  </div>
                </div>
                <div>
                  <Label className="font-bold text-[var(--brand-ink)]">Hora de fin</Label>
                  <div className="relative mt-2">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
                    <Input type="time" min={editor.horaInicio} value={editor.horaFin} onChange={(event) => setEditor((current) => current && { ...current, horaFin: event.target.value })} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9" />
                  </div>
                </div>
                <div>
                  <Label className="font-bold text-[var(--brand-ink)]">Cupo</Label>
                  <div className="relative mt-2">
                    <UsersRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
                    <Input type="number" min={1} value={editor.cupoMaximo} onChange={(event) => setEditor((current) => current && { ...current, cupoMaximo: Number(event.target.value) || 1 })} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9" />
                  </div>
                </div>
              </div>
              {editor.horaFin <= editor.horaInicio ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">La hora de finalización debe ser posterior a la de inicio.</p>
              ) : null}
              {editor.cupoMaximo < 1 ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">El cupo de este horario debe ser al menos 1.</p>
              ) : null}
              {editorConflicts.size ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                  Ya existe un horario en esta sede que se superpone en: {editorConflictLabel}. Cambiá el rango horario o los días.
                </p>
              ) : null}
              {editorProfessorConflictIds.length ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                  {editorProfessorConflictLabel} ya está asignado/a a otro horario de esta actividad en otra sede que se superpone. Cambiá el rango horario, los días o el profesor.
                </p>
              ) : null}

              {usesTurns ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold text-[var(--brand-ink)]">Duración del turno (min)</Label>
                    <div className="relative mt-2">
                      <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
                      <Input type="number" min={15} step={15} value={editor.duracionTurnoMinutos ?? ""} onChange={(event) => updateTurnoSettings(event.target.value ? Number(event.target.value) : null, editor.intervaloTurnoMinutos)} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="font-bold text-[var(--brand-ink)]">Intervalo entre turnos (min)</Label>
                    <div className="relative mt-2">
                      <TimerReset className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
                      <Input type="number" min={0} step={5} value={editor.intervaloTurnoMinutos} onChange={(event) => updateTurnoSettings(editor.duracionTurnoMinutos, Math.max(0, Number(event.target.value) || 0))} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9" />
                    </div>
                  </div>
                </div>
              ) : null}

              {showEstablishments ? (
                <div>
                  <Label className="font-bold text-[var(--brand-ink)]">Sede de este horario</Label>
                  <div className="mt-2">
                    <SearchableCheckList
                      items={establishments.map((item) => ({ id: item.id, label: item.nombre }))}
                      selectedIds={[editor.establecimientoId]}
                      searchPlaceholder="Buscar sede..."
                      emptyText="No se encontraron sedes."
                      onToggle={(id, checked) => { if (checked) setEditor((current) => current && { ...current, establecimientoId: id, recursoIds: [] }); }}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <Label className="font-bold text-[var(--brand-ink)]">Profesores de este horario</Label>
                <div className="mt-2">
                  <SearchableCheckList
                    items={teacherProfessors.map((professor) => ({ id: professor.id, label: `${professor.usuario.nombre ?? ""} ${professor.usuario.apellido ?? ""}`.trim() || "Profesor" }))}
                    selectedIds={editor.profesorIds}
                    searchPlaceholder="Buscar profesor..."
                    emptyText="No hay profesores disponibles."
                    onToggle={(id, checked) => void toggleProfessor(id, checked)}
                  />
                </div>
                {checkingProfessor ? (
                  <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[var(--brand-primary)]"><Loader2 className="size-3.5 animate-spin" />Verificando disponibilidad...</p>
                ) : conflict ? (
                  <p className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"><CircleAlert className="mt-0.5 size-4 shrink-0" />{conflict}</p>
                ) : null}
              </div>

              <div>
                <Label className="font-bold text-[var(--brand-ink)]">
                  {showEstablishments ? `Recursos en ${establishments.find((item) => item.id === editor.establecimientoId)?.nombre ?? "esta sede"}` : "Recursos"}
                </Label>
                <div className="mt-2">
                  <SearchableCheckList
                    items={editorResources.map((resource) => ({ id: resource.id, label: `${resource.nombre} · ${resource.capacidadUnidades} u.` }))}
                    selectedIds={editor.recursoIds}
                    searchPlaceholder="Buscar recurso..."
                    emptyText="No hay recursos activos para esta sede."
                    onToggle={toggleResource}
                  />
                </div>
              </div>

              {usesTurns && editor.duracionTurnoMinutos && editorProfessors.length ? (
                <div className="border-t border-[var(--brand-border)] pt-5">
                  <Label className="font-bold text-[var(--brand-ink)]">Distribución por turno</Label>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">Asigná quién de los profesores elegidos dicta cada turno.</p>
                  <div className="mt-3 space-y-2">
                    {turnoSlots.map((slot) => (
                      <div key={`${slot.startTime}-${slot.endTime}`} className="rounded-xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-3">
                        <strong className="text-sm text-[var(--brand-ink)]">{slot.startTime}–{slot.endTime}</strong>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {editorProfessors.map((professor) => (
                            <label key={professor.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)]">
                              <Checkbox checked={slotProfessorIds(slot).includes(professor.id)} onCheckedChange={(checked) => toggleSlotProfessor(slot, professor.id, checked === true)} />
                              {professor.usuario.nombre} {professor.usuario.apellido}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-[var(--brand-border-soft)] p-5">
              <Button type="button" variant="outline" className="flex-1" onClick={closeEditor}>Cancelar</Button>
              <Button type="button" className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" disabled={!editor.days.size || editor.horaFin <= editor.horaInicio || editor.cupoMaximo < 1 || editorConflicts.size > 0 || editorProfessorConflictIds.length > 0} onClick={saveEditor}>
                <Check />
                Guardar horario
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
