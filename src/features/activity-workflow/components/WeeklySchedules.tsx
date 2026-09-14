"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react";
import { CheckCard } from "./CheckCard";
import type { ActivityDraftPayload } from "../types/activity-draft.types";
import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";

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

type Block = { key: string; horaInicio: string; horaFin: string; days: Set<Day>; establecimientoIds: Set<string> };

function groupBlocks(schedules: Schedule[]): Block[] {
  const map = new Map<string, Block>();
  for (const item of schedules) {
    const key = `${item.horaInicio}|${item.horaFin}`;
    const block = map.get(key) ?? { key, horaInicio: item.horaInicio, horaFin: item.horaFin, days: new Set(), establecimientoIds: new Set() };
    block.days.add(item.diaSemana);
    block.establecimientoIds.add(item.establecimientoId);
    map.set(key, block);
  }
  return [...map.values()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.horaFin.localeCompare(b.horaFin));
}

function nextDefaultRange(blocks: Block[]): { horaInicio: string; horaFin: string } {
  const used = new Set(blocks.map((block) => block.horaInicio));
  for (let hour = 8; hour <= 20; hour += 1) {
    const horaInicio = `${String(hour).padStart(2, "0")}:00`;
    if (!used.has(horaInicio)) return { horaInicio, horaFin: `${String(hour + 1).padStart(2, "0")}:00` };
  }
  return { horaInicio: "10:00", horaFin: "11:00" };
}

function emptyRow(payload: ActivityDraftPayload, establecimientoId: string, diaSemana: Day, horaInicio: string, horaFin: string): Schedule {
  return { establecimientoId, diaSemana, horaInicio, horaFin, espacio: null, cupoMaximo: payload.cupo ?? 1, profesorIds: [], recursoIds: [], teacherAssignments: [] };
}

