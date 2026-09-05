"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileCheck2, FileText, Home, IdCard, Loader2, Mail, MessageSquareText, Phone, Search, UploadCloud, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { AdminFormPage } from "@/components/layout/admin-form-page";
import { PersonSearchSelector, type PersonSearchOption } from "@/components/shared/PersonSearchSelector";
import { MobilePersonSearchResultCard } from "@/components/shared/MobilePersonSearchResultCard";
import { AdminFormCard, AdminFormField, adminControlClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ReceptionMobileHeader } from "@/features/reception/components/mobile/ReceptionMobileHeader";
import { MAX_ENROLLMENT_DOCUMENT_BYTES } from "@/features/enrollment-documents/constants/file-rules";
import { listRequirementsClient } from "@/features/requirements/services/requirements.service";
import type { Requirement } from "@/features/requirements/types/requirement.types";
import { axiosInstance } from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors/getErrorMessage";

type Citizen = PersonSearchOption & { email?: string | null; identityPhotoUrl?: string | null; phone?: string | null; address?: string | null; locality?: string | null; province?: string | null; postalCode?: string | null; birthDate?: string | null };

const searchCitizens = async (query: string) => (await axiosInstance.get("/user-documents/citizens", { params: { q: query } })).data.data.items as Citizen[];
const identifyCitizen = async (qrToken: string) => (await axiosInstance.post("/user-documents/citizens", { qrToken })).data.data as Citizen;

type UploadMode = "admin-upload" | "reception-upload";
type UploadConfirmation = { requirementName:string; status:string; uploadedAt:string; user:{ nombre?:string|null; apellido?:string|null; documento?:string|null } };

