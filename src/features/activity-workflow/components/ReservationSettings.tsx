"use client";

import { CalendarDays, CalendarRange, Clock3, Hourglass, Info, Repeat2, TimerReset } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActivityDraftPayload } from "../types/activity-draft.types";

const control = "h-12 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-11 font-medium text-[var(--brand-ink)]";
function IconControl({ label, icon: Icon, children }: { label: string; icon: typeof Clock3; children: React.ReactNode }) { return <div className="space-y-2"><Label className="font-bold text-[var(--brand-ink)]">{label}</Label><div className="relative"><Icon className="pointer-events-none absolute left-3.5 top-3.5 z-10 size-5 text-[var(--brand-primary)]" />{children}</div></div>; }

export function ReservationSettings({ payload, patch }: { payload: ActivityDraftPayload; patch: (value: Partial<ActivityDraftPayload>) => void }) {
  const usesTurns = ["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "");
  const example = usesTurns ? buildTurnExample(payload) : null;
  return <div className="space-y-6">
    <InfoCard><strong>Vigencia de la reserva:</strong> determina durante cuánto tiempo la persona conserva los días y turnos elegidos. No modifica la franja horaria diaria.</InfoCard>
    <div className="grid gap-5 sm:grid-cols-2">
      <IconControl label="Vigencia" icon={Repeat2}><Select value={payload.vigenciaReserva} onValueChange={(vigenciaReserva) => patch({ vigenciaReserva: vigenciaReserva as ActivityDraftPayload["vigenciaReserva"] })}><SelectTrigger className={control}><SelectValue placeholder="Seleccionar vigencia" /></SelectTrigger><SelectContent><SelectItem value="INDEFINIDA">Indefinida</SelectItem><SelectItem value="MENSUAL">Mensual</SelectItem><SelectItem value="PERIODO_DEFINIDO">Período definido</SelectItem><SelectItem value="UNICA">Única</SelectItem></SelectContent></Select></IconControl>
      {usesTurns ? <><IconControl label="Duración de cada turno reservable (minutos)" icon={Clock3}><Input className={control} type="number" min={15} step={15} value={payload.duracionTurnoMinutos ?? ""} onChange={(event) => patch({ duracionTurnoMinutos: event.target.value ? Number(event.target.value) : null })} /></IconControl><IconControl label="Intervalo entre turnos (minutos)" icon={TimerReset}><Input className={control} type="number" min={0} step={5} value={payload.intervaloTurnoMinutos} onChange={(event) => patch({ intervaloTurnoMinutos: Math.max(0, Number(event.target.value) || 0) })} /></IconControl></> : null}
      <IconControl label="Anticipación de reserva (días)" icon={Hourglass}><Input className={control} type="number" min={0} value={payload.anticipacionReservaDias} onChange={(event) => patch({ anticipacionReservaDias: Number(event.target.value) })} /></IconControl>
      <IconControl label="Cancelación justificada (horas)" icon={TimerReset}><Input className={control} type="number" min={0} value={payload.horasCancelacionJustificada} onChange={(event) => patch({ horasCancelacionJustificada: Number(event.target.value) })} /></IconControl>
    </div>
    {usesTurns ? <InfoCard><strong>Duración del turno:</strong> divide la franja definida en Horarios en bloques que una persona puede reservar.{example ? <span className="mt-1 block font-medium">{example}</span> : null}</InfoCard> : null}
    {payload.modalidadOperacion !== "ACCESO_LIBRE" ? <section className="border-t border-[var(--brand-border)] pt-5"><h3 className="font-extrabold text-[var(--brand-primary)]">Generación inicial de clases</h3><p className="mt-1 text-sm text-[var(--brand-muted)]">Define entre qué fechas se crearán las clases concretas del cronograma. No representa el horario diario.</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><IconControl label="Desde *" icon={CalendarDays}><Input className={control} type="date" value={payload.generacionClasesDesde ?? ""} onChange={(event) => patch({ generacionClasesDesde: event.target.value || null })} /></IconControl><IconControl label="Hasta *" icon={CalendarRange}><Input className={control} type="date" min={payload.generacionClasesDesde ?? undefined} value={payload.generacionClasesHasta ?? ""} onChange={(event) => patch({ generacionClasesHasta: event.target.value || null })} /></IconControl></div></section> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La modalidad de acceso libre no necesita generar clases ni turnos reservables.</p>}
  </div>;
}

function InfoCard({ children }: { children: React.ReactNode }) { return <div className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-panel)] p-4 text-sm text-[var(--brand-text)]"><Info className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]" /><span>{children}</span></div>; }
function buildTurnExample(payload: ActivityDraftPayload) { const schedule = payload.schedules[0], duration = payload.duracionTurnoMinutos; if (!schedule || !duration) return null; const gap = payload.intervaloTurnoMinutos || 0, start = toMinutes(schedule.horaInicio), end = toMinutes(schedule.horaFin), slots: string[] = []; for (let cursor = start; cursor + duration <= end && slots.length < 6; cursor += duration + gap) slots.push(`${toTime(cursor)}–${toTime(cursor + duration)}`); if (!slots.length) return "La duración elegida no entra dentro de la franja configurada."; return `Ejemplo para la franja ${schedule.horaInicio}–${schedule.horaFin}: ${slots.join(", ")}.`; }
function toMinutes(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function toTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
