import type { ActivitySessionStatus } from "@/features/activity-sessions/types/activity-session.types";
import type { EnrollmentStatus } from "@/features/enrollments/types/enrollment.types";
import type { AttendanceStatus } from "@/features/attendance/types/attendance.types";

type CitizenScheduleEnrollmentStatus = Extract<
  EnrollmentStatus,
  "CONFIRMADA" | "PENDIENTE" | "LISTA_ESPERA" | "CANCELADA"
>;
export type CitizenScheduleDisplayStatus = CitizenScheduleEnrollmentStatus | AttendanceStatus | "ASISTENCIA_PENDIENTE";

export type CitizenScheduleItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionStatus: ActivitySessionStatus;
  enrollmentStatus: CitizenScheduleEnrollmentStatus;
  displayStatus: CitizenScheduleDisplayStatus;
  space: string | null;
  activity: { id: string; name: string; enrollmentMode: "PERMANENTE" | "POR_PERIODO" | "POR_CLASE"; cancellationNoticeHours: number };
  establishment: { id: string; name: string };
  primaryProfessor: string | null;
  reservation: { id: string; status: "RESERVADA" | "LISTA_ESPERA" | "OFRECIDA" | "CANCELADA" | "AUSENCIA_INFORMADA"; justified: boolean | null; reason: string | null; offerExpiresAt: string | null } | null;
  capacity: number;
  reservedCount: number;
};

export type CitizenSchedule = { total: number; items: CitizenScheduleItem[] };