export function WeeklySchedules({
  payload,
  patch,
  establishments,
}: {
  payload: ActivityDraftPayload;
  patch: (value: Partial<ActivityDraftPayload>) => void;
  establishments: Establecimiento[];
}) {
  if (!payload.establecimientoIds.length) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Seleccioná primero al menos una sede en el paso anterior para configurar los horarios.
      </p>
    );
  }

  const blocks = groupBlocks(payload.schedules);
  const showEstablishments = payload.establecimientoIds.length > 1;

  function addBlock() {
    const { horaInicio, horaFin } = nextDefaultRange(blocks);
    patch({ schedules: [...payload.schedules, emptyRow(payload, payload.establecimientoIds[0] ?? "", "LUNES", horaInicio, horaFin)] });
  }

  function removeBlock(block: Block) {
    patch({ schedules: payload.schedules.filter((item) => !(item.horaInicio === block.horaInicio && item.horaFin === block.horaFin)) });
  }

  function updateBlockTime(block: Block, nextStart: string, nextEnd: string) {
    patch({
      schedules: payload.schedules.map((item) =>
        item.horaInicio === block.horaInicio && item.horaFin === block.horaFin
          ? { ...item, horaInicio: nextStart, horaFin: nextEnd }
          : item,
      ),
    });
  }

  function toggleBlockDay(block: Block, day: Day, checked: boolean) {
    if (checked) {
      const sedes = block.establecimientoIds.size ? [...block.establecimientoIds] : [payload.establecimientoIds[0] ?? ""];
      const existing = new Set(
        payload.schedules
          .filter((item) => item.horaInicio === block.horaInicio && item.horaFin === block.horaFin && item.diaSemana === day)
          .map((item) => item.establecimientoId),
      );
      const created = sedes.filter((id) => !existing.has(id)).map((id) => emptyRow(payload, id, day, block.horaInicio, block.horaFin));
      patch({ schedules: [...payload.schedules, ...created] });
    } else {
      patch({
        schedules: payload.schedules.filter(
          (item) => !(item.horaInicio === block.horaInicio && item.horaFin === block.horaFin && item.diaSemana === day),
        ),
      });
    }
  }

  function toggleBlockEstablishment(block: Block, establishmentId: string, checked: boolean) {
    if (checked) {
      const existing = new Set(
        payload.schedules
          .filter((item) => item.horaInicio === block.horaInicio && item.horaFin === block.horaFin && item.establecimientoId === establishmentId)
          .map((item) => item.diaSemana),
      );
      const created = [...block.days].filter((day) => !existing.has(day)).map((day) => emptyRow(payload, establishmentId, day, block.horaInicio, block.horaFin));
      patch({ schedules: [...payload.schedules, ...created] });
    } else {
      patch({
        schedules: payload.schedules.filter(
          (item) => !(item.horaInicio === block.horaInicio && item.horaFin === block.horaFin && item.establecimientoId === establishmentId),
        ),
      });
    }
  }

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => (
        <section key={block.key} className="rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-[var(--brand-primary)]">Horario {index + 1}</h3>
                <p className="text-sm text-[var(--brand-muted)]">
                  Marcá los días que comparten esta franja. Si la actividad se dicta en otro horario del mismo día, agregá otro bloque.
                </p>
              </div>
            </div>
            {blocks.length > 1 ? (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(block)} aria-label="Eliminar este horario">
                <Trash2 className="size-4 text-red-600" />
              </Button>
            ) : null}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-7">
            {days.map(([value, shortLabel, fullLabel]) => (
              <label
                key={value}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 font-bold transition ${block.days.has(value) ? "border-[var(--brand-primary)] bg-[var(--brand-accent)] text-[var(--brand-primary)]" : "border-[var(--brand-border)] bg-white text-[var(--brand-text)]"}`}
              >
                <Checkbox
                  className="sr-only"
                  checked={block.days.has(value)}
                  onCheckedChange={(checked) => toggleBlockDay(block, value, checked === true)}
                />
                <span className="2xl:hidden">{shortLabel}</span>
                <span className="hidden 2xl:inline">{fullLabel}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Hora de inicio" icon={<Clock3 />}>
              <Input
                type="time"
                value={block.horaInicio}
                onChange={(event) => updateBlockTime(block, event.target.value, block.horaFin)}
              />
            </Field>
            <Field label="Hora de finalización" icon={<Clock3 />}>
              <Input
                type="time"
                min={block.horaInicio}
                value={block.horaFin}
                onChange={(event) => updateBlockTime(block, block.horaInicio, event.target.value)}
              />
            </Field>
          </div>
          {block.horaFin <= block.horaInicio ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              La hora de finalización debe ser posterior a la hora de inicio.
            </p>
          ) : null}
          {showEstablishments ? (
            <div className="mt-5 space-y-2">
              <Label className="font-bold text-[var(--brand-ink)]">Sedes de este horario</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {payload.establecimientoIds.map((establishmentId) => {
                  const establishment = establishments.find((item) => item.id === establishmentId);
                  const checked = block.establecimientoIds.has(establishmentId);
                  const isLastChecked = checked && block.establecimientoIds.size === 1;
                  return (
                    <CheckCard
                      key={establishmentId}
                      checked={checked}
                      disabled={isLastChecked}
                      label={establishment?.nombre ?? establishmentId}
                      onChange={(nextChecked) => toggleBlockEstablishment(block, establishmentId, nextChecked)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ))}
      {!blocks.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Todavía no cargaste ningún horario. Agregá al menos uno para continuar.
        </p>
      ) : null}
      <Button type="button" variant="outline" onClick={addBlock}>
        <Plus />
        Agregar horario
      </Button>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-bold text-[var(--brand-ink)]">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--brand-primary)] [&_svg]:size-5">
          {icon}
        </span>
        <div className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-[var(--brand-border)] [&_input]:bg-[var(--brand-page)] [&_input]:pl-10">
          {children}
        </div>
      </div>
    </div>
  );
}
