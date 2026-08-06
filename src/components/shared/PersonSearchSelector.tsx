"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Camera, Check, CheckCircle2, IdCard, Loader2, Mail, MapPin, Phone, QrCode, Search, Square, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQrScanner } from "@/features/access/hooks/useQrScanner";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { AdminEmptyState, AdminFormField, adminControlClass, adminSecondaryButtonClass } from "./admin-patterns";

export type PersonSearchOption = {
  id: string;
  fullName: string;
  documentNumber: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  identityPhotoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  locality?: string | null;
  province?: string | null;
  postalCode?: string | null;
  birthDate?: string | null;
};

type Props<T extends PersonSearchOption> = {
  value: T | null;
  onChange: (person: T | null) => void;
  search: (query: string) => Promise<T[]>;
  identifyQr: (token: string) => Promise<T>;
  title?: string;
  searchPlaceholder?: string;
};

const scannerMessages: Record<string, string> = {
  "camera-not-supported": "Este dispositivo no permite acceder a la cámara.",
  "camera-not-found": "No encontramos una cámara disponible.",
  "camera-permission-denied": "El permiso de cámara está bloqueado. Habilitalo desde el navegador.",
  "camera-in-use": "La cámara está siendo utilizada por otra aplicación.",
  "barcode-unsupported": "El navegador no dispone de un lector QR compatible.",
  "barcode-error": "No pudimos leer el código QR.",
  "scanner-error": "No pudimos iniciar el escáner.",
};

