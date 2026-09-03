import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db";
import { registerManualAccess } from "../src/features/access/services/access.server";
import { getAttendanceRoster } from "../src/features/attendance/services/attendance.server";
import { signJwt } from "../src/lib/jwt";
import { POST as adminAttendanceBatch } from "../src/app/api/attendance/batch/route";
import { POST as teacherAttendanceBatch } from "../src/app/api/teacher/attendance/[sessionId]/route";

const marker = `QA_ACCESS_ATTENDANCE_${Date.now()}`;
const ids = { role: 0, users: [] as string[], teacherProfile: "", establishment: "", activity: "", schedules: [] as string[], sessions: [] as string[], enrollments: [] as string[], access: "" };
const zone = "America/Argentina/Buenos_Aires";

function localParts() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, string> = { Monday: "LUNES", Tuesday: "MARTES", Wednesday: "MIERCOLES", Thursday: "JUEVES", Friday: "VIERNES", Saturday: "SABADO", Sunday: "DOMINGO" };
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), minute: Number(get("minute")), weekday: weekdays[get("weekday")] };
}
function time(total: number) { const normalized = Math.max(0, Math.min(1439, total)); return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`; }

async function cleanup() {
  if (ids.access) await prisma.registroAcceso.deleteMany({ where: { id: ids.access } });
  if (ids.sessions.length) await prisma.asistencia.deleteMany({ where: { claseActividadId: { in: ids.sessions } } });
  if (ids.sessions.length) await prisma.claseActividad.deleteMany({ where: { id: { in: ids.sessions } } });
  if (ids.enrollments.length) await prisma.inscripcion.deleteMany({ where: { id: { in: ids.enrollments } } });
  if (ids.schedules.length) await prisma.horarioActividad.deleteMany({ where: { id: { in: ids.schedules } } });
  if (ids.activity) await prisma.actividad.deleteMany({ where: { id: ids.activity } });
  if (ids.establishment) await prisma.establecimiento.deleteMany({ where: { id: ids.establishment } });
  if (ids.teacherProfile) await prisma.profesor.deleteMany({ where: { id: ids.teacherProfile } });
  if (ids.users.length) await prisma.usuario.deleteMany({ where: { id: { in: ids.users } } });
  if (ids.role) await prisma.rol.deleteMany({ where: { id: ids.role } });
}

async function main() {
  const now = localParts(), currentMinutes = now.hour * 60 + now.minute;
  const roles = await prisma.rol.findMany({ where: { codigo: { in: ["admin", "teacher"] } } });
  const adminRole = roles.find((role) => role.codigo === "admin"), teacherRole = roles.find((role) => role.codigo === "teacher");
  assert.ok(adminRole && teacherRole, "Faltan los roles admin o teacher.");
  const role = await prisma.rol.create({ data: { nombre: marker, codigo: marker.toLowerCase() } }); ids.role = role.id;
  const operator = await prisma.usuario.create({ data: { userId: `${marker}_OP`, email: `${marker}_op@test.invalid`, nombre: "QA Recepción", apellido: "Asistencia", rolId: role.id, estado: "ACTIVO" } });
  const citizen = await prisma.usuario.create({ data: { userId: `${marker}_CIU`, email: `${marker}_ciu@test.invalid`, nombre: "QA Ciudadano", apellido: "Asistencia", rolId: role.id, estado: "ACTIVO" } });
  const admin = await prisma.usuario.create({ data: { userId: `${marker}_ADM`, email: `${marker}_adm@test.invalid`, nombre: "QA Administrador", apellido: "Asistencia", rolId: adminRole.id, estado: "ACTIVO" } });
  const teacherUser = await prisma.usuario.create({ data: { userId: `${marker}_PROF`, email: `${marker}_prof@test.invalid`, nombre: "QA Profesor", apellido: "Asistencia", rolId: teacherRole.id, estado: "ACTIVO" } });
  const teacher = await prisma.profesor.create({ data: { usuarioId: teacherUser.id, especialidad: "QA", estado: "ACTIVO" } }); ids.teacherProfile = teacher.id;
  ids.users.push(operator.id, citizen.id, admin.id, teacherUser.id);
  const establishment = await prisma.establecimiento.create({ data: { id: `${marker}_EST`, nombre: marker, direccion: "QA 100", estado: "activo" } }); ids.establishment = establishment.id;
  const activity = await prisma.actividad.create({ data: { id: `${marker}_ACT`, establecimientoId: establishment.id, nombre: marker, estado: "ACTIVA" } }); ids.activity = activity.id;
  const schedules = await Promise.all([0, 1].map((index) => prisma.horarioActividad.create({ data: { actividadId: activity.id, establecimientoId: establishment.id, diaSemana: now.weekday as never, horaInicio: index === 0 ? time(currentMinutes - 10) : time(currentMinutes + 120), horaFin: index === 0 ? time(currentMinutes + 10) : time(currentMinutes + 180), cupoMaximo: 10, estado: "ACTIVO" } })));
  ids.schedules.push(...schedules.map((row) => row.id));
  const sessionDate = new Date(`${now.date}T00:00:00-03:00`);
  const sessions = await Promise.all(schedules.map((schedule) => prisma.claseActividad.create({ data: { horarioActividadId: schedule.id, establecimientoId: establishment.id, fecha: sessionDate, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, estado: "PROGRAMADA", profesores: { create: { profesorId: teacher.id, esPrincipal: true } } } })));
  ids.sessions.push(...sessions.map((row) => row.id));
  const enrollments = await Promise.all(schedules.map((schedule) => prisma.inscripcion.create({ data: { usuarioId: citizen.id, horarioActividadId: schedule.id, estado: "CONFIRMADA" } })));
  ids.enrollments.push(...enrollments.map((row) => row.id));

  const access = await registerManualAccess({ establishmentId: establishment.id, userId: citizen.id, decision: "ALLOW", observation: "QA ingreso autorizado" }, operator.id);
  ids.access = access.accessRecordId!;
  const automatic = await prisma.asistencia.findMany({ where: { claseActividadId: { in: ids.sessions }, inscripcionId: { in: ids.enrollments } }, orderBy: { claseActividadId: "asc" } });
  assert.equal(automatic.length, 0, "El control de acceso no debe registrar asistencia automáticamente.");

  const adminToken = await signJwt({ uid: admin.id, rid: adminRole.id, rname: adminRole.nombre });
  const adminResponse = await adminAttendanceBatch(new NextRequest("http://localhost/api/attendance/batch", { method: "POST", headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" }, body: JSON.stringify({ activitySessionId: sessions[0].id, records: [{ enrollmentId: enrollments[0].id, status: "AUSENTE", observations: "QA ausencia cargada por administrador" }] }) }));
  assert.equal(adminResponse.status, 200, `Administrador no pudo marcar ausente: ${await adminResponse.text()}`);
  const adminRoster = await getAttendanceRoster(sessions[0].id);
  assert.equal(adminRoster.attendees[0]?.status, "AUSENTE", "La ausencia administrativa no se persistió.");
  assert.equal(adminRoster.summary.absentCount, 1, "No se contabilizó la ausencia cargada por Administración.");

  const teacherToken = await signJwt({ uid: teacherUser.id, rid: teacherRole.id, rname: teacherRole.nombre });
  const teacherResponse = await teacherAttendanceBatch(new NextRequest(`http://localhost/api/teacher/attendance/${sessions[1].id}`, { method: "POST", headers: { authorization: `Bearer ${teacherToken}`, "content-type": "application/json" }, body: JSON.stringify({ action: "batch", records: [{ enrollmentId: enrollments[1].id, status: "AUSENTE", observations: "QA ausencia cargada por profesor" }] }) }), { params: Promise.resolve({ sessionId: sessions[1].id }) });
  assert.equal(teacherResponse.status, 200, `Profesor no pudo marcar ausente: ${await teacherResponse.text()}`);
  const teacherRoster = await getAttendanceRoster(sessions[1].id);
  assert.equal(teacherRoster.attendees[0]?.status, "AUSENTE", "La ausencia del profesor no se persistió.");
  assert.equal(teacherRoster.summary.absentCount, 1, "No se contabilizó la ausencia cargada por Profesor.");

  const audits = await prisma.registroAuditoria.findMany({ where: { actorId: { in: [admin.id, teacherUser.id] }, accion: "ASIGNAR", entidadTipo: "ASISTENCIA", entidadId: { in: ids.sessions } } });
  assert.ok(audits.some((row) => row.actorId === admin.id), "Falta auditoría de Administración.");
  assert.ok(audits.some((row) => row.actorId === teacherUser.id), "Falta auditoría de Profesor.");
  console.log(JSON.stringify({ ok: true, automaticAttendances: automatic.length, adminAbsent: adminRoster.summary.absentCount, teacherAbsent: teacherRoster.summary.absentCount, audits: audits.length }));
}

main().finally(async () => { await cleanup(); await prisma.$disconnect(); });
