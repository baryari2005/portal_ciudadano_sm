"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { formatActividadLevel } from "@/features/actividades/helpers/actividad-display";
import { CatalogErrorState, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { citizenPost } from "../services/citizen.service";
import { CitizenCard, useCitizenData } from "./CitizenPrimitives";

type CitizenActivityRequirement = { id: string; name: string; type: "INFORMACION" | "DOCUMENTO" | "CONSENTIMIENTO" | "ELEMENTO_PERSONAL" | "CONDICION"; mandatory: boolean; requiresDocument: boolean; observations: string | null; instructions: string | null };
type CitizenActivitySchedule = { id: string; day: string; startTime: string; endTime: string; space: string | null; establishment: { name: string } | null; professors: string[]; availableCount: number; waitlistEnabled: boolean; ownEnrollmentStatus: string | null };
type CitizenActivityDetailData = { name: string; shortDescription: string | null; imageUrl: string | null; descripcion: string | null; category: string; level: "INICIAL" | "INTERMEDIO" | "AVANZADO" | null; enrollmentMode: "PERMANENTE" | "POR_PERIODO" | "POR_CLASE"; periodMonths: number | null; free: boolean; price: string | null; requirements: CitizenActivityRequirement[]; requiresDocumentation: boolean; schedules: CitizenActivitySchedule[] };
type CitizenEnrollmentResult = { status: string };

export function CitizenActivityDetail({ id }: { id: string }) {
  const { data, loading, error, retry } = useCitizenData<CitizenActivityDetailData>(`/activities/${id}`);
  const [scheduleToEnroll, setScheduleToEnroll] = useState<CitizenActivitySchedule | null>(null);
  const [levelConsent, setLevelConsent] = useState(false);
  const [requirementsConsent, setRequirementsConsent] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  async function enroll() {
    if (!scheduleToEnroll || !levelConsent || (data?.requirements.some((item) => item.mandatory && ["ELEMENTO_PERSONAL", "CONDICION"].includes(item.type)) && !requirementsConsent)) return;
    setEnrolling(true);
    try {
      const result = await citizenPost<CitizenEnrollmentResult>("/enrollments", { activityScheduleId: scheduleToEnroll.id, nivelConsentido: true });
      toast.success(result.status === "PENDIENTE" ? "Tu inscripción quedó pendiente hasta aprobar la documentación requerida." : result.status === "LISTA_ESPERA" ? "Ingresaste a la lista de espera." : data?.enrollmentMode === "POR_CLASE" ? "Ya podés reservar fechas desde Próximas clases." : "Tu inscripción fue confirmada.");
      setScheduleToEnroll(null);
      setLevelConsent(false);
      setRequirementsConsent(false);
      await retry();
    } catch (caught) {
      toast.error(getAxiosMessage(caught, "No pudimos completar la inscripción."));
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) return <CatalogLoadingState label="actividad" fullPage />;
  if (error || !data) return <CatalogErrorState message="No pudimos cargar la información de la actividad." onRetry={retry} />;

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <header className="flex items-start gap-4">
        <ActivityImagePreview source={data.imageUrl} alt={`Imagen de ${data.name}`} className="size-20 shrink-0 rounded-2xl sm:size-24" />
        <div className="min-w-0 pt-1"><h1 className="break-words text-3xl font-bold tracking-tight text-[#1D4F36] sm:text-4xl">{data.name}</h1><p className="mt-2 max-w-2xl text-sm text-[#315644]/80 sm:text-base">{data.shortDescription || "Información y horarios disponibles."}</p></div>
      </header>
      <div className="mt-6">
        <>
        <CitizenCard><p>{data.descripcion}</p><p className="mt-3 text-sm">{data.category} · {data.free ? "Gratuita" : `$${data.price}`} · Nivel {formatActividadLevel(data.level)}</p><p className="mt-3 rounded-xl bg-[#EEF6E9] p-3 text-sm font-bold text-[#1D4F36]">{data.enrollmentMode === "PERMANENTE" ? "La inscripción conserva tu lugar en este horario hasta que solicites la baja." : data.enrollmentMode === "POR_PERIODO" ? `La inscripción tiene una vigencia de ${data.periodMonths ?? 1} ${data.periodMonths === 1 ? "mes" : "meses"}.` : "La inscripción habilita el acceso; después reservás cada fecha o turno desde Próximas clases."}</p></CitizenCard>
        <h2 className="mt-6 text-xl font-extrabold text-[#1D4F36]">Requisitos para inscribirte</h2>
        <CitizenCard>
          {data.requirements.length ? <div className="grid gap-4">{data.requirements.map((item) => <div key={item.id} className="border-b border-[#DDE8D7] pb-3 last:border-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#1D4F36]">{item.name}</p><Badge variant="outline">{item.mandatory ? "Obligatorio" : "Recomendado"}</Badge>{item.requiresDocument ? <Badge variant="secondary">Documento aprobado</Badge> : null}{item.type === "ELEMENTO_PERSONAL" ? <Badge className="bg-[#DDEBCF] text-[#1D4F36] hover:bg-[#DDEBCF]">Debés llevarlo</Badge> : null}{item.type === "CONDICION" ? <Badge variant="secondary">Condición de participación</Badge> : null}</div><p className="mt-1 text-sm text-[#5F6F68]">{item.observations || item.instructions || "Sin instrucciones adicionales."}</p></div>)}</div> : <p>Esta actividad no tiene requisitos adicionales.</p>}
          {data.requiresDocumentation ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Podés inscribirte aunque falte documentación, pero quedará pendiente y no podrás realizar la actividad hasta que todos los documentos obligatorios estén aprobados.</p> : null}
        </CitizenCard>
        <h2 className="mt-6 text-xl font-extrabold text-[#1D4F36]">Horarios disponibles</h2>
        <div className="mt-3 grid gap-3">{data.schedules.map((schedule) => <CitizenCard key={schedule.id}><p className="font-bold">{schedule.day} · {schedule.startTime} a {schedule.endTime}</p><p className="break-words text-sm">Lugar: {schedule.space || "Sin asignar"}</p><p className="break-words text-sm">Establecimiento: {schedule.establishment?.name || "Sin asignar"}</p><p className="break-words text-sm">Profesor: {schedule.professors.join(", ") || "Sin asignar"}</p><p className="text-sm">{schedule.availableCount} lugares disponibles</p><Button className="mt-3" disabled={Boolean(schedule.ownEnrollmentStatus) || (!schedule.availableCount && !schedule.waitlistEnabled)} onClick={() => { setLevelConsent(false); setScheduleToEnroll(schedule); }}>{schedule.ownEnrollmentStatus ? "Ya estás inscripto" : schedule.availableCount ? "Inscribirme" : "Unirme a lista de espera"}</Button></CitizenCard>)}</div>
      </>
      </div>

    <Dialog open={Boolean(scheduleToEnroll)} onOpenChange={(open) => { if (!open && !enrolling) { setScheduleToEnroll(null); setLevelConsent(false); } }}>
      <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md">
        <DialogHeader className="border-b border-[#E4E9E3] bg-[#F7FAF3] px-6 py-5 text-left"><DialogTitle className="text-xl font-extrabold text-[#1D4F36]">{data?.enrollmentMode === "POR_CLASE" ? "Habilitar reservas" : "Confirmar inscripción"}</DialogTitle><DialogDescription>{data?.enrollmentMode === "POR_CLASE" ? "Luego podrás elegir cada clase o turno disponible." : "Revisá el nivel informado antes de continuar."}</DialogDescription></DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div className="rounded-2xl border border-[#C9D9C3] bg-[#EEF6E9] p-4"><p className="text-xs font-extrabold uppercase text-[#819B56]">Nivel de la actividad</p><p className="mt-1 text-lg font-extrabold text-[#1D4F36]">{formatActividadLevel(data?.level ?? null)}</p><p className="mt-2 text-sm text-[#315644]">Este nivel es informativo y quedará registrado con tu consentimiento.</p></div>
          {data?.requiresDocumentation ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Sin toda la documentación obligatoria aprobada, la inscripción quedará pendiente.</p> : null}
          {data?.requirements.some((item) => item.mandatory && ["ELEMENTO_PERSONAL", "CONDICION"].includes(item.type)) ? <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DDE8D7] p-4 text-sm font-medium text-[#173C2A]"><Checkbox checked={requirementsConsent} onCheckedChange={(checked) => setRequirementsConsent(checked === true)} className="mt-0.5" /><span>Confirmo que conozco los elementos y condiciones obligatorias para participar.</span></label> : null}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DDE8D7] p-4 text-sm font-medium text-[#173C2A]"><Checkbox checked={levelConsent} onCheckedChange={(checked) => setLevelConsent(checked === true)} className="mt-0.5" /><span>Confirmo que fui informado sobre el nivel <strong>{formatActividadLevel(data?.level ?? null)}</strong> de esta actividad.</span></label>
        </div>
        <DialogFooter className="border-t border-[#E4E9E3] bg-[#F7FAF3] px-6 py-4"><Button variant="outline" disabled={enrolling} onClick={() => setScheduleToEnroll(null)}>Cancelar</Button><Button disabled={!levelConsent || Boolean(data?.requirements.some((item) => item.mandatory && ["ELEMENTO_PERSONAL", "CONDICION"].includes(item.type)) && !requirementsConsent) || enrolling} aria-busy={enrolling} className="bg-[#1D4F36] hover:bg-[#143A27]" onClick={() => void enroll()}>{enrolling ? <><Loader2 className="animate-spin" />Inscribiendo...</> : "Confirmar inscripción"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
