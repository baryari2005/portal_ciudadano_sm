"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Clock3, Info, Loader2, LogIn, RefreshCw, Send, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/lib/axios";

type AccessStatusResponse = { user: { estado: string; nombre: string; apellido: string }; request: { estado: "PENDIENTE" | "APROBADA" | "RECHAZADA"; motivoRechazo: string | null; enviadaAt: string; revisadaAt: string | null } | null };

export default function RequestAccessStatusPage() {
  const [data, setData] = useState<AccessStatusResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); setError(""); axiosInstance.get<AccessStatusResponse>("/auth/request-access/status").then((response) => setData(response.data)).catch(() => setError("No pudimos consultar el estado de tu solicitud.")).finally(() => setLoading(false)); };
  useEffect(load, []);

  const status = data?.request?.estado;
  const rejected = status === "RECHAZADA";
  const approved = status === "APROBADA";
  const StatusIcon = rejected ? XCircle : approved ? CheckCircle2 : Clock3;
  const statusLabel = rejected ? "Rechazada" : approved ? "Aprobada" : status === "PENDIENTE" ? "Pendiente" : "Sin solicitud";

  return <main className="min-h-dvh bg-[var(--brand-page)]">
    <header className="border-b border-white/15 bg-primary"><div className="mx-auto flex min-h-[72px] items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:h-[88px] sm:gap-6 sm:px-8 sm:py-0 lg:px-10"><div className="min-w-0 leading-tight text-white sm:hidden"><strong className="block truncate text-sm tracking-wide">MÁS SAN MIGUEL</strong><span className="block text-xs text-white/85">Portal ciudadano</span></div><div className="hidden min-w-0 items-center gap-5 text-white sm:flex"><Image src="/logoentero.png" alt="MAS San Miguel" width={112} height={52} priority className="h-auto w-24 object-contain brightness-0 invert sm:w-28"/><div className="hidden h-14 w-px bg-white/45 sm:block"/><div className="hidden min-[390px]:block"><p className="text-base font-bold sm:text-lg">Portal ciudadano</p><p className="mt-1 text-sm font-medium text-[#D8E178] sm:text-base">Sistema de Ayuda<span className="block">y Actividades</span></p></div></div><Link href="/login" aria-label="Iniciar sesión" className="flex shrink-0 items-center gap-3 font-bold text-white"><span className="grid size-11 place-items-center rounded-lg bg-[#e9f3d8] text-[var(--brand-heading)]"><User className="size-7 fill-current"/></span><span className="hidden sm:inline">Iniciar sesión</span></Link></div></header>

    <section className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-9">
      <header className="mb-5 border-b border-[var(--brand-border)] pb-4 sm:mb-6 sm:pb-5"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><ClipboardCheck className="size-6"/></span><h1 className="text-2xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">Estado de la solicitud</h1></div><p className="mt-3 flex items-start gap-2 text-sm text-[var(--brand-muted)] sm:text-base"><Info className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]"/>Consultá el resultado y los próximos pasos de tu solicitud de acceso.</p></header>

      <section className="rounded-2xl border border-[var(--brand-secondary)]/20 bg-white/80 p-4 text-[var(--brand-ink)] shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
        {loading ? <div className="flex min-h-64 items-center justify-center gap-3 font-bold text-[var(--brand-primary)]"><Loader2 className="size-6 animate-spin"/>Cargando estado...</div> : error ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><XCircle className="size-10 text-red-700"/><p className="mt-4 font-bold text-red-800">{error}</p><Button variant="outline" className="mt-5 h-11 rounded-xl" onClick={load}><RefreshCw/>Reintentar</Button></div> : <>
          <div className="flex flex-wrap items-start gap-4 border-b border-[var(--brand-border)] pb-5"><span className={`grid size-14 place-items-center rounded-2xl ${rejected ? "bg-red-50 text-red-700" : "bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"}`}><StatusIcon className="size-7"/></span><div className="min-w-0 flex-1"><h2 className="text-2xl font-extrabold text-[var(--brand-primary)]">{data?.user ? `${data.user.nombre} ${data.user.apellido}` : "Solicitud de acceso"}</h2><span className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${rejected ? "border-red-200 bg-red-50 text-red-800" : "border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]"}`}><span className="size-1.5 rounded-full bg-current"/>{statusLabel}</span></div></div>
          {data?.request ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><StatusField label="Solicitud enviada" value={new Date(data.request.enviadaAt).toLocaleString("es-AR")}/><StatusField label="Última revisión" value={data.request.revisadaAt ? new Date(data.request.revisadaAt).toLocaleString("es-AR") : "Todavía no revisada"}/></div> : null}
          <div className={`mt-5 rounded-2xl border p-5 ${rejected ? "border-red-200 bg-red-50" : "border-[var(--brand-border-soft)] bg-[var(--brand-control)]"}`}><p className="font-extrabold">{rejected ? "La solicitud necesita correcciones" : approved ? "Solicitud aprobada" : status === "PENDIENTE" ? "Solicitud en revisión" : "No encontramos una solicitud"}</p><p className="mt-2 text-sm leading-6">{rejected ? data?.request?.motivoRechazo || "Revisá los datos indicados por administración y enviá nuevamente la solicitud." : approved ? "Tu acceso fue habilitado. Ya podés ingresar al portal ciudadano." : status === "PENDIENTE" ? "La administración está verificando la información. Recibirás una notificación cuando finalice la revisión." : "No hay solicitudes asociadas a esta cuenta."}</p></div>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:justify-between"><Button asChild variant="outline" className="h-12 rounded-xl px-7 font-bold"><Link href="/login"><ArrowLeft/>Volver</Link></Button>{rejected ? <Button asChild className="h-12 rounded-xl bg-[var(--brand-primary)] px-7 font-bold"><Link href="/request-access"><Send/>Corregir y reenviar</Link></Button> : approved ? <Button asChild className="h-12 rounded-xl bg-[var(--brand-primary)] px-7 font-bold"><Link href="/login"><LogIn/>Ingresar</Link></Button> : null}</div>
        </>}
      </section>
    </section>
  </main>;
}

function StatusField({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-control)] p-4"><p className="text-xs font-bold uppercase text-[var(--brand-secondary)]">{label}</p><p className="mt-1 font-bold text-[var(--brand-ink)]">{value}</p></div>; }
