import { Prisma, type PrismaClient } from "@prisma/client";

import { createNotifications } from "@/features/notifications/services/notifications.server";

type Assignment = { professorId: string; isPrimary: boolean; userId: string };
type Context = { kind: "schedule" | "session"; entityId: string; activityName: string; establishmentId: string; establishmentName: string; space?: string | null; day?: string | null; date?: Date | null; startTime: string; endTime: string };

const roleLabel = (primary: boolean) => primary ? "profesor principal" : "profesor adicional";
const dayLabel = (day?: string | null) => day ? day.toLocaleLowerCase("es-AR").replace("miercoles", "miércoles").replace("sabado", "sábado") : "día informado";
const dateLabel = (date: Date) => new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);

export async function notifyTeacherAssignmentChanges(tx: Prisma.TransactionClient | PrismaClient, input: { previous: Assignment[]; current: Assignment[]; context: Context; senderId?: string | null; operationKey: string }) {
  const previous = new Map(input.previous.map((item) => [item.professorId, item]));
  const changes = input.current.flatMap((assignment) => {
    const old = previous.get(assignment.professorId);
    return old?.isPrimary === assignment.isPrimary ? [] : [{ assignment, roleChanged: Boolean(old) }];
  });
  if (!changes.length) return [];
  const context = input.context;
  return createNotifications(changes.map(({ assignment, roleChanged }) => {
    const role = roleLabel(assignment.isPrimary);
    const location = context.space ? `${context.establishmentName}, espacio ${context.space}` : context.establishmentName;
    const description = context.kind === "session" && context.date
      ? `la clase de ${context.activityName} del ${dateLabel(context.date)}, de ${context.startTime} a ${context.endTime}, en ${location}`
      : `el horario de ${context.activityName}, los ${dayLabel(context.day)}, de ${context.startTime} a ${context.endTime}, en ${location}`;
    return {
      userId: assignment.userId,
      senderId: input.senderId,
      type: "CLASE_MODIFICADA" as const,
      title: roleChanged ? "Asignación docente actualizada" : "Nueva clase asignada",
      message: roleChanged ? `Tu asignación en ${description} fue actualizada a ${role}. Revisá nuevamente tus clases.` : `Fuiste asignado como ${role} a ${description}. Revisá nuevamente tus clases.`,
      actionUrl: "/teacher/classes",
      actionLabel: "Ver mis clases",
      entityType: context.kind === "session" ? "activity_session" : "activity_schedule",
      entityId: context.entityId,
      metadata: { assignmentKind: context.kind, activityName: context.activityName, establishmentId: context.establishmentId, establishmentName: context.establishmentName, space: context.space ?? null, teacherId: assignment.professorId, teacherRole: assignment.isPrimary ? "PRIMARY" : "ADDITIONAL" },
      deduplicationKey: `teacher-assignment:${context.kind}:${context.entityId}:${assignment.professorId}:${assignment.isPrimary ? "primary" : "additional"}:${input.operationKey}`,
    };
  }), tx);
}
