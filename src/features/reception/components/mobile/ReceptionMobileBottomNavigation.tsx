"use client";

import Link from "next/link";
import { ClipboardCheck, Home, QrCode, ScanLine, UserRound, type LucideIcon } from "lucide-react";

const items:Array<{href:string;label:string;icon:LucideIcon;central?:boolean}>=[
  {href:"/reception",label:"Inicio",icon:Home},
  {href:"/reception/scan",label:"Escanear QR",icon:ScanLine},
  {href:"/reception/qr",label:"Mi QR",icon:QrCode,central:true},
  {href:"/reception/enrollments",label:"Inscripciones",icon:ClipboardCheck},
  {href:"/reception/profile",label:"Mi perfil",icon:UserRound},
];

export function ReceptionMobileBottomNavigation({pathname}:{pathname:string}){return <nav aria-label="Navegación principal del Portal de Recepción" className="relative z-40 col-[1/2] row-[3/4] border-t border-[var(--brand-border-soft)] bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(29,79,54,0.10)] md:hidden"><div className="grid h-[72px] grid-cols-5 items-end">{items.map(({href,label,icon:Icon,central})=>{const active=href==="/reception"?pathname===href:pathname===href||pathname.startsWith(`${href}/`);return <Link key={href} href={href} aria-current={active?"page":undefined} aria-label={label} className={central?"relative flex h-full min-w-0 flex-col items-center justify-end pb-2":`flex h-full min-w-0 flex-col items-center justify-end gap-1 pb-2 text-[10px] font-bold ${active?"text-[var(--brand-primary)]":"text-[var(--brand-muted)]"}`}>{central?<><span className={`absolute -top-5 grid size-[58px] place-items-center rounded-full border-4 border-white text-white shadow-lg ${active?"bg-[var(--brand-secondary)]":"bg-[var(--brand-primary)]"}`}><Icon className="size-7"/></span><span className={`text-[10px] font-extrabold ${active?"text-[var(--brand-primary)]":"text-[var(--brand-muted)]"}`}>{label}</span></>:<><Icon className={`size-5 ${active?"stroke-[2.5]":""}`}/><span className="w-full truncate px-0.5 text-center">{label}</span></>}</Link>})}</div></nav>}