export function AdminUserDocumentUploadPage({ mode = "admin-upload" }: { mode?: UploadMode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementId, setRequirementId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [confirmation, setConfirmation] = useState<UploadConfirmation | null>(null);
  const reception = mode === "reception-upload";
  const catalogContext = reception ? citizen?.id : "admin";

  useEffect(() => {
    if (reception && !catalogContext) {
      setRequirements([]);
      setLoadingOptions(false);
      setOptionsError(false);
      return;
    }

    setLoadingOptions(true);
    setOptionsError(false);
    void listRequirementsClient({ active: true, requiresDocument: true, orderBy: "orden", orderDir: "asc" })
      .then((items) => setRequirements(items.filter((item) => item.documentoPersonal)))
      .catch(() => {
        setRequirements([]);
        setOptionsError(true);
        toast.error("No pudimos cargar los tipos de documento.");
      })
      .finally(() => setLoadingOptions(false));
  }, [catalogContext, reception]);

  function choose(next?: File) {
    if (!next) return;
    if (!next.size) return void toast.error("El archivo está vacío.");
    if (!["application/pdf", "image/jpeg", "image/png"].includes(next.type)) return void toast.error("Solo se permiten archivos PDF, JPG o PNG.");
    if (next.size > MAX_ENROLLMENT_DOCUMENT_BYTES) return void toast.error("El archivo supera el máximo de 10 MB.");
    setFile(next);
  }

  function selectCitizen(next: Citizen | null) {
    setCitizen(next);
    setRequirementId("");
    setFile(null);
    setObservations("");
  }

  async function submit() {
    if (!citizen || !requirementId || !file || loading) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.set("userId", citizen.id);
      form.set("requirementId", requirementId);
      form.set("file", file);
      form.set("observations", observations);
      const response = await axiosInstance.post(reception ? "/reception/documents" : "/user-documents", form);
      toast.success(reception ? "Documento enviado a revisión." : "Documento cargado y enviado a revisión.");
      if (reception) {
        setConfirmation(response.data.data as UploadConfirmation);
        setCompleted(true);
      }
      else router.replace("/user-documents");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No pudimos cargar el documento."));
    } finally {
      setLoading(false);
    }
  }

  if (completed) return <>{reception?<div className="md:hidden"><ReceptionMobileHeader/><ReceptionMobileUploadConfirmation data={confirmation} citizen={citizen} onAnother={()=>{selectCitizen(null);setConfirmation(null);setCompleted(false)}}/></div>:null}<div className={reception?"hidden md:block":undefined}><main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8"><section className="mx-auto flex min-h-[480px] max-w-2xl flex-col items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-white p-8 text-center shadow-sm"><span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><CheckCircle2 className="size-9" /></span><h1 className="mt-5 text-3xl font-extrabold text-[var(--brand-primary)]">Documento enviado a revisión</h1><p className="mt-3 max-w-md text-[var(--brand-muted)]">El documento quedó pendiente de aprobación por un administrador.</p><div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center"><Button type="button" className={adminPrimaryButtonClass} onClick={() => { selectCitizen(null); setConfirmation(null); setCompleted(false); }}><UploadCloud />Cargar otro documento</Button><Button asChild variant="outline" className={adminSecondaryButtonClass}><Link href="/reception"><Home />Volver al Dashboard</Link></Button></div></section></main></div></>;

  return (
    <>
    {reception ? <div className="md:hidden"><ReceptionMobileHeader/><ReceptionMobileDocumentUpload citizen={citizen} onCitizen={selectCitizen} requirements={requirements} requirementId={requirementId} onRequirement={setRequirementId} loadingOptions={loadingOptions} optionsError={optionsError} file={file} onChoose={choose} onRemoveFile={()=>setFile(null)} observations={observations} onObservations={setObservations} loading={loading} dragging={dragging} onDragging={setDragging} inputRef={inputRef} onSubmit={submit}/></div> : null}
    <div className={reception ? "hidden md:block" : undefined}>
    <AdminFormPage fullWidth title={reception ? "Adjuntar documentos" : "Cargar documento presentado"} description={reception ? "Registrá el documento que la persona presentó en Recepción." : "Registrá el archivo que el ciudadano entregó presencialmente en administración."} icon={FileText}>
      <AdminFormCard title="Datos del documento" description="Seleccioná al ciudadano, el tipo documental y el archivo entregado.">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
          <PersonSearchSelector value={citizen} onChange={selectCitizen} search={searchCitizens} identifyQr={identifyCitizen} searchPlaceholder="Nombre, apellido, DNI o email" />
          </div>
          {citizen ? <>
            <AdminFormField label="Tipo de documento *" icon={FileCheck2} className="sm:col-span-2">
              <Select value={requirementId} onValueChange={setRequirementId} disabled={loadingOptions || optionsError || requirements.length === 0}>
                <SelectTrigger className={`${adminControlClass} w-full`}><SelectValue placeholder={loadingOptions ? "Cargando tipos de documento..." : "Seleccionar tipo documental"} /></SelectTrigger>
                <SelectContent>{requirements.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent>
              </Select>
              {!loadingOptions && optionsError ? <p className="text-sm font-medium text-red-700">No se pudieron cargar los tipos documentales.</p> : null}
              {!loadingOptions && !optionsError && requirements.length === 0 ? <p className="text-sm text-[var(--brand-muted)]">No hay tipos documentales disponibles para esta persona.</p> : null}
            </AdminFormField>
            <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }} className={`grid min-h-48 place-items-center rounded-2xl border border-dashed p-6 text-center transition sm:col-span-2 ${dragging ? "border-[var(--brand-primary)] bg-[var(--brand-panel)]" : "border-[var(--brand-secondary)]/60 bg-[var(--brand-control)]"}`}>
              <div><UploadCloud className="mx-auto size-10 text-[var(--brand-secondary)]" /><p className="mt-2 break-all font-extrabold text-[var(--brand-primary)]">{file ? file.name : "Arrastrá el documento acá"}</p><p className="mt-1 text-xs text-[var(--brand-muted)]">PDF, JPG o PNG · máximo 10 MB</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => inputRef.current?.click()}>{file ? "Reemplazar archivo" : "Seleccionar archivo"}</Button>{file ? <Button type="button" variant="ghost" className="rounded-xl text-red-700" onClick={() => setFile(null)}><X />Quitar archivo</Button> : null}</div><input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} /></div>
            </div>
            <AdminFormField label={reception ? "Observaciones de la carga" : "Observaciones administrativas"} icon={MessageSquareText} align="start" className="sm:col-span-2"><Textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={5} maxLength={1000} className="min-h-32 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" placeholder={reception ? "Indicá cómo fue presentado el documento o cualquier dato relevante." : "Indicá cómo fue presentado o cualquier dato relevante..."} /></AdminFormField>
          </> : null}
        </div>
        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:justify-between">
          <Button asChild variant="outline" className={adminSecondaryButtonClass}><Link href={reception ? "/reception" : "/user-documents"}><ArrowLeft />Cancelar</Link></Button>
          <Button type="button" className={adminPrimaryButtonClass} disabled={loading || !citizen || !requirementId || !file} onClick={() => void submit()}>{loading ? <Loader2 className="animate-spin" /> : <UploadCloud />}{loading ? "Cargando..." : "Cargar documento"}</Button>
        </footer>
      </AdminFormCard>
    </AdminFormPage>
    </div>
    </>
  );
}

