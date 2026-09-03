"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardCheck, FileCheck2, MapPin, Pencil, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { CatalogDetailField, CatalogErrorState, CatalogLoadingState, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { DocumentationStatusBadge } from "@/features/enrollment-documents/components/DocumentationStatusBadge";
import { DOCUMENTATION_STATUS } from "@/features/enrollment-documents/helpers/documentation-status";
import { citizenDelete } from "../services/citizen.service";
import type { CitizenEnrollment } from "../types/citizen-enrollment.types";
import { EnrollmentBadge, formatCitizenEnrollmentScheduleSummary } from "./CitizenEnrollmentPrimitives";
import { useCitizenData } from "./CitizenPrimitives";
import { useMemo, useState } from "react";

export function CitizenEnrollmentDetailPage({enrollmentId}:{enrollmentId:string}){
  const router=useRouter();
  const {data,loading,error,retry}=useCitizenData<CitizenEnrollment[]>("/enrollments");
  const [cancelOpen,setCancelOpen]=useState(false);
  const [cancelling,setCancelling]=useState(false);
  const item=useMemo(()=>data?.find(current=>current.id===enrollmentId)??null,[data,enrollmentId]);
  if(loading)return <CatalogLoadingState label="detalle de la inscripción" fullPage/>;
  if(error||!item)return <CatalogErrorState message="No pudimos cargar la inscripción seleccionada." onRetry={retry}/>;
  const documentation=item.documentation?DOCUMENTATION_STATUS[item.documentation.status]:null;
  const documentationHref=item.documentation?.status==="PENDIENTE"?"/citizen/documents":`/citizen/enrollments/${item.id}/documents`;
  const cancellable=["CONFIRMADA","LISTA_ESPERA","PENDIENTE"].includes(item.status);
  const changeable=cancellable&&item.schedule.activity.modalidadOperacion==="TURNO_RECURRENTE";

  async function cancel(){setCancelling(true);try{await citizenDelete(`/enrollments/${enrollmentId}`,{reason:"Cancelada por el ciudadano"});toast.success("Inscripción cancelada.");router.replace("/citizen/enrollments");}catch{toast.error("No pudimos cancelar la inscripción.");setCancelling(false);setCancelOpen(false);}}

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 pb-[calc(var(--citizen-mobile-nav-h)+88px)] lg:p-8"><div className="mx-auto max-w-3xl"><div className="space-y-4"><section className="rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-5 shadow-sm sm:p-7"><header className="flex items-center gap-4">{item.schedule.activity.imageUrl?<ActivityImagePreview source={item.schedule.activity.imageUrl} alt={`Imagen de ${item.schedule.activity.nombre}`} className="size-20 shrink-0 !rounded-full !border-0"/>:<span className="grid size-20 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><ClipboardCheck className="size-9"/></span>}<div className="min-w-0"><EnrollmentBadge status={item.status}/><h1 className="mt-2 text-2xl font-extrabold text-[var(--brand-primary)]">{item.schedule.activity.nombre}</h1><p className="mt-1 text-xs text-[var(--brand-muted)]">Información completa de tu inscripción.</p></div></header></section><article className="rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-5 shadow-sm sm:p-7"><dl className="grid gap-3 sm:grid-cols-2"><CatalogDetailField icon={CalendarClock} label="Días y horarios">{formatCitizenEnrollmentScheduleSummary(item)}</CatalogDetailField><CatalogDetailField icon={MapPin} label="Establecimiento">{item.schedule.establishment.nombre}</CatalogDetailField><CatalogDetailField icon={ClipboardCheck} label="Fecha de inscripción">{formatCatalogDate(item.enrollmentDate)}</CatalogDetailField>{item.nextSession?<CatalogDetailField icon={CalendarClock} label="Próxima clase">{item.nextSession.date}</CatalogDetailField>:null}{item.waitlistPosition?<CatalogDetailField icon={UsersRound} label="Lista de espera">Posición {item.waitlistPosition}</CatalogDetailField>:null}</dl>{item.documentation?<section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><FileCheck2 className="size-5"/>Documentación</h2><DocumentationStatusBadge summary={item.documentation}/></div><p className="mt-3 text-sm text-[var(--brand-muted)]">{documentation?.description}</p>{documentation?.action?<Button asChild variant="outline" className="mt-4 h-10 rounded-xl border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)]"><Link href={documentationHref}>{documentation.action}</Link></Button>:null}</section>:null}<footer className="fixed inset-x-0 bottom-[var(--citizen-mobile-nav-h)] z-30 grid grid-cols-2 gap-3 rounded-t-3xl border-t border-[var(--brand-border-soft)] bg-white/95 p-4 shadow-[0_-8px_24px_rgba(29,79,54,0.10)] backdrop-blur lg:static lg:mt-6 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:bg-transparent lg:p-0 lg:pt-5 lg:shadow-none">{changeable?<Button type="button" variant="outline" onClick={()=>router.push(`/citizen/enrollments/${item.id}/schedule`)} className="h-8 rounded-lg border-[var(--brand-primary)] bg-transparent px-2 text-xs font-bold text-[var(--brand-primary)]"><Pencil/>Cambiar horarios</Button>:null}{cancellable?<Button type="button" variant="outline" onClick={()=>setCancelOpen(true)} className="h-8 rounded-lg border-red-300 bg-red-50 px-2 text-xs font-bold text-red-700 hover:bg-red-100 hover:text-red-800"><Trash2/>Cancelar inscripción</Button>:null}</footer></article></div></div><ConfirmDialog open={cancelOpen} title="¿Querés cancelar esta inscripción?" description="Tu lugar podrá asignarse a otra persona." confirmLabel={cancelling?"Cancelando...":"Cancelar inscripción"} icon={<Trash2/>} onConfirm={cancel} onClose={()=>!cancelling&&setCancelOpen(false)}/></main>;
}
