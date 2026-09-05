import { prisma } from "@/lib/db";
import type {
  DashboardFilters,
  DashboardSummary,
  RankingItem,
} from "../types/dashboard-report.types";
const start = (v: string) => new Date(`${v}T00:00:00.000Z`),
  end = (v: string) => new Date(`${v}T23:59:59.999Z`),
  day = (v: Date) => v.toISOString().slice(0, 10);
export async function getDashboardSummary(
  f: DashboardFilters,
): Promise<DashboardSummary> {
  const range = { gte: start(f.from), lte: end(f.to) },
    scheduleWhere = {
      estado: "ACTIVO" as const,
      actividadId: f.activityId,
      establecimientoId: f.establishmentId,
    };
  const [
    activeActivities,
    activeProfessors,
    schedules,
    participating,
    confirmedEnrollments,
    waitlistEnrollments,
    pendingDocuments,
    rejectedDocuments,
    periodEnrollments,
    sessions,
    attendance,
    documents,
    upcoming,
    activitiesWithoutSchedules,
    pendingEnrollments,
  ] = await Promise.all([
    prisma.actividad.count({
      where: {
        estado: { in: ["ACTIVA", "SIN_CUPO", "COMPLETA"] },
        id: f.activityId,
      },
    }),
    prisma.profesor.count({ where: { estado: "ACTIVO" } }),
    prisma.horarioActividad.findMany({
      where: scheduleWhere,
      select: {
        id: true,
        diaSemana: true,
        horaInicio: true,
        horaFin: true,
        cupoMaximo: true,
        permiteSobrecupo: true,
        sobrecupoMaximo: true,
        actividad: { select: { id: true, nombre: true } },
        establecimiento: { select: { id: true, nombre: true } },
        inscripciones: {
          where: { estado: { in: ["CONFIRMADA", "LISTA_ESPERA"] } },
          select: { estado: true },
        },
        clases: {
          where: { fecha: range },
          select: { estado: true, asistencias: { select: { estado: true } } },
        },
      },
    }),
    prisma.usuario.count({
      where: {
        inscripciones: {
          some: {
            estado: "CONFIRMADA",
            horarioActividad: {
              actividadId: f.activityId,
              establecimientoId: f.establishmentId,
            },
          },
        },
      },
    }),
    prisma.inscripcion.count({
      where: {
        estado: "CONFIRMADA",
        horarioActividad: {
          actividadId: f.activityId,
          establecimientoId: f.establishmentId,
        },
      },
    }),
    prisma.inscripcion.count({
      where: {
        estado: "LISTA_ESPERA",
        horarioActividad: {
          actividadId: f.activityId,
          establecimientoId: f.establishmentId,
        },
      },
    }),
    prisma.documentoInscripcion.count({
      where: {
        estado: "PENDIENTE",
        inscripcion: {
          horarioActividad: {
            actividadId: f.activityId,
            establecimientoId: f.establishmentId,
          },
        },
      },
    }),
    prisma.documentoInscripcion.count({
      where: {
        estado: "RECHAZADO",
        inscripcion: {
          horarioActividad: {
            actividadId: f.activityId,
            establecimientoId: f.establishmentId,
          },
        },
      },
    }),
    prisma.inscripcion.findMany({
      where: {
        fechaInscripcion: range,
        horarioActividad: {
          actividadId: f.activityId,
          establecimientoId: f.establishmentId,
        },
      },
      select: { estado: true, fechaInscripcion: true },
    }),
    prisma.claseActividad.findMany({
      where: {
        fecha: range,
        horarioActividad: { actividadId: f.activityId },
        establecimientoId: f.establishmentId,
      },
      select: { id: true, fecha: true, estado: true },
    }),
    prisma.asistencia.findMany({
      where: {
        horaRegistro: range,
        claseActividad: {
          horarioActividad: { actividadId: f.activityId },
          establecimientoId: f.establishmentId,
          estado: { not: "CANCELADA" },
        },
      },
      select: { estado: true, horaRegistro: true },
    }),
    prisma.documentoInscripcion.findMany({
      where: {
        subidoAt: range,
        inscripcion: {
          horarioActividad: {
            actividadId: f.activityId,
            establecimientoId: f.establishmentId,
          },
        },
      },
      select: {
        estado: true,
        subidoAt: true,
        revisadoAt: true,
        requisitoNombreSnapshot: true,
      },
    }),
    prisma.claseActividad.findMany({
      where: {
        fecha: { gte: new Date() },
        estado: { notIn: ["CANCELADA", "FINALIZADA"] },
        horarioActividad: { actividadId: f.activityId },
        establecimientoId: f.establishmentId,
      },
      include: {
        horarioActividad: {
          include: {
            actividad: { select: { nombre: true } },
            inscripciones: {
              where: { estado: "CONFIRMADA" },
              select: { id: true },
            },
          },
        },
        establecimiento: { select: { nombre: true } },
        profesores: {
          include: {
            profesor: {
              include: {
                usuario: { select: { nombre: true, apellido: true } },
              },
            },
          },
        },
      },
      orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
      take: 5,
    }),
    prisma.actividad.count({
      where: {
        estado: { in: ["ACTIVA", "SIN_CUPO", "COMPLETA"] },
        horarios: { none: { estado: "ACTIVO" } },
      },
    }),
    prisma.inscripcion.count({ where: { estado: "PENDIENTE" } }),
  ]);
  const rows = schedules.map((s) => {
    const confirmed = s.inscripciones.filter(
        (i) => i.estado === "CONFIRMADA",
      ).length,
      waitlist = s.inscripciones.length - confirmed,
      capacity =
        s.cupoMaximo + (s.permiteSobrecupo ? (s.sobrecupoMaximo ?? 0) : 0),
      present = s.clases
        .flatMap((c) => c.asistencias)
        .filter((a) => a.estado === "PRESENTE").length,
      totalAttendance = s.clases.flatMap((c) => c.asistencias).length;
    return {
      id: s.id,
      activityId: s.actividad.id,
      activity: s.actividad.nombre,
      day: s.diaSemana,
      startTime: s.horaInicio,
      endTime: s.horaFin,
      establishmentId: s.establecimiento.id,
      establishment: s.establecimiento.nombre,
      schedules: 1,
      capacity,
      confirmed,
      waitlist,
      available: Math.max(capacity - confirmed, 0),
      occupancy: capacity ? Math.round((confirmed / capacity) * 100) : 0,
      attendanceRate: totalAttendance
        ? Math.round((present / totalAttendance) * 100)
        : null,
      classes: s.clases.length,
    };
  });
  const merge = (
    key: "activityId" | "establishmentId",
    name: "activity" | "establishment",
  ) =>
    Object.values(
      rows.reduce<Record<string, RankingItem>>((acc, r) => {
        const id = String(r[key]);
        acc[id] ??= {
          id,
          name: r[name],
          schedules: 0,
          capacity: 0,
          confirmed: 0,
          waitlist: 0,
          classes: 0,
          available: 0,
          occupancy: 0,
        };
        acc[id].schedules++;
        acc[id].capacity += r.capacity;
        acc[id].confirmed += r.confirmed;
        acc[id].waitlist += r.waitlist;
        acc[id].classes += r.classes;
        return acc;
      }, {}),
    )
      .map((x) => ({
        ...x,
        available: Math.max(x.capacity - x.confirmed, 0),
        occupancy: x.capacity
          ? Math.round((x.confirmed / x.capacity) * 100)
          : 0,
      }))
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 10);
  const enrollmentMap = new Map<
    string,
    {
      date: string;
      confirmed: number;
      waitlist: number;
      cancelled: number;
      total: number;
    }
  >();
  for (const i of periodEnrollments) {
    const k = day(i.fechaInscripcion),
      p = enrollmentMap.get(k) ?? {
        date: k,
        confirmed: 0,
        waitlist: 0,
        cancelled: 0,
        total: 0,
      };
    p.total++;
    if (i.estado === "CONFIRMADA") p.confirmed++;
    if (i.estado === "LISTA_ESPERA") p.waitlist++;
    if (["CANCELADA", "BAJA"].includes(i.estado)) p.cancelled++;
    enrollmentMap.set(k, p);
  }
  const attendanceMap = new Map<
    string,
    {
      date: string;
      present: number;
      absent: number;
      justified: number;
      attendanceRate: number | null;
    }
  >();
  for (const a of attendance) {
    const k = day(a.horaRegistro ?? start(f.from)),
      p = attendanceMap.get(k) ?? {
        date: k,
        present: 0,
        absent: 0,
        justified: 0,
        attendanceRate: null,
      };
    if (a.estado === "PRESENTE") p.present++;
    if (a.estado === "AUSENTE") p.absent++;
    if (a.estado === "JUSTIFICADA") p.justified++;
    const total = p.present + p.absent + p.justified;
    p.attendanceRate = total ? Math.round((p.present / total) * 100) : null;
    attendanceMap.set(k, p);
  }
  const totalCapacity = rows.reduce((n, r) => n + r.capacity, 0),
    confirmed = rows.reduce((n, r) => n + r.confirmed, 0),
    waitlist = rows.reduce((n, r) => n + r.waitlist, 0),
    full = rows.filter((r) => r.available === 0).length;
  return {
    current: {
      activeActivities,
      activeSchedules: schedules.length,
      activeProfessors,
      participatingCitizens: participating,
      confirmedEnrollments,
      waitlistEnrollments,
      availableCapacity: Math.max(totalCapacity - confirmed, 0),
      fullSchedules: full,
      pendingDocuments,
      rejectedDocuments,
    },
    period: {
      newEnrollments: periodEnrollments.length,
      cancelledEnrollments: periodEnrollments.filter((i) =>
        ["CANCELADA", "BAJA"].includes(i.estado),
      ).length,
      sessionsScheduled: sessions.length,
      sessionsCompleted: sessions.filter((s) => s.estado === "FINALIZADA")
        .length,
      attendancePresent: attendance.filter((a) => a.estado === "PRESENTE")
        .length,
      attendanceAbsent: attendance.filter((a) => a.estado === "AUSENTE").length,
      attendanceJustified: attendance.filter((a) => a.estado === "JUSTIFICADA")
        .length,
      documentsUploaded: documents.length,
      documentsApproved: documents.filter((d) => d.estado === "APROBADO")
        .length,
      documentsRejected: documents.filter((d) => d.estado === "RECHAZADO")
        .length,
    },
    enrollmentTrend: [...enrollmentMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    attendanceTrend: [...attendanceMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    capacity: {
      total: totalCapacity,
      confirmed,
      available: Math.max(totalCapacity - confirmed, 0),
      waitlist,
      fullSchedules: full,
      lowOccupancySchedules: rows.filter((r) => r.occupancy < 50).length,
    },
    capacityByClass: rows
      .map((row) => ({ id: row.id, name: row.activity, day: row.day, startTime: row.startTime, endTime: row.endTime, capacity: row.capacity, confirmed: row.confirmed, available: row.available, occupancy: row.occupancy }))
      .sort((a, b) => b.confirmed - a.confirmed)
      .slice(0, 10),
    topActivities: merge("activityId", "activity"),
    topEstablishments: merge("establishmentId", "establishment"),
    upcomingSessions: upcoming.map((s) => ({
      id: s.id,
      date: day(s.fecha),
      startTime: s.horaInicio,
      status: s.estado,
      activity: s.horarioActividad.actividad.nombre,
      establishment: s.establecimiento.nombre,
      confirmed: s.horarioActividad.inscripciones.length,
      professors: s.profesores.map((p) =>
        [p.profesor.usuario.nombre, p.profesor.usuario.apellido]
          .filter(Boolean)
          .join(" "),
      ),
    })),
    alerts: [
      {
        label: "Documentos pendientes",
        value: pendingDocuments,
        href: "/enrollment-documents?status=PENDIENTE",
      },
      {
        label: "Documentos rechazados",
        value: rejectedDocuments,
        href: "/enrollment-documents?status=RECHAZADO",
      },
      {
        label: "Horarios completos",
        value: full,
        href: "/activities",
      },
      {
        label: "Actividades sin horarios",
        value: activitiesWithoutSchedules,
        href: "/activities",
      },
      {
        label: "Inscripciones pendientes",
        value: pendingEnrollments,
        href: "/enrollments?status=PENDIENTE",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