function ReceptionMobileUploadConfirmation({data,citizen,onAnother}:{data:UploadConfirmation|null;citizen:Citizen|null;onAnother:()=>void}){
  const name=data?[data.user.nombre,data.user.apellido].filter(Boolean).join(" "):citizen?.fullName;
  const documentNumber=data?.user.documento||citizen?.documentNumber;
  const status=data?.status==="PENDIENTE"?"Pendiente de aprobación":data?.status||"Pendiente de aprobación";
  const uploadedAt=data?.uploadedAt?new Date(data.uploadedAt).toLocaleString("es-AR"):"Fecha no disponible";
  return <main className="min-h-full overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4"><section className="rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm"><header className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><CheckCircle2 className="size-7"/></span><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--brand-secondary)]">Resultado</p><h1 className="mt-1 text-xl font-extrabold leading-6 text-[var(--brand-primary)]">Documento enviado a revisión</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">El documento quedó pendiente de aprobación por un administrador.</p></div></header><div className="mt-4 rounded-2xl bg-[var(--brand-page)] p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--brand-secondary)]">Documentación cargada</p><div className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white text-[var(--brand-primary)] shadow-sm"><FileText className="size-5"/></span><div className="min-w-0"><h2 className="break-words font-extrabold text-[var(--brand-primary)]">{name||"Persona seleccionada"}</h2><p className="mt-0.5 text-xs text-[var(--brand-muted)]">DNI {documentNumber||"No informado"}</p><p className="mt-2 break-words text-sm font-bold text-[var(--brand-ink)]">{data?.requirementName||"Tipo documental"}</p><p className="mt-1 text-xs text-[var(--brand-muted)]"><strong className="text-[var(--brand-primary)]">Estado:</strong> {status}</p><p className="mt-1 text-xs text-[var(--brand-muted)]">{uploadedAt}</p></div></div></div><p className="mt-4 text-sm leading-5 text-[var(--brand-muted)]">El documento fue enviado correctamente y quedará disponible para revisión administrativa.</p></section><div className="mt-3 grid gap-2"><Button type="button" onClick={onAnother} className="h-12 w-full rounded-xl bg-[var(--brand-primary)] font-bold text-white"><UploadCloud/>Cargar otro documento</Button><Button asChild variant="outline" className="h-12 w-full rounded-xl border-[var(--brand-border)] bg-white font-bold text-[var(--brand-primary)]"><Link href="/reception"><Home/>Volver al Dashboard</Link></Button></div></main>
}

type MobileUploadProps={citizen:Citizen|null;onCitizen:(citizen:Citizen|null)=>void;requirements:Requirement[];requirementId:string;onRequirement:(value:string)=>void;loadingOptions:boolean;optionsError:boolean;file:File|null;onChoose:(file?:File)=>void;onRemoveFile:()=>void;observations:string;onObservations:(value:string)=>void;loading:boolean;dragging:boolean;onDragging:(value:boolean)=>void;inputRef:RefObject<HTMLInputElement|null>;onSubmit:()=>Promise<void>};

