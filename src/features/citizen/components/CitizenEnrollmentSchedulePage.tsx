"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, CheckCircle2, FileText, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { AdminFormCard, AdminFormField, adminControlClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CatalogErrorState, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { axiosInstance } from "@/lib/axios";
import { citizenGet, citizenPatch, citizenPost } from "../services/citizen.service";

type Schedule = { id:string;day:string;startTime:string;endTime:string;slotDurationMinutes:number|null;slotGapMinutes:number;establishment:{name:string}|null;professors:string[] };
type Activity = { id:string;name:string;schedules:Schedule[] };
type Choice = { schedule:Schedule;startTime:string;endTime:string };
type Enrollment = { id:string;observations?:string|null;schedule:{activity:{id:string;nombre:string}};selectedSchedules:Array<{id:string;startTime:string;endTime:string}> };
type Availability = { activityScheduleId:string;startTime:string;endTime:string;available:number;status:"DISPONIBLE"|"LISTA_ESPERA"|"SIN_CUPO" };

const days=["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
const labels:Record<string,string>={LUNES:"Lunes",MARTES:"Martes",MIERCOLES:"Miércoles",JUEVES:"Jueves",VIERNES:"Viernes",SABADO:"Sábado",DOMINGO:"Domingo"};
const key=(choice:Choice)=>`${choice.schedule.id}-${choice.startTime}-${choice.endTime}`;

export function CitizenEnrollmentSchedulePage({ enrollmentId, mode="citizen", returnHref }: { enrollmentId:string;mode?:"citizen"|"admin";returnHref?:string }) {
  const router=useRouter();
  const [activity,setActivity]=useState<Activity|null>(null);
  const [activityName,setActivityName]=useState("");
  const [participantName,setParticipantName]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
  const [originalKeys,setOriginalKeys]=useState<string[]>([]);
  const [availability,setAvailability]=useState<Availability[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [saving,setSaving]=useState(false);
  const [checkingChoiceKey,setCheckingChoiceKey]=useState<string|null>(null);
  const [choiceConflict,setChoiceConflict]=useState<{key:string;message:string}|null>(null);
  const [observations,setObservations]=useState("");
  const backHref=returnHref??(mode==="admin"?"/enrollments":"/citizen/enrollments");
  const choices=useMemo(()=>activity?.schedules.flatMap(buildChoices)??[],[activity]);
  const hasUnavailableSelection=availability.some(item=>item.status==="SIN_CUPO"&&selected.includes(`${item.activityScheduleId}-${item.startTime}-${item.endTime}`));

  useEffect(()=>{let active=true;async function load(){setLoading(true);setError(false);try{let enrollment:Enrollment,nextActivity:Activity;if(mode==="admin"){const response=await axiosInstance.get(`/enrollments/${enrollmentId}/schedule`);const raw=response.data.data.enrollment;enrollment={id:raw.id,observations:raw.observations,schedule:{activity:{id:raw.activitySchedule.activity.id,nombre:raw.activitySchedule.activity.name}},selectedSchedules:raw.selectedSchedules};nextActivity=response.data.data.activity;setParticipantName([raw.user.firstName,raw.user.lastName].filter(Boolean).join(" ")||raw.user.userId||"Ciudadano sin nombre");}else{const enrollments=await citizenGet<Enrollment[]>("/enrollments");const found=enrollments.find(item=>item.id===enrollmentId);if(!found)throw new Error("Inscripción no encontrada");enrollment=found;nextActivity=await citizenGet<Activity>(`/activities/${enrollment.schedule.activity.id}`);}if(!active)return;const currentKeys=enrollment.selectedSchedules.map(item=>`${item.id}-${item.startTime}-${item.endTime}`);setActivity(nextActivity);setActivityName(enrollment.schedule.activity.nombre);setSelected(currentKeys);setOriginalKeys(currentKeys);setObservations(enrollment.observations??"");}catch{if(active)setError(true);}finally{if(active)setLoading(false);}}void load();return()=>{active=false};},[enrollmentId,mode]);

  async function toggleChoice(choice:Choice){if(!activity)return;const choiceKey=key(choice),checked=selected.includes(choiceKey),next=checked?selected.filter(item=>item!==choiceKey):[...selected,choiceKey];setChoiceConflict(null);if(checked){setSelected(next);setAvailability(current=>current.filter(item=>`${item.activityScheduleId}-${item.startTime}-${item.endTime}`!==choiceKey));return;}const newChoices=choices.filter(item=>next.includes(key(item))&&!originalKeys.includes(key(item)));if(!newChoices.length){setSelected(next);return;}setCheckingChoiceKey(choiceKey);try{const payload={selections:newChoices.map(item=>({activityScheduleId:item.schedule.id,startTime:item.startTime,endTime:item.endTime}))};const result=mode==="admin"?(await axiosInstance.post(`/enrollments/${enrollmentId}/schedule`,payload)).data.data:await citizenPost<Availability[]>("/enrollments/availability",{activityId:activity.id,...payload});setAvailability(result);setSelected(next);}catch(caught){const message=getAxiosMessage(caught,"La persona ya tiene otra actividad en ese día y horario.");setChoiceConflict({key:choiceKey,message});toast.error(message);}finally{setCheckingChoiceKey(null);}}

  async function save(){if(!selected.length){toast.error("Seleccioná al menos un horario.");return;}setSaving(true);try{const selections=choices.filter(choice=>selected.includes(key(choice))).map(choice=>({activityScheduleId:choice.schedule.id,startTime:choice.startTime,endTime:choice.endTime}));if(mode==="admin")await axiosInstance.patch(`/enrollments/${enrollmentId}/schedule`,{selections,observations:observations.trim()||null});else await citizenPatch(`/enrollments/${enrollmentId}`,{selections});toast.success("Los horarios fueron actualizados.");router.replace(backHref);}catch(caught){toast.error(getAxiosMessage(caught,"No pudimos cambiar los horarios."));}finally{setSaving(false);}}

  if(loading)return <CatalogLoadingState label="horarios de la inscripción" fullPage/>;
  if(error||!activity)return <CatalogErrorState message="No pudimos cargar los horarios de la inscripción." onRetry={()=>window.location.reload()}/>;

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
    <AdminFormHeader
      icon={CalendarClock}
      title={`${mode==="admin"?"Editar inscripción":"Cambiar horarios"} – ${activityName}`}
      description={mode==="admin"?(
        <>
          Estás modificando los días y horarios de{" "}
          <strong className="font-extrabold text-[var(--brand-primary)]">{participantName}</strong>.
          {" "}Al guardar, la persona recibirá una notificación.
        </>
      ):"Elegí los nuevos días y turnos. Los horarios actuales se conservan hasta que confirmes el cambio."}
    />
    {mode==="admin"?<AdminFormCard className="mb-5" title="Información adicional" description="Registrá observaciones internas relevantes para el seguimiento."><AdminFormField label="Observaciones administrativas" icon={FileText} align="start"><Textarea value={observations} onChange={(event)=>setObservations(event.target.value)} className={`${adminControlClass} min-h-32 resize-y py-3`} placeholder="Ingresá una observación opcional..."/></AdminFormField></AdminFormCard>:null}
    <AdminFormCard title="Días y horarios disponibles" description="Podés seleccionar uno o varios turnos. Cada nuevo horario se valida antes de agregarlo." footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving||checkingChoiceKey!==null} onClick={()=>router.push(backHref)}>Cancelar</Button><Button type="button" disabled={saving||checkingChoiceKey!==null||!selected.length||hasUnavailableSelection} className="bg-[var(--brand-primary)] font-bold hover:bg-[#143A27]" onClick={()=>void save()}>{saving?<><Loader2 className="animate-spin"/>Guardando...</>:<><CheckCircle2/>Guardar cambios</>}</Button></div>}>
      <div className="grid gap-4">{days.map(day=>{const items=choices.filter(choice=>choice.schedule.day===day);if(!items.length)return null;return <section key={day} className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-page)] p-4"><h3 className="mb-3 flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><CalendarClock className="size-5 text-[var(--brand-secondary)]"/>{labels[day]}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(choice=>{const choiceKey=key(choice),checked=selected.includes(choiceKey),checking=checkingChoiceKey===choiceKey,conflict=choiceConflict?.key===choiceKey,disabled=saving||checkingChoiceKey!==null,cap=availability.find(item=>`${item.activityScheduleId}-${item.startTime}-${item.endTime}`===choiceKey),original=originalKeys.includes(choiceKey);return <label key={choiceKey} className={`flex items-start gap-3 rounded-xl border p-4 transition ${disabled?"cursor-not-allowed opacity-70":"cursor-pointer"} ${conflict?"border-red-500 bg-red-50 ring-1 ring-red-200":checked?"border-[var(--brand-primary)] bg-[#EEF6E9] shadow-sm ring-1 ring-[var(--brand-secondary)]":"border-[var(--brand-border)] bg-white hover:border-[var(--brand-secondary)]"}`}><Checkbox checked={checked} disabled={disabled} onCheckedChange={()=>void toggleChoice(choice)} className="mt-1"/><span className="min-w-0"><strong className={`block ${conflict?"text-red-800":"text-[var(--brand-primary)]"}`}>{choice.startTime} a {choice.endTime}</strong><small className="mt-1 flex items-center gap-1.5 text-[var(--brand-muted)]"><MapPin className="size-3.5"/>{choice.schedule.establishment?.name||"Sin establecimiento"}</small>{checking?<small className="mt-2 flex items-center gap-1.5 font-bold text-[var(--brand-secondary)]"><Loader2 className="size-4 animate-spin"/>Verificando disponibilidad...</small>:conflict?<small className="mt-2 flex items-start gap-1.5 font-bold leading-relaxed text-red-700"><AlertCircle className="mt-px size-4 shrink-0"/>{choiceConflict.message}</small>:<small className={`mt-2 block font-bold ${cap?.status==="SIN_CUPO"?"text-red-700":"text-[var(--brand-secondary)]"}`}>{original&&checked?"Horario actual":cap?cap.status==="DISPONIBLE"?`${cap.available} lugares disponibles`:cap.status==="LISTA_ESPERA"?"Sin cupo · pasa a espera":"Sin cupo":checked?"Horario seleccionado":"Marcá para verificar disponibilidad"}</small>}</span></label>})}</div></section>})}</div>
    </AdminFormCard>
  </main>;
}

function buildChoices(schedule:Schedule):Choice[]{const duration=schedule.slotDurationMinutes;if(!duration)return[{schedule,startTime:schedule.startTime,endTime:schedule.endTime}];const gap=schedule.slotGapMinutes||0,start=minutes(schedule.startTime),end=minutes(schedule.endTime),result:Choice[]=[];for(let cursor=start;cursor+duration<=end;cursor+=duration+gap)result.push({schedule,startTime:time(cursor),endTime:time(cursor+duration)});return result;}
function minutes(value:string){const[hour,minute]=value.split(":").map(Number);return hour*60+minute;}
function time(value:number){return`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;}
