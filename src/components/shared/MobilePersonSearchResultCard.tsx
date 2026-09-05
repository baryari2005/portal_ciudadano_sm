"use client";

import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = { name:string; documentNumber?:string|null; email?:string|null; avatarUrl?:string|null; onClick:()=>void };

function initials(name:string){return name.split(" ").filter(Boolean).map(part=>part[0]).join("").slice(0,2).toUpperCase()||"US"}

export function MobilePersonSearchResultCard({name,documentNumber,email,avatarUrl,onClick}:Props){return <button type="button" onClick={onClick} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-3 text-left shadow-sm"><Avatar className="size-16 shrink-0 rounded-full border border-[var(--brand-border-soft)] bg-[var(--brand-primary-strong)] shadow-sm"><AvatarImage src={avatarUrl??undefined} alt={`Foto de ${name}`}/><AvatarFallback className="bg-[var(--brand-primary-strong)] text-xl font-extrabold text-white">{initials(name)}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate text-[var(--brand-primary)]">{name}</strong><small className="mt-1 block text-[var(--brand-muted)]">DNI {documentNumber||"No informado"}</small><small className="block truncate text-[var(--brand-muted)]">{email||"Email no informado"}</small></span><ChevronRight className="size-5 shrink-0 text-[var(--brand-secondary)]"/></button>}
