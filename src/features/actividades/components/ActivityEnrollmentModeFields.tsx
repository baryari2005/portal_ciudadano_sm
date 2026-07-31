"use client";

import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ActividadPayload } from "../types/actividad.types";

const modes = [
  ["HORARIO_FIJO", "Horario fijo", "Días y horas preestablecidos; el lugar se conserva."],
  ["TURNO_RECURRENTE", "Turno recurrente", "La persona elige uno o más turnos que se repiten."],
  ["TURNO_PUNTUAL", "Turno puntual", "Cada fecha y franja horaria se reserva por separado."],
  ["ACCESO_LIBRE", "Acceso libre", "Puede ingresar dentro del horario sin reserva previa."],
  ["EVENTO_UNICO", "Evento único", "Una única fecha y horario con cupo propio."],
  ["CURSO_PERIODO", "Curso con período", "Inscripción válida entre una fecha inicial y final."],
] as const;

export function ActivityEnrollmentModeFields({ value, onChange }: { value: ActividadPayload; onChange: (value: Partial<ActividadPayload>) => void }) {
  const usesSlots = value.modalidadOperacion === "TURNO_RECURRENTE" || value.modalidadOperacion === "TURNO_PUNTUAL";
  const usesReservation = value.modalidadOperacion !== "ACCESO_LIBRE";
  return <section className="rounded-2xl border border-[#C9D9C3] bg-[#F7FBF5] p-5">
    <div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-5 text-[#819B56]" /><div className="flex-1">
      <h3 className="font-extrabold text-[#1D4F36]">Modalidad y reservas</h3>
      <p className="mt-1 text-xs text-[#315644]/75">Define cómo se ofrece la actividad, cuánto dura el lugar y cómo se renueva el cupo.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Modalidad"><Select value={value.modalidadOperacion} onValueChange={(mode) => { const modalidadOperacion = mode as ActividadPayload["modalidadOperacion"]; const modalidadInscripcion = mode === "TURNO_PUNTUAL" || mode === "EVENTO_UNICO" ? "POR_CLASE" : mode === "CURSO_PERIODO" ? "POR_PERIODO" : "PERMANENTE"; onChange({ modalidadOperacion, modalidadInscripcion, requiereReserva: mode !== "ACCESO_LIBRE", vigenciaReserva: mode === "EVENTO_UNICO" || mode === "TURNO_PUNTUAL" ? "UNICA" : mode === "CURSO_PERIODO" ? "PERIODO_DEFINIDO" : value.vigenciaReserva }); }}><SelectTrigger className="h-11 rounded-xl border-[#C9D9C3] bg-white"><SelectValue /></SelectTrigger><SelectContent>{modes.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-[#5F6F68]">{modes.find(([key]) => key === value.modalidadOperacion)?.[2]}</p></Field>
        {usesReservation ? <Field label="Vigencia del lugar"><Select value={value.vigenciaReserva} onValueChange={(vigenciaReserva) => onChange({ vigenciaReserva: vigenciaReserva as ActividadPayload["vigenciaReserva"] })}><SelectTrigger className="h-11 rounded-xl border-[#C9D9C3] bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INDEFINIDA">Hasta que se dé de baja</SelectItem><SelectItem value="MENSUAL">Mensual</SelectItem><SelectItem value="PERIODO_DEFINIDO">Período definido</SelectItem><SelectItem value="UNICA">Una sola fecha o turno</SelectItem></SelectContent></Select></Field> : null}
        {usesSlots ? <><Field label="Duración del turno (minutos)"><Input type="number" min={15} step={15} value={value.duracionTurnoMinutos ?? ""} onChange={(e) => onChange({ duracionTurnoMinutos: e.target.value ? Number(e.target.value) : null })} className="h-11 bg-white" /></Field><Field label="Intervalo entre turnos (minutos)"><Input type="number" min={0} value={value.intervaloTurnoMinutos} onChange={(e) => onChange({ intervaloTurnoMinutos: Number(e.target.value) })} className="h-11 bg-white" /></Field></> : null}
        {usesReservation ? <><Field label="Anticipación máxima (días)"><Input type="number" min={0} value={value.anticipacionReservaDias} onChange={(e) => onChange({ anticipacionReservaDias: Number(e.target.value) })} className="h-11 bg-white" /></Field><Field label="Límite de reservas por persona"><Input type="number" min={1} placeholder="Sin límite" value={value.limiteReservasPorUsuario ?? ""} onChange={(e) => onChange({ limiteReservasPorUsuario: e.target.value ? Number(e.target.value) : null })} className="h-11 bg-white" /></Field><Field label="Horas para cancelación justificada"><Input type="number" min={0} max={168} value={value.horasCancelacionJustificada} onChange={(e) => onChange({ horasCancelacionJustificada: Number(e.target.value) })} className="h-11 bg-white" /></Field></> : null}
        <div className="flex items-center justify-between rounded-xl border border-[#C9D9C3] bg-white p-4"><Label>Requiere reserva previa</Label><Switch checked={value.requiereReserva} disabled={value.modalidadOperacion === "ACCESO_LIBRE"} onCheckedChange={(requiereReserva) => onChange({ requiereReserva })} /></div>
      </div>
    </div></div>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="font-extrabold">{label}</Label>{children}</div>; }
