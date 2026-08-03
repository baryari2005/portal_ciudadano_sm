import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { createAuditLogTx } from "@/features/audit-log/services/audit-log.server";
import { createNotification, createNotifications } from "@/features/notifications/services/notifications.server";
import { prisma } from "@/lib/db";
import type { ReceptionRequestInput } from "@/features/reception/schemas/reception-request.schema";

export class ReceptionRequestError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "ReceptionRequestError"; }
}

type AuditContext = { ip?: string | null; userAgent?: string | null };

export async function createReceptionRequest(input: ReceptionRequestInput, operator: { id: string; nombre: string | null; apellido: string | null }, requestContext?: AuditContext) {
  const userId = input.userId.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const documentNumber = input.documento.trim();
  const cuil = input.cuil?.trim() || null;
  const operatorName = [operator.nombre, operator.apellido].filter(Boolean).join(" ") || "Operador de recepción";
  const password = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const citizenRole = await tx.rol.findUnique({ where: { codigo: "citizen", activo: true }, select: { id: true } });
    if (!citizenRole) throw new ReceptionRequestError("No está configurado el rol ciudadano.", 500);

    const duplicate = await tx.usuario.findFirst({
      where: { OR: [{ userId }, { email }, { documento: documentNumber }, ...(cuil ? [{ cuil }] : [])] },
      select: { userId: true, email: true, documento: true, cuil: true, solicitudesAcceso: { where: { estado: "PENDIENTE" }, select: { id: true }, take: 1 } },
    });
    if (duplicate?.solicitudesAcceso.length) throw new ReceptionRequestError("Ya existe una solicitud pendiente para esta persona.", 409);
    if (duplicate?.documento === documentNumber) throw new ReceptionRequestError("El documento ya está registrado.", 409);
    if (duplicate?.email === email) throw new ReceptionRequestError("El email ya está registrado.", 409);
    if (duplicate?.userId === userId) throw new ReceptionRequestError("El usuario (userId) ya existe.", 409);
    if (cuil && duplicate?.cuil === cuil) throw new ReceptionRequestError("El CUIL ya está registrado.", 409);

    const user = await tx.usuario.create({
      data: {
        userId, email, password, rolId: citizenRole.id, estado: "PENDIENTE", perfilCompleto: true,
        nombre: input.nombre, apellido: input.apellido, tipoDocumento: input.tipoDocumento ?? "DNI", documento: documentNumber, cuil,
        celular: input.celular || null, domicilio: input.domicilio || null, localidad: input.localidad || null, provincia: input.provincia || null,
        domicilioPlaceId: input.domicilioPlaceId ?? null, domicilioLat: input.domicilioLat ?? null, domicilioLng: input.domicilioLng ?? null,
        codigoPostal: input.codigoPostal || null, contactoEmergenciaNombre: input.contactoEmergenciaNombre || null,
        contactoEmergenciaTelefono: input.contactoEmergenciaTelefono || null, coberturaMedicaId: input.coberturaMedicaId ?? null,
        numeroAfiliado: input.numeroAfiliado || null, fechaNacimiento: new Date(`${input.fechaNacimiento}T00:00:00.000Z`),
        genero: input.genero ?? null, estadoCivil: input.estadoCivil ?? null, nacionalidad: input.nacionalidad ?? null,
      },
      select: { id: true, nombre: true, apellido: true },
    });
    const request = await tx.solicitudAcceso.create({ data: { usuarioId: user.id, estado: "PENDIENTE" }, select: { id: true, enviadaAt: true } });
    const personName = [user.nombre, user.apellido].filter(Boolean).join(" ") || "Una persona";

    const reviewers = await tx.usuario.findMany({
      where: {
        deletedAt: null,
        estado: "ACTIVO",
        rol: {
          codigo: { notIn: ["reception", "teacher", "citizen"] },
          permisos: { some: { permiso: { modulo: "usuarios", accion: "editar", activo: true } } },
        },
      },
      select: { id: true },
    });
    if (!reviewers.length) throw new ReceptionRequestError("No hay revisores autorizados configurados.", 500);

    await createNotification({
      userId: user.id, senderId: operator.id, type: "SOLICITUD_ACCESO_CREADA", title: "Solicitud recibida",
      message: "Tu solicitud fue recibida y está pendiente de revisión.", priority: "NORMAL",
      actionUrl: "/request-access/status", actionLabel: "Ver estado", entityType: "access_request", entityId: request.id,
      deduplicationKey: `access-request-created:${request.id}`,
    }, tx);
    await createNotifications(reviewers.map((reviewer) => ({
      userId: reviewer.id, senderId: operator.id, type: "SOLICITUD_ACCESO_CREADA" as const, title: "Nueva solicitud de acceso",
      message: `${personName} solicitó acceso al portal. La solicitud fue cargada por ${operatorName}.`, priority: "ALTA" as const,
      actionUrl: `/users/${user.id}`, actionLabel: "Revisar solicitud", entityType: "access_request", entityId: request.id,
      metadata: { userId: user.id, operatorId: operator.id, source: "RECEPTION", requestedAt: request.enviadaAt.toISOString() },
      deduplicationKey: `admin-access-request-created:${request.id}`,
    })), tx);
    await createAuditLogTx(tx, {
      actorId: operator.id, action: "CREAR", entityType: "USUARIO", entityId: user.id, entityName: personName,
      origin: "ADMINISTRACION", metadata: { workspace: "reception", accessRequestId: request.id, requestStatus: "PENDIENTE" }, requestContext,
    });
    return { id: user.id, requestId: request.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function mapReceptionRequestError(error: unknown) {
  if (error instanceof ReceptionRequestError) return { message: error.message, status: error.status };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { message: "Ya existe una persona con ese DNI, email, CUIL o User ID.", status: 409 };
  return { message: "No pudimos crear la solicitud de acceso.", status: 500 };
}
