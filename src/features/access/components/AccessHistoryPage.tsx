"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, CheckCircle2, ChevronRight, CircleX, History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAccessEstablishment } from "../hooks/useAccessEstablishment";
import { listAccessHistory } from "../services/access.service";
import { AccessShell } from "./AccessShell";

type Row = { id:string; fechaHora:string; nombreSnapshot:string|null; documentoSnapshot:string|null; resultado:string; motivo:string; origen:string; anuladoAt:string|null };
const origins:Record<string,string>={QR:"QR anterior",QR_DIGITAL:"QR digital",CARNET_FISICO:"Carnet físico",MANUAL:"Manual"};

export function AccessHistoryPage(){
  const establishment=useAccessEstablishment();
  const[search,setSearch]=useState("");
  const[result,setResult]=useState("");
  const[origin,setOrigin]=useState("");
  const[items,setItems]=useState<Row[]>([]);
  useEffect(()=>{if(!establishment.establishmentId){setItems([]);return}void listAccessHistory({establishmentId:establishment.establishmentId,search:search||undefined,result:result||undefined,origin:origin||undefined,page:1,pageSize:20}).then(data=>setItems(data.items))},[establishment.establishmentId,search,result,origin]);
  const filters={search,result,origin,setSearch,setResult,setOrigin};
  return <><div className="md:hidden">{establishment.loading?<div className="m-4 h-64 animate-pulse rounded-3xl bg-[var(--brand-panel)]"/>:<MobileHistory establishmentId={establishment.establishmentId} items={items} {...filters}/>}</div><div className="hidden md:block"><AccessShell title="Historial de accesos" description="Consultá intentos permitidos, rechazados y anulados." stateOverride={establishment}>{({establishmentId})=><DesktopHistory establishmentId={establishmentId} items={items} {...filters}/>}</AccessShell></div></>;
}

type HistoryProps={establishmentId:string;items:Row[];search:string;result:string;origin:string;setSearch:(value:string)=>void;setResult:(value:string)=>void;setOrigin:(value:string)=>void};