export function PersonSearchSelector<T extends PersonSearchOption>({ value, onChange, search, identifyQr, title = "Buscar persona", searchPlaceholder = "Nombre, apellido o DNI" }: Props<T>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [qrFeedback, setQrFeedback] = useState<"idle" | "detected" | "verified">("idle");

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) { setResults([]); setSearching(false); return; }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void search(normalized).then(setResults).catch(() => setResults([])).finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const identify = useCallback(async (token: string) => {
    if (!token.trim()) return;
    setQrFeedback("detected");
    setIdentifying(true);
    try {
      const person = await identifyQr(token);
      setQrFeedback("verified");
      setQuery("");
      setQrToken("");
      toast.success("Persona identificada correctamente.");
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      onChange(person);
      setQrOpen(false);
    } catch (error: any) {
      setQrFeedback("idle");
      toast.error(error?.response?.data?.message ?? "No pudimos identificar el QR.");
    } finally {
      setIdentifying(false);
    }
  }, [identifyQr, onChange]);
  const scanner = useQrScanner({ videoRef, onDetected: identify });

  if (value) return <section className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-control)] p-4 sm:p-5"><header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--brand-border)] pb-4"><div className="flex min-w-0 items-center gap-3">{value.avatarUrl ? <img src={value.avatarUrl} alt={`Avatar de ${value.fullName}`} className="size-14 shrink-0 rounded-2xl object-cover" /> : <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-[var(--brand-primary)]"><UserRound /></div>}<div className="min-w-0"><p className="truncate text-lg font-extrabold text-[var(--brand-primary)]">{value.fullName}</p><p className="text-sm font-medium text-[var(--brand-muted)]">Persona seleccionada para validación presencial</p></div></div><Button type="button" variant="outline" className={adminSecondaryButtonClass} onClick={() => onChange(null)}>Cambiar</Button></header><div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"><div><p className="mb-2 text-xs font-extrabold uppercase text-[var(--brand-muted)]">Foto de identidad</p><div className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white">{value.identityPhotoUrl?<img src={value.identityPhotoUrl} alt={`Foto de identidad de ${value.fullName}`} className="size-full object-cover"/>:<span className="grid gap-2 text-center text-[var(--brand-muted)]"><UserRound className="mx-auto size-10"/><small className="font-bold">Sin foto de identidad</small></span>}</div></div><dl className="grid content-start gap-3 sm:grid-cols-2"><PersonFact icon={IdCard} label="DNI" value={value.documentNumber}/><PersonFact icon={MapPin} label="Domicilio" value={[value.address,value.locality,value.province].filter(Boolean).join(", ")}/><PersonFact icon={Mail} label="Email" value={value.email}/><PersonFact icon={Phone} label="Teléfono" value={value.phone}/><PersonFact icon={CalendarDays} label="Fecha de nacimiento" value={formatPersonDate(value.birthDate)}/><PersonFact icon={MapPin} label="Código postal" value={value.postalCode}/></dl></div><p className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-border)] bg-white p-3 text-sm font-medium text-[var(--brand-text)]"><IdCard className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]"/>Compará la foto de identidad y los datos con la persona que se presenta antes de continuar.</p></section>;

  return <div className="grid gap-4">
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <AdminFormField label={title} icon={Search}><Input className={adminControlClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} /></AdminFormField>
      <Button type="button" variant="outline" className={`${adminSecondaryButtonClass} self-end`} onClick={() => { scanner.stop(); setQrFeedback("idle"); setQrOpen((current) => !current); }}><QrCode />Buscar por QR</Button>
    </div>
    {qrOpen ? <div className="grid gap-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-control)] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]">
      <div><div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0A2F1F]"><video ref={videoRef} playsInline muted className="h-full w-full object-cover" />{scanner.scanning || identifying ? <><div className="pointer-events-none absolute inset-0 bg-black/25"/><div className={`pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[58%] max-w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 ${identifying?"border-emerald-400 shadow-[0_0_0_999px_rgba(0,0,0,0.28),0_0_28px_rgba(52,211,153,0.65)]":"border-[var(--brand-accent)] shadow-[0_0_0_999px_rgba(0,0,0,0.28),0_0_24px_rgba(221,239,143,0.45)]"}`}>{identifying?<span className="absolute inset-0 grid place-items-center"><span className="grid size-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg">{qrFeedback==="verified"?<CheckCircle2 className="size-9"/>:<Loader2 className="size-9 animate-spin"/>}</span></span>:<><span className="absolute -left-0.5 -top-0.5 size-8 rounded-tl-2xl border-l-4 border-t-4 border-[var(--brand-accent)]"/><span className="absolute -right-0.5 -top-0.5 size-8 rounded-tr-2xl border-r-4 border-t-4 border-[var(--brand-accent)]"/><span className="absolute -bottom-0.5 -left-0.5 size-8 rounded-bl-2xl border-b-4 border-l-4 border-[var(--brand-accent)]"/><span className="absolute -bottom-0.5 -right-0.5 size-8 rounded-br-2xl border-b-4 border-r-4 border-[var(--brand-accent)]"/><span className="absolute left-3 right-3 top-1/2 h-0.5 animate-pulse bg-[var(--brand-accent)] shadow-[0_0_10px_var(--brand-accent)]"/></>}</div><p className="pointer-events-none absolute inset-x-4 bottom-3 text-center text-sm font-bold text-white drop-shadow-md">{identifying?(qrFeedback==="verified"?"Persona identificada":"QR detectado · verificando persona..."):"Ubicá el QR dentro del recuadro"}</p></> : <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-white/80"><span><QrCode className="mx-auto size-10 text-[var(--brand-accent)]"/><small className="mt-2 block font-bold">Cámara preparada</small></span></div>}</div><div className="mt-3 flex gap-2"><Button type="button" className="h-11 flex-1 rounded-xl bg-[var(--brand-primary)]" disabled={scanner.scanning || identifying} onClick={() => {setQrFeedback("idle");void scanner.start();}}><Camera />{identifying?(qrFeedback==="verified"?"Persona identificada":"Verificando..."):scanner.scanning?"Buscando QR...":"Activar cámara"}</Button>{scanner.scanning ? <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={scanner.stop}><Square />Detener</Button> : null}</div>{scanner.error ? <p className="mt-2 text-sm font-medium text-red-700">{scannerMessages[scanner.error] ?? "No pudimos iniciar el escáner."}</p> : null}</div>
      <AdminFormField label="Código QR" icon={QrCode} align="start"><Input className={adminControlClass} value={qrToken} onChange={(event) => setQrToken(event.target.value)} placeholder="Escaneá con lector o pegá el código" /><Button type="button" variant="outline" className="mt-3 h-11 rounded-xl" disabled={!qrToken.trim() || identifying} onClick={() => void identify(qrToken)}>{identifying ? <Loader2 className="animate-spin" /> : <Search />}Identificar</Button></AdminFormField>
    </div> : null}
    <div className="grid gap-2">{searching ? <CatalogLoadingState label="personas" /> : results.length ? results.map((person) => <button type="button" key={person.id} onClick={() => onChange(person)} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-3 text-left transition hover:border-[var(--brand-secondary)]">{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="size-11 rounded-xl object-cover" /> : <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-control)]"><UserRound className="size-5" /></span>}<span className="min-w-0 flex-1"><strong className="block truncate text-[var(--brand-primary)]">{person.fullName}</strong><small className="text-[var(--brand-muted)]">DNI {person.documentNumber ?? "sin registrar"}</small></span><Check className="size-5 text-[var(--brand-secondary)]" /></button>) : query.trim().length >= 2 ? <AdminEmptyState title="No encontramos personas." description="Probá con otro nombre, apellido o DNI." className="min-h-40" /> : <p className="text-sm text-[var(--brand-muted)]">Ingresá al menos dos caracteres para comenzar la búsqueda.</p>}</div>
  </div>;
}

function PersonFact({icon:Icon,label,value}:{icon:typeof IdCard;label:string;value?:string|null}){return <div className="flex min-h-16 items-start gap-3 rounded-xl border border-[var(--brand-border-soft)] bg-white p-3"><Icon className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]"/><div className="min-w-0"><dt className="text-xs font-extrabold uppercase text-[var(--brand-muted)]">{label}</dt><dd className="mt-1 break-words font-bold text-[var(--brand-primary)]">{value||"No informado"}</dd></div></div>}
function formatPersonDate(value?:string|null){if(!value)return null;const [year,month,day]=value.split("-");return `${day}/${month}/${year}`;}
