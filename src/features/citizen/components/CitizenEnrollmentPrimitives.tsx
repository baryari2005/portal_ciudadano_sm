import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CitizenEnrollment } from "../types/citizen-enrollment.types";

const labels:Record<string,string>={CONFIRMADA:"Confirmada",LISTA_ESPERA:"Lista de espera",PENDIENTE:"Pendiente",CANCELADA:"Cancelada",RECHAZADA:"Rechazada",BAJA:"Baja"};
const dayOrder=["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
const dayLabels:Record<string,string>={LUNES:"Lun",MARTES:"Mar",MIERCOLES:"Mié",JUEVES:"Jue",VIERNES:"Vie",SABADO:"Sáb",DOMINGO:"Dom"};

export function EnrollmentBadge({status}:{status:string}){return <Badge variant="outline" className={cn("rounded-full px-2 py-1 text-[9px] font-bold",status==="CONFIRMADA"?"border-[var(--brand-secondary)]/40 bg-[var(--brand-highlight)] text-[var(--brand-primary)]":status==="PENDIENTE"||status==="LISTA_ESPERA"?"border-amber-300 bg-amber-50 text-amber-900":"border-[var(--brand-neutral)] bg-[var(--brand-neutral)]/15 text-[#555]")}>{labels[status]??status}</Badge>}
export function formatCitizenEnrollmentScheduleSummary(item:CitizenEnrollment){const schedules=item.selectedSchedules.length?item.selectedSchedules:[item.schedule];const groups=new Map<string,string[]>();schedules.slice().sort((a,b)=>dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day)||a.startTime.localeCompare(b.startTime)).forEach(schedule=>{const time=schedule.startTime===schedule.endTime?schedule.startTime:`${schedule.startTime} a ${schedule.endTime}`;groups.set(time,[...(groups.get(time)??[]),dayLabels[schedule.day]??schedule.day]);});return[...groups.entries()].map(([time,days])=>`${days.join(", ")} · ${time}`).join(" | ")}
