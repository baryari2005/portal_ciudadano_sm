"use client";
import { MapPin } from "lucide-react";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { useWorkspaceEstablishment } from "./WorkspaceEstablishmentProvider";
export function WorkspaceEstablishmentSelector(){const{options,establishmentId,setEstablishmentId}=useWorkspaceEstablishment();return <div className="hidden items-center gap-2 xl:flex"><MapPin className="size-4 text-[#DDEF8F]"/><Select value={establishmentId} onValueChange={setEstablishmentId}><SelectTrigger className="h-10 w-56 border-white/25 bg-white/10 text-white"><SelectValue placeholder="Establecimiento"/></SelectTrigger><SelectContent>{options.map(item=><SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent></Select></div>}
