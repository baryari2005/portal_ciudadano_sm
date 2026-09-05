"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, ClipboardCheck, MapPin, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCitizenData } from "./CitizenPrimitives";
import type { CitizenEnrollment } from "../types/citizen-enrollment.types";
import { EnrollmentBadge, formatCitizenEnrollmentScheduleSummary } from "./CitizenEnrollmentPrimitives";

export function CitizenEnrollmentsPage() {
  const router=useRouter();
  const {data,loading,error,retry}=useCitizenData<CitizenEnrollment[]>("/enrollments");
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  const items=useMemo(()=>data??[],[data]);
  const filtered=useMemo(()=>{const value=query.trim().toLowerCase();return items.filter(item=>(status==="all"||item.status===status)&&(!value||`${item.schedule.activity.nombre} ${item.schedule.establishment.nombre} ${item.schedule.day}`.toLowerCase().includes(value)));},[items,query,status]);

  if(loading)return <CatalogLoadingState label="inscripciones" fullPage/>;
  const filters=[{id:"enrollment-status",title:"Estado",value:status,options:[{value:"all",label:"Todas"},{value:"CONFIRMADA",label:"Confirmadas"},{value:"PENDIENTE",label:"Pendientes"},{value:"LISTA_ESPERA",label:"Lista de espera"},{value:"CANCELADA",label:"Canceladas"},{value:"RECHAZADA",label:"Rechazadas"},{value:"BAJA",label:"Bajas"}],onChange:setStatus}];

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] lg:p-8">
    <section className="lg:hidden"><header className="px-4 pb-4 pt-5"><h1 className="text-2xl font-extrabold text-[var(--brand-primary)]">Mis inscripciones</h1><p className="mt-1 text-xs text-[var(--brand-muted)]">Consultá tus actividades e inscripciones actuales.</p></header>{error?<ErrorState onRetry={retry}/>:<><div className="px-4"><div className="relative"><CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar actividad o establecimiento..."/><div className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2"><CatalogFilterPopover trigger={<Button type="button" variant="ghost" size="icon" aria-label="Abrir filtros" className="size-10 rounded-lg text-[var(--brand-primary)] hover:bg-[var(--brand-panel)]"><SlidersHorizontal className="size-5"/></Button>} sections={filters}/></div></div></div><div className="grid gap-3 p-4">{filtered.map(item=><EnrollmentListCard key={item.id} item={item} onClick={()=>router.push(`/citizen/enrollments/${item.id}`)}/>)}{!filtered.length?<CatalogEmptyState title="No hay inscripciones" description={items.length?"No encontramos resultados para los filtros elegidos.":"Tus inscripciones aparecerán en este listado."} filtered={Boolean(items.length)}/>:null}</div></>}</section>
    <section className="hidden lg:block"><CatalogPageHeader title="Mis inscripciones" description="Consultá tus actividades, horarios, documentación y posiciones en lista de espera." total={items.length}/>{error?<ErrorState onRetry={retry}/>:<div className="mt-6"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por actividad, sede o día..."/><CatalogFilterPopover sections={filters}/></div><div className="mt-4 grid content-start gap-3 xl:grid-cols-2">{filtered.map(item=><EnrollmentListCard key={item.id} item={item} onClick={()=>router.push(`/citizen/enrollments/${item.id}`)}/>)}{!filtered.length?<CatalogEmptyState title="No hay inscripciones registradas." description="Tus inscripciones aparecerán en este listado." filtered={Boolean(query.trim())||status!=="all"}/>:null}</div></div>}</section>
  </main>;
}

function EnrollmentListCard({item,onClick}:{item:CitizenEnrollment;onClick:()=>void}){return <button type="button" onClick={onClick} className="grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-3 text-left shadow-sm transition hover:border-[var(--brand-secondary)]"><span>{item.schedule.activity.imageUrl?<ActivityImagePreview source={item.schedule.activity.imageUrl} alt={`Imagen de ${item.schedule.activity.nombre}`} className="size-14 shrink-0 !rounded-full !border-0"/>:<span className="grid size-14 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><ClipboardCheck className="size-6"/></span>}</span><span className="min-w-0"><span className="flex items-start gap-2"><strong className="line-clamp-2 flex-1 text-sm text-[var(--brand-primary)]">{item.schedule.activity.nombre}</strong><EnrollmentBadge status={item.status}/></span><span className="mt-1 block text-[10px] leading-4 text-[var(--brand-muted)]"><CalendarClock className="mr-1 inline size-3"/>{formatCitizenEnrollmentScheduleSummary(item)}</span><span className="block truncate text-[10px] leading-4 text-[var(--brand-muted)]"><MapPin className="mr-1 inline size-3"/>{item.schedule.establishment.nombre}</span></span><ChevronRight className="size-4 text-[var(--brand-secondary)]"/></button>}

function ErrorState({onRetry}:{onRetry:()=>void|Promise<unknown>}){return <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 lg:mx-0">No pudimos cargar tus inscripciones.<Button variant="ghost" onClick={()=>void onRetry()}>Reintentar</Button></div>}
