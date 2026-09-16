"use client";

import { useState } from "react";
import { CalendarClock, Check, CircleAlert, Clock3, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCard } from "./CheckCard";
import { checkDraftProfessorAvailabilityClient } from "../services/activity-drafts.service";
import type { ActivityDraftPayload } from "../types/activity-draft.types";
import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";
import type { Profesor } from "@/features/profesores/types/profesor.types";
import type { Resource } from "@/features/resources/types/resource.types";

type Schedule = ActivityDraftPayload["schedules"][number];
type Day = Schedule["diaSemana"];

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
};

function groupKey(item: Pick<Schedule, "horaInicio" | "horaFin" | "establecimientoId">) {
  return `${item.horaInicio}|${item.horaFin}|${item.establecimientoId}`;
}

function groupSchedules(schedules: Schedule[]): Group[] {
  const map = new Map<string, Group>();
  for (const item of schedules) {
    const key = groupKey(item);
    const group = map.get(key) ?? { key, horaInicio: item.horaInicio, horaFin: item.horaFin, establecimientoId: item.establecimientoId, days: new Set<Day>(), profesorIds: item.profesorIds, recursoIds: item.recursoIds, cupoMaximo: item.cupoMaximo };
    group.days.add(item.diaSemana);
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.horaFin.localeCompare(b.horaFin) || a.establecimientoId.localeCompare(b.establecimientoId));
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

  if (!payload.establecimientoIds.length) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Seleccioná primero al menos una sede en el paso anterior para configurar los horarios.
      </p>
    );
  }

  const groups = groupSchedules(payload.schedules);
  const showEstablishments = payload.establecimientoIds.length > 1;
  const teacherProfessors = professors.filter((professor) => ["teacher", "profesor"].includes(professor.usuario.rol?.codigo));

  function openNew() {
    const { horaInicio, horaFin } = nextDefaultRange(groups);
    setEditor({ originalKey: null, days: new Set(), horaInicio, horaFin, establecimientoId: payload.establecimientoIds[0] ?? "", profesorIds: [], recursoIds: [], cupoMaximo: payload.cupo ?? 1 });
    setConflict(null);
  }

  function openExisting(group: Group) {
    setEditor({ originalKey: group.key, days: new Set(group.days), horaInicio: group.horaInicio, horaFin: group.horaFin, establecimientoId: group.establecimientoId, profesorIds: [...group.profesorIds], recursoIds: [...group.recursoIds], cupoMaximo: group.cupoMaximo });
    setConflict(null);
  }

  function closeEditor() {
    setEditor(null);
    setConflict(null);
  }

  function removeGroup(group: Group) {
    patch({ schedules: payload.schedules.filter((item) => groupKey(item) !== group.key) });
  }

  function saveEditor() {
    if (!editor || !editor.days.size || editor.horaFin <= editor.horaInicio) return;
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
        profesorIds: editor.profesorIds,
        recursoIds: editor.recursoIds,
        teacherAssignments: previous?.teacherAssignments ?? [],
      };
    });
    patch({ schedules: [...rest, ...nextRows] });
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
      setCheckingProfessor(true);
      setConflict(null);
      try {
        const rowsForCheck: Schedule[] = [...editor.days].map((day) => ({ establecimientoId: editor.establecimientoId, diaSemana: day, horaInicio: editor.horaInicio, horaFin: editor.horaFin, espacio: null, cupoMaximo: editor.cupoMaximo, profesorIds: [], recursoIds: [], teacherAssignments: [] }));
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
    setEditor((current) => current && { ...current, profesorIds: checked ? [...new Set([...current.profesorIds, professorId])] : current.profesorIds.filter((id) => id !== professorId) });
  }

  function toggleResource(resourceId: string, checked: boolean) {
    setEditor((current) => current && { ...current, recursoIds: checked ? [...new Set([...current.recursoIds, resourceId])] : current.recursoIds.filter((id) => id !== resourceId) });
  }

  const editorResources = editor ? resources.filter((resource) => resource.establecimientoId === editor.establecimientoId && resource.estado === "ACTIVO") : [];

  return (
    <div className="space-y-6">
      <div className="max-w-xs space-y-2">
        <Label className="font-bold text-[var(--brand-ink)]">Cupo general</Label>
        <Input
          type="number"
          min={1}
          disabled={!payload.requiereReserva}
          value={payload.cupo ?? ""}
          onChange={(event) => {
            const cupo = event.target.value ? Number(event.target.value) : null;
            patch({ cupo, schedules: payload.schedules.map((item) => ({ ...item, cupoMaximo: cupo || 1 })) });
          }}
          className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)]"
        />
      </div>

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
          <aside className="relative flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>
              {editor.horaFin <= editor.horaInicio ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">La hora de finalización debe ser posterior a la de inicio.</p>
              ) : null}

              {showEstablishments ? (
                <div>
                  <Label className="font-bold text-[var(--brand-ink)]">Sede de este horario</Label>
                  <div className="mt-2 grid gap-2">
                    {payload.establecimientoIds.map((establishmentId) => {
                      const establishment = establishments.find((item) => item.id === establishmentId);
                      return (
                        <CheckCard
                          key={establishmentId}
                          checked={editor.establecimientoId === establishmentId}
                          label={establishment?.nombre ?? establishmentId}
                          onChange={(checked) => { if (checked) setEditor((current) => current && { ...current, establecimientoId: establishmentId, recursoIds: [] }); }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <Label className="font-bold text-[var(--brand-ink)]">Profesores de este horario</Label>
                <div className="mt-2 grid gap-2">
                  {teacherProfessors.map((professor) => (
                    <CheckCard
                      key={professor.id}
                      checked={editor.profesorIds.includes(professor.id)}
                      label={`${professor.usuario.nombre ?? ""} ${professor.usuario.apellido ?? ""}`.trim() || "Profesor"}
                      onChange={(checked) => void toggleProfessor(professor.id, checked)}
                    />
                  ))}
                  {!teacherProfessors.length ? <p className="text-sm text-[var(--brand-muted)]">No hay profesores disponibles.</p> : null}
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
                <div className="mt-2 grid gap-2">
                  {editorResources.map((resource) => (
                    <CheckCard
                      key={resource.id}
                      checked={editor.recursoIds.includes(resource.id)}
                      label={`${resource.nombre} · ${resource.capacidadUnidades} u.`}
                      onChange={(checked) => toggleResource(resource.id, checked)}
                    />
                  ))}
                  {!editorResources.length ? <p className="text-sm text-[var(--brand-muted)]">No hay recursos activos para esta sede.</p> : null}
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-[var(--brand-border-soft)] p-5">
              <Button type="button" variant="outline" className="flex-1" onClick={closeEditor}>Cancelar</Button>
              <Button type="button" className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" disabled={!editor.days.size || editor.horaFin <= editor.horaInicio} onClick={saveEditor}>
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
