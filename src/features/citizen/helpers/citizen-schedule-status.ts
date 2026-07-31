import type { AttendanceStatus } from "@/features/attendance/types/attendance.types";
import type { ActivitySessionStatus } from "@/features/activity-sessions/types/activity-session.types";
import type { CitizenScheduleDisplayStatus } from "../types/citizen-schedule.types";

const LOCAL_UTC_OFFSET = "-03:00";
const LOCAL_TIME_ZONE = "America/Argentina/Buenos_Aires";

type ScheduleStatusInput = {
  date: string;
  startTime: string;
  endTime: string;
  sessionStatus: ActivitySessionStatus;
  enrollmentStatus: "CONFIRMADA" | "PENDIENTE" | "LISTA_ESPERA" | "CANCELADA";
  cancellationDate: Date | string | null;
  attendanceStatus: AttendanceStatus | null;
  attendanceClosedAt: Date | string | null;
  now?: Date;
};

function citizenSessionInstant(date: string, time: string) {
  return new Date(`${date}T${time}:00${LOCAL_UTC_OFFSET}`).getTime();
}

function localDateText(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LOCAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getNextCitizenMonday(cancellationDate: Date | string) {
  const cancellation = new Date(cancellationDate);
  const localMidnight = new Date(`${localDateText(cancellation)}T00:00:00${LOCAL_UTC_OFFSET}`);
  const weekDay = localMidnight.getUTCDay();
  const daysUntilNextMonday = weekDay === 1 ? 7 : (8 - weekDay) % 7;
  return new Date(localMidnight.getTime() + daysUntilNextMonday * 86_400_000);
}

export function isCanceledCitizenSessionVisible(date: string, startTime: string, cancellationDate: Date | string | null) {
  if (!cancellationDate) return true;
  return citizenSessionInstant(date, startTime) < getNextCitizenMonday(cancellationDate).getTime();
}

export function hasCitizenSessionEnded(date: string, endTime: string, now = new Date()) {
  return now.getTime() >= citizenSessionInstant(date, endTime);
}

export function resolveCitizenScheduleStatus(input: ScheduleStatusInput): CitizenScheduleDisplayStatus {
  if (input.sessionStatus === "CANCELADA") return "CANCELADA";
  if (input.enrollmentStatus === "CANCELADA" && input.cancellationDate) {
    const cancellationTime = new Date(input.cancellationDate).getTime();
    if (citizenSessionInstant(input.date, input.startTime) >= cancellationTime) return "CANCELADA";
  }
  if (!hasCitizenSessionEnded(input.date, input.endTime, input.now)) return input.enrollmentStatus;
  if (!input.attendanceClosedAt || !input.attendanceStatus) return "ASISTENCIA_PENDIENTE";
  return input.attendanceStatus;
}
