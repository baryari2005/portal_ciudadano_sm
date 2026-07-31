import type { ActivityScheduleStatus, WeekDay } from "../types/activity-schedule.types";
export const dayLabel = (day: WeekDay) => ({ LUNES:"Lunes", MARTES:"Martes", MIERCOLES:"Miércoles", JUEVES:"Jueves", VIERNES:"Viernes", SABADO:"Sábado", DOMINGO:"Domingo" })[day];
export const statusLabel = (status: ActivityScheduleStatus) => ({ ACTIVO:"Activo", SUSPENDIDO:"Suspendido", CANCELADO:"Cancelado", FINALIZADO:"Finalizado" })[status];

