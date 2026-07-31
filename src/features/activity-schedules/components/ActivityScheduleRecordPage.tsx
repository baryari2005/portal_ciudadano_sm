"use client";
import { useEffect, useState } from "react";
import { Boxes, Building2, CalendarClock, ClipboardCheck, Info, UsersRound } from "lucide-react";
import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ActivitySessionSummary } from "@/features/activity-sessions/components/ActivitySessionSummary";
import { EnrollmentSummary } from "@/features/enrollments/components/EnrollmentSummary";
import { getActivityScheduleClient } from "../services/activity-schedules.service";
import { dayLabel, statusLabel } from "../helpers/activity-schedule-display";
import type { ActivitySchedule } from "../types/activity-schedule.types";
import type { ActivityScheduleRecordSection } from "../constants/activity-schedule-record-sections";

const sections = [{ id:"overview", label:"Resumen", icon:Info },{ id:"assignments", label:"Profesores y recursos", icon:Boxes },{ id:"sessions", label:"Clases", icon:ClipboardCheck },{ id:"enrollments", label:"Inscripciones", icon:UsersRound }] as const;

export function ActivityScheduleRecordPage({ scheduleId, section }: { scheduleId:string; section:ActivityScheduleRecordSection }) {
  const [item,setItem]=useState<ActivitySchedule|null>(null),[loading,setLoading]=useState(true),[sectionLoading,setSectionLoading]=useState(["sessions","enrollments"].includes(section)),[active,setActive]=useState(section);
  useEffect(()=>{void getActivityScheduleClient(scheduleId).then(setItem).finally(()=>setLoading(false));},[scheduleId]);
  function select(next:ActivityScheduleRecordSection){if(next===active)return;setSectionLoading(["sessions","enrollments"].includes(next));window.history.pushState(null,"",`/activity-schedules/${scheduleId}/record/${next}`);setActive(next);}
  return <AdminRecordLayout title="Ficha completa del horario" description={item?`${item.activity.name} · ${dayLabel(item.day)} de ${item.startTime} a ${item.endTime}`:"Consultá la programación y su información operativa."} icon={CalendarClock} backHref="/activity-schedules" sections={sections} activeSection={active} onSectionChange={select} navigationDisabled={loading} loading={loading||sectionLoading} loadingLabel="información del horario">{item?<RecordContent item={item} section={active} onLoadingChange={setSectionLoading}/>:loading?null:<p>No pudimos cargar el horario.</p>}</AdminRecordLayout>;
}
function RecordContent({item,section,onLoadingChange}:{item:ActivitySchedule;section:ActivityScheduleRecordSection;onLoadingChange:(value:boolean)=>void}){
  if(section==="sessions")return <Panel title="Clases programadas" icon={ClipboardCheck} description="Consultá las fechas concretas generadas desde este horario."><ActivitySessionSummary activityScheduleId={item.id} embedded onLoadingChange={onLoadingChange}/></Panel>;
  if(section==="enrollments")return <Panel title="Inscripciones" icon={UsersRound} description="Consultá las personas vinculadas y la ocupación del cupo."><EnrollmentSummary activityScheduleId={item.id} embedded onLoadingChange={onLoadingChange}/></Panel>;
  if(section==="assignments")return <Panel title="Profesores y recursos" icon={Boxes} description="Revisá las asignaciones operativas del horario."><dl className="grid gap-3"><CatalogDetailField icon={UsersRound} label="Profesores">{item.professors.map((entry)=>`${entry.fullName}${entry.isPrimary?" (principal)":""}`).join(", ")||"Sin profesores asignados"}</CatalogDetailField><CatalogDetailField icon={Boxes} label="Recursos físicos">{item.resources.map((entry)=>`${entry.name} · ${entry.quantity} unidad(es)`).join(", ")||"Sin recursos asignados"}</CatalogDetailField><CatalogDetailField icon={UsersRound} label="Lista de espera">{item.waitingListEnabled?"Habilitada":"Deshabilitada"}</CatalogDetailField><CatalogDetailField icon={UsersRound} label="Sobrecupo">{item.overbookingEnabled?`${item.overbookingLimit??0} lugares adicionales`:"Deshabilitado"}</CatalogDetailField></dl></Panel>;
  return <Panel title="Resumen" icon={Info} description="Consultá la definición principal y el estado operativo."><dl className="grid gap-3"><CatalogDetailField icon={CalendarClock} label="Actividad">{item.activity.name}</CatalogDetailField><CatalogDetailField icon={CalendarClock} label="Día y franja">{dayLabel(item.day)} · {item.startTime} a {item.endTime}</CatalogDetailField><CatalogDetailField icon={Building2} label="Establecimiento">{item.establishment.name} · {item.establishment.address}</CatalogDetailField><CatalogDetailField icon={Building2} label="Espacio">{item.space||"Sin informar"}</CatalogDetailField><CatalogDetailField icon={UsersRound} label="Cupo máximo">{item.maxCapacity}</CatalogDetailField><CatalogDetailField icon={Info} label="Estado">{statusLabel(item.status)}</CatalogDetailField><CatalogDetailField icon={Info} label="Observaciones">{item.notes||"Sin observaciones"}</CatalogDetailField></dl></Panel>;
}
function Panel({title,icon,description,children}:{title:string;icon:typeof Info;description:string;children:React.ReactNode}){return <AdminRecordSectionContent title={title} icon={icon} description={description}>{children}</AdminRecordSectionContent>;}
