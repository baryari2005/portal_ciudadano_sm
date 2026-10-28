"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManualAccessDecisionControls } from "./ManualAccessDecisionControls";
import { AdminFormCard } from "@/components/shared/admin-patterns";
import { CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ReceptionMobileHeader } from "@/features/reception/components/mobile/ReceptionMobileHeader";
import { cn } from "@/lib/utils";
import { useAccessEstablishment } from "../hooks/useAccessEstablishment";
import { registerManualAccess, searchAccessPeople } from "../services/access.service";
import type { AccessPerson, AccessValidationResponse } from "../types/access.types";
import { AccessPersonCard } from "./AccessPersonCard";
import { AccessResultCard } from "./AccessResultCard";
import { AccessShell } from "./AccessShell";
type SearchPerson = AccessPerson & { validation: AccessValidationResponse };

export function AccessManualPage() {
  const establishment=useAccessEstablishment();
  return <Manual establishment={establishment}/>;
}

function Manual({establishment}:{establishment:ReturnType<typeof useAccessEstablishment>}) {
  const {establishmentId}=establishment;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchPerson[]>([]);
  const [selected, setSelected] = useState<SearchPerson | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [observation, setObservation] = useState("");
  const [result, setResult] = useState<AccessValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const q = query.trim();
    setItems([]);
    setSelected(null);
    setLoading(false);
    if (!establishmentId || q.length < 2) return;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      void searchAccessPeople(establishmentId, q)
        .then((response) => {
          if (!active) return;
          setItems(response.data);
          setSelected(response.data[0] ?? null);
        })
        .catch(() => {
          if (active) toast.error("No pudimos buscar personas. Intentá nuevamente.");
        })
        .finally(() => { if (active) setLoading(false); });
    }, 350);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [establishmentId, query]);
  async function register(decision: "ALLOW" | "REJECT") { if (!selected || observation.trim().length < 5) return; setLoading(true); try { setResult(await registerManualAccess({ establishmentId, userId: selected.id, decision, observation })); } finally { setLoading(false); } }
  function reset(){setResult(null);setObservation("");setMobileDetail(false)}
  const unavailable=<div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[var(--brand-border)] bg-white px-5 text-center text-sm font-semibold text-[var(--brand-text)]/70">Seleccioná un establecimiento para buscar.</div>;
  return <><div className="md:hidden"><ReceptionMobileHeader/>{establishment.loading?<div className="p-4"><div className="h-64 animate-pulse rounded-3xl bg-[var(--brand-panel)]"/></div>:!establishmentId?<div className="p-4">{unavailable}</div>:result?<MobileManualResult result={result} onReset={reset}/>:mobileDetail&&selected?<MobileManualValidation person={selected} observation={observation} loading={loading} onObservation={setObservation} onBack={()=>setMobileDetail(false)} onRegister={register}/>:<MobileManualSearch query={query} items={items} loading={loading} onQuery={setQuery} onSelect={(person)=>{setSelected(person);setMobileDetail(true)}}/>}</div><div className="hidden md:block"><AccessShell title="Búsqueda manual" description="Buscá por DNI, nombre, apellido, email o identificador." stateOverride={establishment}>{()=>!establishmentId?unavailable:result?<div className="grid gap-4"><AccessResultCard result={result}/><Button className="h-11 w-fit rounded-xl border-[var(--brand-primary)] font-bold text-[var(--brand-primary)]" variant="outline" onClick={reset}>Nueva búsqueda</Button></div>:<DesktopManual query={query} items={items} selected={selected} observation={observation} loading={loading} onQuery={setQuery} onSelect={setSelected} onObservation={setObservation} onRegister={register}/>}</AccessShell></div></>;
}