function ReceptionMobileDocumentUpload(props:MobileUploadProps){
  if(!props.citizen)return <MobileCitizenSearch onSelect={props.onCitizen}/>;
  const citizen=props.citizen,photo=citizen.avatarUrl||citizen.identityPhotoUrl;
  return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(152px+env(safe-area-inset-bottom))] pt-4"><header className="flex items-start gap-2"><button type="button" onClick={()=>props.onCitizen(null)} className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--brand-primary)]" aria-label="Volver a buscar persona"><ArrowLeft/></button><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Adjuntar documentos</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Adjuntá documentación para la persona seleccionada.</p></div></header>

    <section className="mt-4 min-w-0 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm"><div className="flex min-w-0 items-center gap-3">{photo?<Image src={photo} alt={`Avatar de ${citizen.fullName}`} width={56} height={56} unoptimized className="size-14 shrink-0 rounded-full object-cover"/>:<span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><UserRound className="size-6"/></span>}<div className="min-w-0"><h2 className="break-words text-base font-extrabold text-[var(--brand-primary)]">{citizen.fullName}</h2><p className="mt-1 text-xs text-[var(--brand-muted)]">Persona seleccionada</p></div></div><dl className="mt-4 grid min-w-0 gap-2"><MobilePersonFact icon={Mail} label="Email" value={citizen.email}/><MobilePersonFact icon={IdCard} label="DNI" value={citizen.documentNumber}/><MobilePersonFact icon={Phone} label="Teléfono" value={citizen.phone}/></dl></section>

    <section className="mt-3 space-y-4 rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm"><div><label className="text-sm font-extrabold text-[var(--brand-primary)]">Tipo de documento *</label><Select value={props.requirementId} onValueChange={props.onRequirement} disabled={props.loadingOptions||props.optionsError||!props.requirements.length}><SelectTrigger className="mt-2 h-12 w-full rounded-xl border-[var(--brand-border)] bg-white"><SelectValue placeholder={props.loadingOptions?"Cargando tipos de documento...":"Seleccionar tipo documental"}/></SelectTrigger><SelectContent>{props.requirements.map((item)=><SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent></Select>{!props.loadingOptions&&props.optionsError?<p className="mt-2 text-xs font-medium text-red-700">No se pudieron cargar los tipos documentales.</p>:null}{!props.loadingOptions&&!props.optionsError&&!props.requirements.length?<p className="mt-2 text-xs text-[var(--brand-muted)]">No hay tipos documentales disponibles para esta persona.</p>:null}</div>
      <div onDragEnter={(event)=>{event.preventDefault();props.onDragging(true)}} onDragOver={(event)=>event.preventDefault()} onDragLeave={()=>props.onDragging(false)} onDrop={(event)=>{event.preventDefault();props.onDragging(false);props.onChoose(event.dataTransfer.files[0])}} className={`grid min-h-44 place-items-center rounded-2xl border border-dashed p-4 text-center ${props.dragging?"border-[var(--brand-primary)] bg-[var(--brand-panel)]":"border-[var(--brand-secondary)]/60 bg-white"}`}><div><UploadCloud className="mx-auto size-9 text-[var(--brand-secondary)]"/><p className="mt-2 break-all text-sm font-extrabold text-[var(--brand-primary)]">{props.file?props.file.name:"Arrastrá el documento acá"}</p><p className="mt-1 text-xs text-[var(--brand-muted)]">PDF, JPG o PNG · máximo 10 MB</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" onClick={()=>props.inputRef.current?.click()} className="h-10 rounded-xl bg-white text-xs font-bold">{props.file?"Reemplazar archivo":"Seleccionar archivo"}</Button>{props.file?<Button type="button" variant="ghost" onClick={props.onRemoveFile} className="h-10 rounded-xl text-xs text-red-700"><X/>Quitar</Button>:null}</div><input ref={props.inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event)=>{props.onChoose(event.target.files?.[0]);event.target.value=""}}/></div></div>
    </section>

    <footer className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-[var(--brand-border-soft)] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(29,79,54,0.10)] backdrop-blur"><Button type="button" disabled={props.loading||!props.requirementId||!props.file} onClick={()=>void props.onSubmit()} className="h-12 w-full rounded-xl bg-[var(--brand-primary)] font-bold">{props.loading?<Loader2 className="animate-spin"/>:<UploadCloud/>}{props.loading?"Cargando...":"Cargar documento"}</Button></footer>
  </main>;
}

function MobileCitizenSearch({onSelect}:{onSelect:(citizen:Citizen|null)=>void}){const[query,setQuery]=useState(""),[items,setItems]=useState<Citizen[]>([]),[loading,setLoading]=useState(false);useEffect(()=>{const value=query.trim();if(value.length<2){setItems([]);setLoading(false);return}const timer=window.setTimeout(()=>{setLoading(true);void searchCitizens(value).then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false))},300);return()=>window.clearTimeout(timer)},[query]);return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-5"><header className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><FileText className="size-6"/></span><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Adjuntar documentos</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Buscá a la persona para cargar o actualizar documentación.</p></div></header><div className="relative mt-5"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--brand-primary)]"/><Input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar por DNI, nombre, apellido o email" className="h-12 rounded-2xl border-[var(--brand-secondary)]/35 bg-white pl-12"/></div><section className="mt-4 grid gap-3">{loading&&!items.length?<div className="h-32 animate-pulse rounded-2xl bg-[var(--brand-panel)]"/>:items.length?items.map((person)=><MobilePersonSearchResultCard key={person.id} name={person.fullName} documentNumber={person.documentNumber} email={person.email} avatarUrl={person.avatarUrl} onClick={()=>onSelect(person)}/>):<div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-white/70 p-5 text-center text-sm text-[var(--brand-muted)]">{query.trim().length>=2?"No se encontraron personas.":"Ingresá al menos dos caracteres para comenzar la búsqueda."}</div>}</section></main>}
function MobilePersonFact({icon:Icon,label,value}:{icon:typeof IdCard;label:string;value?:string|null}){return <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl bg-[var(--brand-page)] p-3"><Icon className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)]"/><div className="min-w-0"><dt className="text-[9px] font-extrabold uppercase text-[var(--brand-muted)]">{label}</dt><dd className="mt-0.5 break-words text-xs font-bold text-[var(--brand-primary)]">{value||"No informado"}</dd></div></div>}
