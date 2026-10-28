"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, CheckCircle2, Flashlight, FlashlightOff, Info, QrCode, ScanLine, Square, X } from "lucide-react";
import { AccessPersonCard } from "./AccessPersonCard";
import { Button } from "@/components/ui/button";
import { AdminFormLoading } from "@/components/layout/admin-form-page";
import { ReceptionMobileHeader } from "@/features/reception/components/mobile/ReceptionMobileHeader";
import { useAccessEstablishment } from "../hooks/useAccessEstablishment";
import { useQrScanner } from "../hooks/useQrScanner";
import { QrManualDecisionCard } from "./QrManualDecisionCard";
import { registerManualAccess, validateAccessQr } from "../services/access.service";
import type { AccessValidationResponse, QrScannerStatus } from "../types/access.types";
import { AccessResultCard } from "./AccessResultCard";
import { AccessShell } from "./AccessShell";
import { QrScannerCard } from "./QrScannerCard";

export function AccessScanPage() {
  const establishment = useAccessEstablishment();
  return <Scan establishment={establishment}/>;
}

function Scan({establishment}:{establishment:ReturnType<typeof useAccessEstablishment>}) {
  const {establishmentId}=establishment;
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<QrScannerStatus>("idle");
  const [result, setResult] = useState<AccessValidationResponse | null>(null);
  const [error, setError] = useState("");
  const [observation,setObservation]=useState("");
  const [saving,setSaving]=useState(false);
  const savingRef=useRef(false);
  const detected = useCallback(async (token: string) => { if (!establishmentId) return; setStatus("searching"); setError(""); try { const response = await validateAccessQr(establishmentId, token); setResult(response); setStatus(response.result === "PERMITIDO" || response.pendingDecision ? "found" : "invalid"); } catch { setError("No pudimos validar el ingreso. Verificá la conexión e intentá nuevamente."); setStatus("scanner-error"); } }, [establishmentId]);
  const scanner = useQrScanner({ videoRef: scannerVideoRef, onDetected: detected });
  const stopScanner=scanner.stop;
  useEffect(()=>{stopScanner();setResult(null);setError("");setObservation("");setStatus("idle");},[establishmentId,stopScanner]);
  async function decide(decision:"ALLOW"|"REJECT"){
    if(!result?.pendingDecision||savingRef.current||observation.trim().length<5)return;
    savingRef.current=true;setSaving(true);setError("");
    try{setResult(await registerManualAccess({establishmentId,userId:result.user.id,decision,observation,qrAttemptId:result.pendingDecision.attemptId}));}
    catch{setError("No pudimos guardar la decisión. Verificá tus permisos y reintentá; la misma decisión no se duplicará.");}
    finally{savingRef.current=false;setSaving(false);}
  }
  const decisionCard=(mobile=false)=>result?.pendingDecision?<QrManualDecisionCard result={result} observation={observation} loading={saving} error={error} onObservation={setObservation} onRegister={decide} mobile={mobile}/>:null;
  async function restart() { setResult(null); setError(""); setObservation(""); setStatus("scanning"); await scanner.start(); if (mobileVideoRef.current && scannerVideoRef.current?.srcObject) { mobileVideoRef.current.srcObject = scannerVideoRef.current.srcObject; await mobileVideoRef.current.play().catch(() => undefined); } }
  function stop(){scanner.stop();setStatus("idle")}
  const scannerStatus=scanner.error??status;
  const unavailable=<div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[var(--brand-border)] bg-white px-5 text-center text-sm font-semibold text-[var(--brand-text)]/70">Seleccioná un establecimiento antes de escanear.</div>;
  return <><div className="md:hidden"><ReceptionMobileHeader/>{establishment.loading?<div className="p-4"><AdminFormLoading label="Cargando establecimientos..."/></div>:result?.pendingDecision?decisionCard(true):result&&(result.reason==="ACCESO_MANUAL_AUTORIZADO"||result.reason==="ACCESO_MANUAL_RECHAZADO")?<div className="bg-[var(--brand-page)] p-4 pb-28"><AccessResultCard result={result} compactMobile/><Button type="button" onClick={()=>void restart()} variant="outline" className="mt-3 h-12 w-full rounded-xl">Escanear siguiente</Button></div>:result?<ReceptionMobileScanResult result={result} onContinue={()=>void restart()}/>:<ReceptionMobileScanner videoRef={mobileVideoRef} status={scannerStatus} scanning={scanner.scanning} hasFlash={scanner.hasFlash} flashOn={scanner.flashOn} error={error} onStart={restart} onStop={stop} onToggleFlash={()=>void scanner.toggleFlash()} unavailable={!establishmentId}/>}</div><div className="hidden md:block"><AccessShell title="Escanear QR" description="Validá la credencial personal y registrá el ingreso." stateOverride={establishment}>{()=>!establishmentId?unavailable:<div className="grid gap-6">{result?.pendingDecision?decisionCard():result?<><AccessResultCard result={result}/><div><Button onClick={restart} className="h-11 rounded-xl bg-[var(--brand-primary)] font-bold text-white hover:bg-[var(--brand-primary-hover)]">Escanear siguiente</Button></div></>:<QrScannerCard videoRef={scannerVideoRef} status={scannerStatus} scanning={scanner.scanning} hasFlash={scanner.hasFlash} flashOn={scanner.flashOn} onStart={restart} onStop={stop} onToggleFlash={()=>void scanner.toggleFlash()}/>} {error?<p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>:null}</div>}</AccessShell></div></>;
}