function MobileHistory(props:HistoryProps){
  return <main className="min-h-full overflow-x-hidden bg-[var(--brand-page)] px-4 pb-6 pt-5"><header className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><History className="size-6"/></span><div><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">Historial de accesos</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Consultá intentos permitidos, rechazados y anulados.</p></div></header>{!props.establishmentId?<div className="mt-5 grid min-h-48 place-items-center rounded-3xl border border-dashed border-[var(--brand-border)] bg-white p-5 text-center text-sm text-[var(--brand-muted)]">Seleccioná un establecimiento.</div>:<><div className="relative mt-5"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--brand-primary)]"/><Input value={props.search} onChange={event=>props.setSearch(event.target.value)} placeholder="Buscar persona o DNI..." className="h-12 rounded-2xl border-[var(--brand-secondary)]/35 bg-white pl-12"/></div><div className="mt-3 grid min-w-0 grid-cols-2 gap-2"><ResultSelect {...props}/><OriginSelect {...props}/></div><section className="mt-4 grid gap-2">{props.items.length?props.items.map(row=><MobileHistoryCard key={row.id} row={row}/>):<div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-[var(--brand-border)] bg-white p-5 text-center text-sm text-[var(--brand-muted)]">No hay accesos para mostrar.</div>}</section></>}</main>;
}

function MobileHistoryCard({row}:{row:Row}){
  const annulled=Boolean(row.anuladoAt),allowed=row.resultado==="PERMITIDO",date=new Date(row.fechaHora),Icon=annulled?Ban:allowed?CheckCircle2:CircleX;
  const badge=annulled?"Anulado":allowed?"Permitido":"Rechazado";
  const tone=annulled?"border-[var(--brand-secondary)]/35 bg-[var(--brand-panel)] text-[var(--brand-primary)]":allowed?"border-[var(--brand-secondary)]/35 bg-[var(--brand-panel)] text-[var(--brand-primary)]":"border-red-200 bg-red-50 text-red-700";
  const compactDate=`${date.toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"})} · ${date.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}`;
  return <Link href={`/reception/${row.id}`} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-3 shadow-sm"><span className={`grid size-10 shrink-0 place-items-center rounded-full border ${tone}`}><Icon className="size-5"/></span><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-[var(--brand-primary)]">{row.nombreSnapshot??"No identificado"}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--brand-muted)]">DNI {row.documentoSnapshot||"No informado"}</span><span className="mt-1 block min-w-0 truncate text-[10px] font-medium text-[var(--brand-ink)]"><span>{formatReason(row.motivo)}</span><span className="text-[var(--brand-muted)]"> · {origins[row.origen]??row.origen}</span></span></span><span className="flex shrink-0 items-center gap-1.5"><span className="flex flex-col items-end gap-1.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${tone}`}>{badge}</span><span className="whitespace-nowrap text-[10px] text-[var(--brand-muted)]">{compactDate}</span></span><ChevronRight className="size-4 shrink-0 text-[var(--brand-secondary)]"/></span></Link>;
}

function DesktopHistory(props:HistoryProps){if(!props.establishmentId)return <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[var(--brand-secondary)]/40 bg-white text-[var(--brand-text)]">Seleccioná un establecimiento.</div>;return <div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]"><Input value={props.search} onChange={event=>props.setSearch(event.target.value)} placeholder="Buscar persona o DNI..."/><ResultSelect {...props}/><OriginSelect {...props}/></div><section className="overflow-hidden rounded-3xl border border-[var(--brand-secondary)]/25 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[var(--brand-panel)] text-[var(--brand-primary)]"><tr><th className="p-4">Fecha y hora</th><th className="p-4">Persona</th><th className="p-4">Resultado</th><th className="p-4">Motivo</th><th className="p-4">Origen</th><th className="p-4">Estado</th></tr></thead><tbody>{props.items.map(row=><tr key={row.id} className="border-t border-[var(--brand-secondary)]/15"><td className="p-4"><Link className="font-semibold text-[var(--brand-primary)] hover:underline" href={`/reception/${row.id}`}>{new Date(row.fechaHora).toLocaleString("es-AR")}</Link></td><td className="p-4">{row.nombreSnapshot??"No identificado"}<small className="block text-[var(--brand-text)]">{row.documentoSnapshot}</small></td><td className="p-4">{row.resultado==="PERMITIDO"?"Permitido":"Rechazado"}</td><td className="p-4">{formatReason(row.motivo)}</td><td className="p-4">{origins[row.origen]??row.origen}</td><td className="p-4">{row.anuladoAt?"Anulado":"Vigente"}</td></tr>)}</tbody></table>{!props.items.length?<div className="grid min-h-40 place-items-center text-[var(--brand-text)]">No hay accesos para mostrar.</div>:null}</div></section></div>}

function ResultSelect({result,setResult}:HistoryProps){return <select value={result} onChange={event=>setResult(event.target.value)} className="h-11 min-w-0 rounded-xl border border-[var(--brand-secondary)]/35 bg-white px-2 text-xs text-[var(--brand-primary)]"><option value="">Todos los resultados</option><option value="PERMITIDO">Permitidos</option><option value="RECHAZADO">Rechazados</option></select>}
function OriginSelect({origin,setOrigin}:HistoryProps){return <select value={origin} onChange={event=>setOrigin(event.target.value)} className="h-11 min-w-0 rounded-xl border border-[var(--brand-secondary)]/35 bg-white px-2 text-xs text-[var(--brand-primary)]"><option value="">Todos los orígenes</option><option value="QR_DIGITAL">QR digital</option><option value="CARNET_FISICO">Carnet físico</option><option value="MANUAL">Manual</option><option value="QR">QR anterior</option></select>}
function formatReason(value:string){return value.replaceAll("_"," ").toLocaleLowerCase("es-AR")}
