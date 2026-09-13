import type { Prisma } from "@prisma/client";

type SessionScope = {
  horarioActividadId: string;
  horaInicio: string;
  horaFin: string;
};

type EnrollmentScope = {
  horarioActividadId: string;
  horarios: Array<{
    horarioActividadId: string;
    horaInicio: string | null;
    horaFin: string | null;
  }>;
};

export function enrollmentSessionScopeWhere(session: SessionScope): Prisma.InscripcionWhereInput {
  return {
    OR: [
      {
        horarios: {
          some: {
            horarioActividadId: session.horarioActividadId,
            OR: [
              { horaInicio: null },
              { horaInicio: session.horaInicio, horaFin: session.horaFin },
            ],
          },
        },
      },
      {
        horarioActividadId: session.horarioActividadId,
        horarios: { none: {} },
      },
    ],
  };
}

export function enrollmentMatchesSession(enrollment: EnrollmentScope, session: SessionScope) {
  if (!enrollment.horarios.length) {
    return enrollment.horarioActividadId === session.horarioActividadId;
  }

  return enrollment.horarios.some(
    (slot) =>
      slot.horarioActividadId === session.horarioActividadId &&
      (slot.horaInicio === null ||
        (slot.horaInicio === session.horaInicio && slot.horaFin === session.horaFin)),
  );
}
