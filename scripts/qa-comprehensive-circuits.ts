import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/passwords";
import { signJwt } from "../src/lib/jwt";
import { createOrReviveUser } from "../src/features/users/services/user.service";
import { createRequestAccess, reviewAccessRequest } from "../src/features/auth/request-access/services/requestAccess.server";
import { createReceptionRequest } from "../src/features/reception/services/reception-request.server";
import { createEnrollment, updateEnrollment } from "../src/features/enrollments/services/enrollments.server";
import { uploadAdminUserDocument, uploadCitizenUserDocument, uploadReceptionUserDocument } from "../src/features/user-documents/services/user-documents.server";
import { PATCH as reviewAccessRoute } from "../src/app/api/users/[id]/access-request/route";

const batch = "qa-e2e-20260806";
const password = "QaCircuito123!";
const results: Array<{ id: string; status: "OK" | "ERROR"; detail: string }> = [];
const ok = (id: string, condition: unknown, detail: string) => {
  assert.ok(condition, detail);
  results.push({ id, status: "OK", detail });
};
const expectedFailure = async (id: string, work: () => Promise<unknown>, expected: RegExp) => {
  try {
    await work();
    results.push({ id, status: "ERROR", detail: "La operación fue aceptada cuando debía rechazarse." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const passed = expected.test(message);
    results.push({ id, status: passed ? "OK" : "ERROR", detail: message });
    assert.ok(passed, `${id}: respuesta inesperada: ${message}`);
  }
};

async function main() {
  const roles = await prisma.rol.findMany({ where: { codigo: { in: ["admin", "citizen", "reception", "teacher"] } } });
  const role = Object.fromEntries(roles.map((item) => [item.codigo!, item]));
  assert.ok(role.admin && role.citizen && role.reception && role.teacher, "Faltan roles base.");
  const admin = await prisma.usuario.findFirstOrThrow({ where: { rol: { codigo: "admin" }, estado: "ACTIVO" } });

  const existingUsers = await prisma.usuario.findMany({ where: { userId: { startsWith: batch } }, select: { id: true } });
  if (existingUsers.length) throw new Error(`Ya existe el lote ${batch}; usar otro identificador para no mezclar ejecuciones.`);

  const reception = await createOrReviveUser({
    userId: `${batch}-recepcion`, email: `${batch}-recepcion@example.invalid`, password, rolId: role.reception.id,
    nombre: "QA Recepción", apellido: "Circuitos", documento: "95086001", domicilio: "QA Recepción 100",
    localidad: "San Miguel", provincia: "Buenos Aires", codigoPostal: "1663", celular: "1155508601",
    fechaNacimiento: new Date("1988-08-06T00:00:00.000Z") as never, genero: "FEMENINO", nacionalidad: "ARGENTINA",
  });
  const receptionUser = await prisma.usuario.findUniqueOrThrow({ where: { id: reception.id } });
  ok("QA-USR-01", receptionUser.rolId === role.reception.id, "Recepcionista creado desde administración.");

  const professor = await createOrReviveUser({
    userId: `${batch}-profesor`, email: `${batch}-profesor@example.invalid`, password, rolId: role.teacher.id,
    nombre: "QA Profesor", apellido: "Circuitos", documento: "95086002", domicilio: "QA Profesor 200",
    localidad: "San Miguel", provincia: "Buenos Aires", codigoPostal: "1663", celular: "1155508602",
    fechaNacimiento: new Date("1985-08-06T00:00:00.000Z") as never, genero: "MASCULINO", nacionalidad: "ARGENTINA",
    professorProfile: { especialidad: "QA Actividades", matricula: "QA-MAT-0806", descripcion: "Profesor de prueba QA" },
  });
  const professorProfile = await prisma.profesor.findUniqueOrThrow({ where: { usuarioId: professor.id } });
  ok("QA-USR-02", professorProfile.especialidad === "QA Actividades", "Profesor y perfil profesional creados.");

  const minor = await createOrReviveUser({
    userId: `${batch}-menor`, email: `${batch}-menor@example.invalid`, password, rolId: role.citizen.id,
    nombre: "QA Menor", apellido: "Circuitos", documento: "95086003", domicilio: "QA Menor 300",
    localidad: "San Miguel", provincia: "Buenos Aires", codigoPostal: "1663", celular: "1155508603",
    fechaNacimiento: new Date("2012-08-06T00:00:00.000Z") as never, genero: "MASCULINO", nacionalidad: "ARGENTINA",
  });
  ok("QA-USR-03", Boolean(minor.id), "Ciudadano menor creado desde Administración.");

  await createRequestAccess({
    userId: `${batch}-mujer`, email: `${batch}-mujer@example.invalid`, password,
    nombre: "QA Mujer", apellido: "Circuitos", dni: "95086004", fechaNacimiento: "1992-08-06",
    genero: "FEMENINO", nacionalidad: "ARGENTINA", direccion: "QA Mujer 400", localidad: "San Miguel",
    provincia: "Buenos Aires", codigoPostal: "1663", telefono: "1155508604",
    direccionPlaceId: "", direccionLat: null, direccionLng: null,
    contactoEmergenciaNombre: "QA Contacto", contactoEmergenciaTelefono: "1155599999",
    coberturaMedicaId: null, numeroAfiliado: "", profilePhotoTmpPath: "", avatarTmpPath: "",
  });
  const woman = await prisma.usuario.findUniqueOrThrow({ where: { userId: `${batch}-mujer` } });
  ok("QA-USR-04", woman.estado === "PENDIENTE", "Solicitud creada desde Ciudadano y pendiente de aprobación.");
  await reviewAccessRequest({ userId: woman.id, reviewerId: admin.id, decision: "APPROVE" });
  ok("QA-USR-05", (await prisma.usuario.findUniqueOrThrow({ where: { id: woman.id } })).estado === "ACTIVO", "Administrador aprobó solicitud ciudadana.");

  const seniorRequest = await createReceptionRequest({
    userId: `${batch}-mayor`, email: `${batch}-mayor@example.invalid`, password, rolId: role.citizen.id,
    nombre: "QA Mayor", apellido: "Circuitos", tipoDocumento: "DNI", documento: "95086005",
    domicilio: "QA Mayor 500", localidad: "San Miguel", provincia: "Buenos Aires", codigoPostal: "1663",
    celular: "1155508605", fechaNacimiento: "1955-08-06", genero: "MASCULINO", nacionalidad: "ARGENTINA",
  }, { id: receptionUser.id, nombre: receptionUser.nombre, apellido: receptionUser.apellido });
  const senior = await prisma.usuario.findUniqueOrThrow({ where: { id: seniorRequest.id } });
  ok("QA-USR-06", senior.estado === "PENDIENTE", "Recepción creó solicitud de ciudadano mayor.");

  const receptionToken = await signJwt({ uid: receptionUser.id, rid: role.reception.id, rname: role.reception.nombre });
  let receptionApprovalDenied = false;
  try {
    const forbidden = await reviewAccessRoute(new NextRequest(`http://localhost/api/users/${senior.id}/access-request`, {
      method: "PATCH", headers: { authorization: `Bearer ${receptionToken}`, "content-type": "application/json" }, body: JSON.stringify({ decision: "APPROVE" }),
    }), { params: Promise.resolve({ id: senior.id }) });
    receptionApprovalDenied = forbidden.status === 403;
  } catch (error) {
    receptionApprovalDenied = error instanceof Error && error.message === "FORBIDDEN";
  }
  ok("QA-PERM-01", receptionApprovalDenied, "Recepción no puede aprobar solicitudes de acceso.");
  await reviewAccessRequest({ userId: senior.id, reviewerId: admin.id, decision: "APPROVE" });
  ok("QA-USR-07", (await prisma.usuario.findUniqueOrThrow({ where: { id: senior.id } })).estado === "ACTIVO", "Administrador aprobó solicitud creada por Recepción.");

  const extra = await createOrReviveUser({
    userId: `${batch}-espera`, email: `${batch}-espera@example.invalid`, password, rolId: role.citizen.id,
    nombre: "QA Espera", apellido: "Circuitos", documento: "95086006", domicilio: "QA Espera 600",
    localidad: "San Miguel", provincia: "Buenos Aires", codigoPostal: "1663", celular: "1155508606",
    fechaNacimiento: new Date("1990-08-06T00:00:00.000Z") as never, genero: "FEMENINO", nacionalidad: "ARGENTINA",
  });

  const facilities = await Promise.all([1, 2].map((index) => prisma.establecimiento.create({ data: {
    id: `${batch}-establecimiento-${index}`, nombre: `QA Establecimiento ${index}`, direccion: `QA Calle ${index}00`,
    localidad: "San Miguel", provincia: "Buenos Aires", activo: true, estado: "activo",
  }})));
  ok("QA-EST-01", facilities.length === 2, "Dos establecimientos QA creados.");

  const audiences = await Promise.all([
    { slug: `${batch}-mujeres`, nombre: "QA Mujeres", min: null, max: null, genders: ["FEMENINO"] as const },
    { slug: `${batch}-mayores`, nombre: "QA Adultos mayores", min: 60, max: null, genders: [] as const },
    { slug: `${batch}-todos`, nombre: "QA Todo público", min: null, max: null, genders: [] as const },
  ].map((item, index) => prisma.publicoObjetivo.create({ data: {
    slug: item.slug, nombre: item.nombre, edadMinimaSugerida: item.min, edadMaximaSugerida: item.max,
    generosAdmitidos: [...item.genders], orden: 900 + index, activo: true,
  }})));
  const [womenAudience, seniorAudience, allAudience] = audiences;
  ok("QA-PUB-01", audiences.length === 3, "Públicos QA configurados por sexo, edad y alcance general.");

  const requirement = await prisma.requisito.create({ data: {
    nombre: "QA Documento de identidad", slug: `${batch}-documento-identidad`, descripcion: "Documento para pruebas QA",
    tipo: "DOCUMENTO", requiereDocumento: true, documentoPersonal: true, obligatoriedad: "RECOMENDADO",
    instrucciones: "Adjuntar archivo PNG o PDF QA.", orden: 900, activo: true,
  }});
  ok("QA-REQ-01", requirement.requiereDocumento, "Requisito documental QA creado.");

  const activitySpecs = [
    { id: `${batch}-actividad-mujeres`, name: "QA Actividad Mujeres", audience: womenAudience, facility: facilities[0], day: "LUNES" as const, start: "10:00", end: "11:00", cap: 10 },
    { id: `${batch}-actividad-mayores`, name: "QA Actividad Adultos Mayores", audience: seniorAudience, facility: facilities[0], day: "MARTES" as const, start: "09:00", end: "10:00", cap: 10 },
    { id: `${batch}-actividad-general`, name: "QA Actividad Todo Público", audience: allAudience, facility: facilities[1], day: "LUNES" as const, start: "10:30", end: "11:30", cap: 10 },
    { id: `${batch}-actividad-ciber`, name: "QA Actividad Ciber", audience: allAudience, facility: facilities[1], day: "MIERCOLES" as const, start: "18:00", end: "19:00", cap: 1 },
  ];
  const schedules: Record<string, string> = {};
  for (const spec of activitySpecs) {
    const activity = await prisma.actividad.create({ data: {
      id: spec.id, establecimientoId: spec.facility.id, nombre: spec.name, descripcionCorta: `Fixture ${batch}`,
      estado: "ACTIVA", estadoTexto: "activa", modalidadOperacion: "TURNO_RECURRENTE", modalidadInscripcion: "PERMANENTE",
      cupoMaximo: spec.cap, publicosObjetivo: { create: { publicoObjetivoId: spec.audience.id } },
      requisitos: { create: { requisitoId: requirement.id, obligatorio: false, orden: 1, observaciones: "QA opcional" } },
    }});
    const schedule = await prisma.horarioActividad.create({ data: {
      actividadId: activity.id, establecimientoId: spec.facility.id, diaSemana: spec.day, horaInicio: spec.start,
      horaFin: spec.end, cupoMaximo: spec.cap, permiteListaEspera: true, estado: "ACTIVO",
      ...(spec.id.endsWith("mayores") ? { profesores: { create: { profesorId: professorProfile.id, esPrincipal: true } } } : {}),
    }});
    schedules[spec.id] = schedule.id;
  }
  ok("QA-ACT-01", Object.keys(schedules).length === 4, "Tres actividades segmentadas y actividad Ciber creadas.");
  ok("QA-PROF-01", await prisma.horarioActividadProfesor.count({ where: { profesorId: professorProfile.id } }) === 1, "Profesor asignado a una actividad.");

  const womanEnrollment = await createEnrollment({ usuarioId: woman.id, actividadId: activitySpecs[0].id, horarioActividadId: schedules[activitySpecs[0].id] }, { notifyAdmin: true });
  ok("QA-ENR-01", womanEnrollment.status === "CONFIRMADA", "Mujer admitida en actividad para mujeres desde Ciudadano.");
  await expectedFailure("QA-ENR-02", () => createEnrollment({ usuarioId: minor.id, actividadId: activitySpecs[0].id, horarioActividadId: schedules[activitySpecs[0].id] }), /sexo|género|dirigida/i);
  const seniorEnrollment = await createEnrollment({ usuarioId: senior.id, actividadId: activitySpecs[1].id, horarioActividadId: schedules[activitySpecs[1].id] });
  ok("QA-ENR-03", seniorEnrollment.status === "CONFIRMADA", "Mayor de 60 admitido desde Recepción/Admin.");
  await expectedFailure("QA-ENR-04", () => createEnrollment({ usuarioId: minor.id, actividadId: activitySpecs[1].id, horarioActividadId: schedules[activitySpecs[1].id] }), /edad|dirigida/i);
  const minorGeneral = await createEnrollment({ usuarioId: minor.id, actividadId: activitySpecs[2].id, horarioActividadId: schedules[activitySpecs[2].id] });
  ok("QA-ENR-05", minorGeneral.status === "CONFIRMADA", "Menor admitido en actividad para todo público desde Administración.");
  await expectedFailure("QA-ENR-06", () => createEnrollment({ usuarioId: woman.id, actividadId: activitySpecs[2].id, horarioActividadId: schedules[activitySpecs[2].id] }), /inscripta|superpon/i);

  const cyberConfirmed = await createEnrollment({ usuarioId: extra.id, actividadId: activitySpecs[3].id, horarioActividadId: schedules[activitySpecs[3].id] });
  const cyberWaiting = await createEnrollment({ usuarioId: woman.id, actividadId: activitySpecs[3].id, horarioActividadId: schedules[activitySpecs[3].id] }, { notifyAdmin: true });
  ok("QA-CAP-01", cyberConfirmed.status === "CONFIRMADA" && cyberWaiting.status === "LISTA_ESPERA", "Ciber llena su cupo y deja una persona en espera.");
  await updateEnrollment(cyberConfirmed.id, { estado: "CANCELADA", motivoCancelacion: "QA cancelación integral" });
  const promoted = await prisma.inscripcion.findUniqueOrThrow({ where: { id: cyberWaiting.id } });
  ok("QA-CAN-01", promoted.estado === "CONFIRMADA", "La cancelación quedó registrada y promovió la lista de espera.");

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const file = (name: string) => new File([png], name, { type: "image/png" });
  const citizenDoc = await uploadCitizenUserDocument(woman.id, requirement.id, file("qa-ciudadano.png"), "QA carga ciudadana");
  const adminDoc = await uploadAdminUserDocument(minor.id, requirement.id, file("qa-administracion.png"), admin.id, "QA carga administrativa");
  const receptionDoc = await uploadReceptionUserDocument({ userId: senior.id, requirementId: requirement.id, file: file("qa-recepcion.png"), operator: { id: receptionUser.id, nombre: receptionUser.nombre, apellido: receptionUser.apellido }, observations: "QA carga recepción" });
  ok("QA-DOC-01", [citizenDoc, adminDoc, receptionDoc].every((item) => item.status === "PENDIENTE"), "Ciudadano, Administración y Recepción cargaron documentos pendientes.");

  const metrics = {
    users: await prisma.usuario.count({ where: { userId: { startsWith: batch } } }),
    facilities: await prisma.establecimiento.count({ where: { id: { startsWith: batch } } }),
    activities: await prisma.actividad.count({ where: { id: { startsWith: batch } } }),
    enrollments: await prisma.inscripcion.groupBy({ by: ["estado"], where: { horarioActividad: { actividadId: { startsWith: batch } } }, _count: true }),
    documents: await prisma.documentoUsuario.count({ where: { requisitoId: requirement.id } }),
    notifications: await prisma.notificacion.count({ where: { OR: [{ entidadId: { in: [womanEnrollment.id, seniorEnrollment.id, minorGeneral.id, cyberConfirmed.id, cyberWaiting.id] } }, { entregas: { some: { usuario: { userId: { startsWith: batch } } } } }] } }),
    auditHash: createHash("sha256").update(results.map((item) => `${item.id}:${item.status}`).join("|")).digest("hex").slice(0, 16),
  };
  ok("QA-MET-01", metrics.users === 6 && metrics.facilities === 2 && metrics.activities === 4 && metrics.documents === 3, "Fixtures persistidos y disponibles para tablas/métricas.");
  console.log(JSON.stringify({ batch, results, metrics, ids: { admin: admin.id, reception: receptionUser.id, professor: professor.id, minor: minor.id, woman: woman.id, senior: senior.id, waitingUser: extra.id, requirement: requirement.id, activities: activitySpecs.map((item) => item.id), schedules } }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
