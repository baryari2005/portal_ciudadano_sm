"use client";

import { useMemo } from "react";
import { CalendarDays, Clock3, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityDraftPayload } from "../types/activity-draft.types";

const days = [
  ["LUNES", "LUN", "Lunes"],
  ["MARTES", "MAR", "Martes"],
  ["MIERCOLES", "MIÉ", "Miércoles"],
  ["JUEVES", "JUE", "Jueves"],
  ["VIERNES", "VIE", "Viernes"],
  ["SABADO", "SÁB", "Sábado"],
  ["DOMINGO", "DOM", "Domingo"],
] as const;

export function WeeklySchedules({
  payload,
  patch,
}: {
  payload: ActivityDraftPayload;
  patch: (value: Partial<ActivityDraftPayload>) => void;
}) {
  const selected = useMemo(
    () => new Set(payload.schedules.map((item) => item.diaSemana)),
    [payload.schedules],
  );
  const start = payload.schedules[0]?.horaInicio ?? "10:00";
  const end = payload.schedules[0]?.horaFin ?? "13:00";

  function update(nextDays: string[], nextStart = start, nextEnd = end) {
    patch({
      schedules: nextDays.map((diaSemana) => {
        const current = payload.schedules.find(
          (item) => item.diaSemana === diaSemana,
        );
        return current
          ? { ...current, horaInicio: nextStart, horaFin: nextEnd }
          : {
              diaSemana:
                diaSemana as ActivityDraftPayload["schedules"][number]["diaSemana"],
              horaInicio: nextStart,
              horaFin: nextEnd,
              espacio: null,
              cupoMaximo: payload.cupo ?? 1,
              profesorIds: [],
              recursoIds: [],
            };
      }),
    });
  }

  function toggle(day: string, checked: boolean) {
    update(
      checked
        ? [...selected, day]
        : [...selected].filter((item) => item !== day),
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#DDE8D7] bg-[#F7FBF5] p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#DDE8D7] text-[#1D4F36]">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-[#1D4F36]">
              Días de la actividad
            </h3>
            <p className="text-sm text-[#5F6F68]">
              Marcá todos los días que comparten la misma franja horaria.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-7">
          {days.map(([value, shortLabel, fullLabel]) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 font-bold transition ${selected.has(value) ? "border-[#1D4F36] bg-[#DDEF8F] text-[#1D4F36]" : "border-[#C9D9C3] bg-white text-[#315644]"}`}
            >
              <Checkbox
                className="sr-only"
                checked={selected.has(value)}
                onCheckedChange={(checked) => toggle(value, checked === true)}
              />
              <span className="2xl:hidden">{shortLabel}</span>
              <span className="hidden 2xl:inline">{fullLabel}</span>
            </label>
          ))}
        </div>
      </section>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Hora de inicio de la franja" icon={<Clock3 />}>
          <Input
            type="time"
            value={start}
            onChange={(event) => update([...selected], event.target.value, end)}
          />
        </Field>
        <Field label="Hora de finalización de la franja" icon={<Clock3 />}>
          <Input
            type="time"
            min={start}
            value={end}
            onChange={(event) =>
              update([...selected], start, event.target.value)
            }
          />
        </Field>
      </div>
      {selected.size ? (
        <p
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-medium ${end > start ? "border-[#C9D9C3] bg-[#EEF6E9] text-[#315644]" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          <Info className="mt-0.5 size-5 shrink-0" />
          <span>
            {end > start ? (
              <>
                La actividad estará disponible los días seleccionados de{" "}
                <strong>
                  {start} a {end}
                </strong>
                . Esta es la franja general; en el paso Reservas definirás
                cuánto dura cada turno dentro de ella.
              </>
            ) : (
              "La hora de finalización debe ser posterior a la hora de inicio."
            )}
          </span>
        </p>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Seleccioná al menos un día para continuar.
        </p>
      )}
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
      <Label className="font-bold text-[#173C2A]">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#1D4F36] [&_svg]:size-5">
          {icon}
        </span>
        <div className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-[#C9D9C3] [&_input]:bg-[#F7FBF5] [&_input]:pl-10">
          {children}
        </div>
      </div>
    </div>
  );
}
