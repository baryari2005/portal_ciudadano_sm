import type { ActivitySessionStatus } from "../types/activity-session.types";
export const sessionStatusLabel=(v:ActivitySessionStatus)=>({PROGRAMADA:"Programada",EN_CURSO:"En curso",FINALIZADA:"Finalizada",SUSPENDIDA:"Suspendida",CANCELADA:"Cancelada"})[v];
export const formatSessionDate=(v:string)=>new Intl.DateTimeFormat("es-AR",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(`${v}T00:00:00Z`));