function ReceptionMobileScanner({videoRef,status,scanning,hasFlash,flashOn,error,onStart,onStop,onToggleFlash,unavailable}:{videoRef:React.RefObject<HTMLVideoElement|null>;status:QrScannerStatus;scanning:boolean;hasFlash:boolean;flashOn:boolean;error:string;onStart:()=>void;onStop:()=>void;onToggleFlash:()=>void;unavailable:boolean}){
  const validating=status==="searching"||status==="read";
  return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] pb-[calc(92px+env(safe-area-inset-bottom))]"><header className="flex items-start gap-3 bg-white px-4 py-5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><ScanLine className="size-6"/></span><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Escanear QR</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Escaneá el código QR de la persona para identificarla.</p></div></header>{unavailable?<div className="p-4"><div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[var(--brand-secondary)]/40 bg-white px-5 text-center text-[var(--brand-text)]">Seleccioná un establecimiento antes de escanear.</div></div>:<><section className="relative min-h-[52dvh] overflow-hidden bg-[#0A2F1F]"><video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover"/>{!scanning?<div className="absolute inset-0 grid place-items-center bg-black/65 text-center text-white"><div><QrCode className="mx-auto size-12 text-[var(--brand-accent)]"/><p className="mt-3 font-bold">Scanner QR preparado</p></div></div>:null}{scanning&&hasFlash?<button type="button" onClick={onToggleFlash} aria-label={flashOn?"Apagar linterna":"Encender linterna"} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur">{flashOn?<FlashlightOff className="size-5"/>:<Flashlight className="size-5"/>}</button>:null}<div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[72%] max-w-72 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/20 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]"><span className="absolute -left-0.5 -top-0.5 size-10 rounded-tl-3xl border-l-4 border-t-4 border-white"/><span className="absolute -right-0.5 -top-0.5 size-10 rounded-tr-3xl border-r-4 border-t-4 border-white"/><span className="absolute -bottom-0.5 -left-0.5 size-10 rounded-bl-3xl border-b-4 border-l-4 border-white"/><span className="absolute -bottom-0.5 -right-0.5 size-10 rounded-br-3xl border-b-4 border-r-4 border-white"/>{scanning?<span className="absolute left-2 right-2 top-1/2 h-0.5 bg-[var(--brand-accent)] shadow-[0_0_12px_var(--brand-accent)]"/>:null}</div><div className="absolute inset-x-4 bottom-5 grid grid-cols-2 gap-2"><Button type="button" onClick={onStart} disabled={scanning||validating} className="h-11 rounded-xl bg-white/10 font-bold text-white backdrop-blur hover:bg-white/20"><Camera/>{validating?"Validando QR...":"Iniciar"}</Button><Button type="button" onClick={onStop} disabled={!scanning} variant="outline" className="h-11 rounded-xl border-white/40 bg-black/20 font-bold text-white backdrop-blur"><Square/>Detener</Button></div></section><section className="m-4 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><Info className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]"/><div><h2 className="font-extrabold text-[var(--brand-primary)]">Cómo escanear</h2><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Pedí al ciudadano que muestre su código QR desde la app o credencial impresa.</p></div></div>{error?<p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>:null}</section></>}</main>;
}

function ReceptionMobileScanResult({result,onContinue}:{result:AccessValidationResponse;onContinue:()=>void}){
  const person=result.user,allowed=result.result==="PERMITIDO";
  return <main className="min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4"><header className="flex items-center gap-3 border-b border-[var(--brand-border-soft)] pb-4"><button type="button" onClick={onContinue} aria-label="Volver al escáner" className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--brand-primary)]"><ArrowLeft/></button><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Escanear QR</h1><p className="text-sm text-[var(--brand-muted)]">Persona identificada</p></div></header><div className="mt-4"><AccessPersonCard person={person} mobile /></div><section className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]"/><div><h3 className="font-extrabold text-[var(--brand-primary)]">{allowed?"Código QR válido":"Código QR rechazado"}</h3><p className="mt-1 text-sm text-[var(--brand-muted)]">{result.message}</p></div></section><div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={allowed} onClick={onContinue} className="h-12 rounded-xl border-[var(--brand-primary)] bg-white font-bold text-[var(--brand-primary)]"><X/>Rechazar</Button><Button type="button" disabled={!allowed} onClick={onContinue} className="h-12 rounded-xl bg-[var(--brand-primary)] font-bold text-white hover:bg-[var(--brand-primary-hover)]"><Check/>Aceptar</Button></div></main>;
}

