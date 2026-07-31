import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { createActivityScheduleSchema, updateActivityScheduleSchema } from "../src/features/activity-schedules/schemas/activity-schedule.schema";
import { changeActivityScheduleStatus, createActivitySchedule, getActivitySchedule, updateActivitySchedule } from "../src/features/activity-schedules/services/activity-schedules.server";

const token = randomUUID();
const ids = { establishment: `test-facility-${token}`, activity: `test-activity-${token}`, users: [randomUUID(), randomUUID()], professors: [] as string[], schedules: [] as string[] };
const base = { actividadId: ids.activity, establecimientoId: ids.establishment, diaSemana: "LUNES" as const, horaInicio: "09:00", horaFin: "10:00", espacio: "Salón QA", observaciones: "Prueba temporal", cupoMaximo: 20, permiteListaEspera: true, permiteSobrecupo: true, sobrecupoMaximo: 3, estado: "ACTIVO" as const, profesoresIds: [] as string[], profesorPrincipalId: null as string | null };

async function rejects(action: () => Promise<unknown>, label: string) { let failed = false; try { await action(); } catch { failed = true; } assert.equal(failed, true, label); }

async function main() {
  try {
    await prisma.establecimiento.create({ data: { id: ids.establishment, nombre: "Sede temporal QA", direccion: "QA 123" } });
    await prisma.actividad.create({ data: { id: ids.activity, establecimientoId: ids.establishment, nombre: "Actividad temporal QA" } });
    const existingRole = await prisma.rol.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
    assert.ok(existingRole, "Se necesita un rol existente para crear usuarios temporales sin alterar RBAC");
    for (const [index, id] of ids.users.entries()) {
      const user = await prisma.usuario.create({ data: { id, userId: `qa-${token}-${index}`, email: `qa-${token}-${index}@example.invalid`, nombre: index ? "Profesor" : "Docente", apellido: `QA ${index}`, rolId: existingRole.id } });
      const professor = await prisma.profesor.create({ data: { usuarioId: user.id, especialidad: "QA" } });
      ids.professors.push(professor.id);
    }

    const withoutProfessors = await createActivitySchedule({ ...base, horaInicio: "07:00", horaFin: "08:00" }); ids.schedules.push(withoutProfessors.id);
    const oneProfessor = await createActivitySchedule({ ...base, profesoresIds: [ids.professors[0]], profesorPrincipalId: ids.professors[0] }); ids.schedules.push(oneProfessor.id);
    const several = await createActivitySchedule({ ...base, horaInicio: "10:00", horaFin: "11:00", espacio: "Salón QA 2", profesoresIds: ids.professors, profesorPrincipalId: ids.professors[1] }); ids.schedules.push(several.id);
    assert.equal(several.professors.length, 2); assert.equal(several.professors.filter((p: { isPrimary: boolean }) => p.isPrimary).length, 1);

    assert.equal(createActivityScheduleSchema.safeParse({ ...base, horaInicio: "11:00", horaFin: "10:00" }).success, false);
    assert.equal(createActivityScheduleSchema.safeParse({ ...base, cupoMaximo: 0 }).success, false);
    assert.equal(createActivityScheduleSchema.safeParse({ ...base, profesoresIds: [ids.professors[0], ids.professors[0]] }).success, false);
    assert.equal(createActivityScheduleSchema.safeParse({ ...base, profesorPrincipalId: ids.professors[0] }).success, false);
    assert.equal(updateActivityScheduleSchema.safeParse({}).success, false);
    await prisma.profesor.update({ where: { id: ids.professors[1] }, data: { estado: "INACTIVO" } });
    await rejects(() => createActivitySchedule({ ...base, horaInicio: "12:00", horaFin: "13:00", profesoresIds: [ids.professors[1]] }), "Debe rechazar un profesor inactivo nuevo");
    await rejects(() => createActivitySchedule({ ...base, establecimientoId: "inexistente" }), "Debe rechazar una sede inexistente");
    await rejects(() => createActivitySchedule({ ...base, actividadId: "inexistente" }), "Debe rechazar una actividad inexistente");
    await rejects(() => createActivitySchedule({ ...base, horaInicio: "09:30", horaFin: "10:30", profesoresIds: [ids.professors[0]] }), "Debe rechazar profesor superpuesto");
    await rejects(() => createActivitySchedule({ ...base, horaInicio: "09:30", horaFin: "10:30", espacio: " salón   qa " }), "Debe rechazar espacio normalizado superpuesto");

    const edited = await updateActivitySchedule(oneProfessor.id, { diaSemana: "MARTES", horaInicio: "14:00", horaFin: "15:00", espacio: "SUM", profesoresIds: [], profesorPrincipalId: null });
    assert.equal(edited.professors.length, 0); assert.equal(edited.space, "SUM");
    await updateActivitySchedule(oneProfessor.id, { observaciones: "Conserva profesores omitidos" });
    for (const status of ["SUSPENDIDO", "ACTIVO", "FINALIZADO"] as const) await changeActivityScheduleStatus(oneProfessor.id, status);
    await changeActivityScheduleStatus(oneProfessor.id, "CANCELADO");
    assert.equal((await getActivitySchedule(oneProfessor.id))?.status, "CANCELADO", "La cancelación debe ser lógica");
    console.log("Verificación funcional de horarios: OK");
  } finally {
    await prisma.horarioActividad.deleteMany({ where: { id: { in: ids.schedules } } });
    await prisma.profesor.deleteMany({ where: { id: { in: ids.professors } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.actividad.deleteMany({ where: { id: ids.activity } });
    await prisma.establecimiento.deleteMany({ where: { id: ids.establishment } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
