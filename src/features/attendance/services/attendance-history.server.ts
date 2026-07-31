import { prisma } from "@/lib/db";

export async function getUserAttendanceHistory(userId: string, limit = 5) {
  const rows = await prisma.asistencia.findMany({
    where: { inscripcion: { usuarioId: userId } },
    include: {
      claseActividad: {
        include: {
          horarioActividad: { include: { actividad: { select: { id: true, nombre: true } } } },
          establecimiento: { select: { id: true, nombre: true } },
        },
      },
      inscripcion: { select: { estado: true } },
    },
    orderBy: { claseActividad: { fecha: "desc" } },
    take: Math.min(Math.max(limit, 1), 20),
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.estado,
    justificationReason: row.motivoJustificacion,
    enrollmentStatus: row.inscripcion.estado,
    session: {
      id: row.claseActividad.id,
      date: row.claseActividad.fecha.toISOString().slice(0, 10),
      startTime: row.claseActividad.horaInicio,
      endTime: row.claseActividad.horaFin,
      activity: { id: row.claseActividad.horarioActividad.actividad.id, name: row.claseActividad.horarioActividad.actividad.nombre },
      establishment: { id: row.claseActividad.establecimiento.id, name: row.claseActividad.establecimiento.nombre },
    },
  }));
}
