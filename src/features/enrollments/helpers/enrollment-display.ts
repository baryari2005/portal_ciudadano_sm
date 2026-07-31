import type { EnrollmentStatus } from "../types/enrollment.types";
export const enrollmentStatusLabel=(status:EnrollmentStatus)=>({PENDIENTE:"Pendiente",CONFIRMADA:"Confirmada",LISTA_ESPERA:"En lista de espera",CANCELADA:"Cancelada",RECHAZADA:"Rechazada",BAJA:"Baja"})[status];