function MobileManualSearch({query,items,loading,onQuery,onSelect}:{query:string;items:SearchPerson[];loading:boolean;onQuery:(value:string)=>void;onSelect:(person:SearchPerson)=>void}){
  const searched=query.trim().length>=2;
  return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-5"><header className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><Search className="size-6"/></span><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Búsqueda manual</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Buscá por DNI, nombre, apellido, email o identificador.</p></div></header><div className="relative mt-5"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--brand-primary)]"/><Input value={query} onChange={(event)=>onQuery(event.target.value)} placeholder="Buscar por DNI, nombre, apellido o email..." className="h-12 rounded-2xl border-[var(--brand-secondary)]/35 bg-white pl-12"/></div><section className="mt-4 grid gap-3">{loading&&!items.length?<div className="h-32 animate-pulse rounded-2xl bg-[var(--brand-panel)]"/>:items.length?items.map((item)=><button key={item.id} type="button" onClick={()=>onSelect(item)} className="min-w-0 w-full rounded-3xl text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"><AccessPersonCard person={item} mobile /></button>):<div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-white/70 p-5 text-center text-sm text-[var(--brand-muted)]">{searched?"No se encontraron personas.":"Ingresá al menos dos caracteres para comenzar la búsqueda."}</div>}</section></main>;
}

function MobileManualValidation({person,observation,loading,onObservation,onBack,onRegister}:{person:SearchPerson;observation:string;loading:boolean;onObservation:(value:string)=>void;onBack:()=>void;onRegister:(decision:"ALLOW"|"REJECT")=>Promise<void>}){
  const valid=person.validation.allowed;
  const showValidation = valid || !["SIN_INSCRIPCION", "INSCRIPCION_NO_CONFIRMADA", "SIN_CLASE_HABILITADA", "FUERA_DE_HORARIO", "CLASE_SUSPENDIDA", "CLASE_CANCELADA", "ESTABLECIMIENTO_INCORRECTO"].includes(person.validation.reason);
  return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4"><header className="flex items-center gap-3 border-b border-[var(--brand-border-soft)] pb-4"><button type="button" onClick={onBack} className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--brand-primary)]" aria-label="Volver a resultados"><ArrowLeft/></button><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Validación manual</h1><p className="text-sm text-[var(--brand-muted)]">Persona identificada</p></div></header><div className="mt-4"><AccessPersonCard person={person} mobile showPhone /></div>{showValidation ? <section className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${valid?"border-[var(--brand-border-soft)] bg-[var(--brand-panel)]":"border-destructive/25 bg-destructive/5"}`}><Info className={`mt-0.5 size-5 shrink-0 ${valid?"text-[var(--brand-secondary)]":"text-destructive"}`}/><div><h3 className="font-extrabold text-[var(--brand-primary)]">Validación actual</h3><p className="mt-1 text-sm leading-5 text-[var(--brand-ink)]">{person.validation.message}</p>{person.validation.matchedSession?<p className="mt-2 text-xs text-[var(--brand-muted)]">Próxima clase: {person.validation.matchedSession.activityName}</p>:null}</div></section> : null}<section className="mt-4 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4"><ManualAccessDecisionControls observation={observation} loading={loading} onObservation={onObservation} onRegister={onRegister} mobile/></section></main>;
}

function MobileManualResult({result,onReset}:{result:AccessValidationResponse;onReset:()=>void}){return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] bg-[var(--brand-page)] p-4 pb-[calc(96px+env(safe-area-inset-bottom))]"><AccessResultCard result={result} compactMobile/><Button className="mt-3 h-12 w-full rounded-xl" variant="outline" onClick={onReset}>Nueva búsqueda</Button></main>}

function DesktopManual({query,items,selected,observation,loading,onQuery,onSelect,onObservation,onRegister}:{query:string;items:SearchPerson[];selected:SearchPerson|null;observation:string;loading:boolean;onQuery:(value:string)=>void;onSelect:(person:SearchPerson)=>void;onObservation:(value:string)=>void;onRegister:(decision:"ALLOW"|"REJECT")=>Promise<void>}){
  return <AdminFormCard title="Buscar persona" description="Buscá por DNI, nombre, apellido, email o identificador y registrá el ingreso.">
    <CatalogSearchInput value={query} onChange={onQuery} placeholder="Buscar por DNI, nombre, apellido, email o ID..." />
    <div className="mt-5 grid min-h-96 items-start gap-6 xl:grid-cols-2">
      <section className="min-w-0 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm">
        {loading && !items.length ? <div className="h-60 animate-pulse rounded-2xl bg-[var(--brand-panel)]"/> : items.length ? <div className="grid gap-2">{items.map((item) => <button key={item.id} type="button" data-admin-list-card="" onClick={() => onSelect(item)} className={cn("min-w-0 w-full self-start rounded-2xl border p-1 text-left transition", selected?.id === item.id ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm" : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm")}><AccessPersonCard person={item} showContact showStatus /></button>)}</div> : <div className="grid min-h-60 place-items-center text-center text-sm font-semibold text-[var(--brand-text)]/70">Ingresá al menos dos caracteres.</div>}
      </section>
      <section className="min-w-0 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-6 shadow-sm">
        {selected ? <div className="grid gap-4">
          <div className="min-w-0 [overflow-wrap:anywhere]"><AccessPersonCard person={selected} showContact showStatus /><p className="mt-2 text-sm font-semibold text-[var(--brand-text)]">Validación actual: {selected.validation.message}</p>{selected.validation.matchedSession ? <p className="mt-1 text-sm font-semibold text-[var(--brand-text)]">Próxima clase: {selected.validation.matchedSession.activityName}</p> : null}</div>
          <ManualAccessDecisionControls observation={observation} loading={loading} onObservation={onObservation} onRegister={onRegister}/>
        </div> : <div className="grid min-h-60 place-items-center text-center text-sm font-semibold text-[var(--brand-text)]/70">Seleccioná una persona.</div>}
      </section>
    </div>
  </AdminFormCard>;
}
