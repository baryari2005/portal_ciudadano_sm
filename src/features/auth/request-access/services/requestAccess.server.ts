import { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import path from "node:path";

import { supabaseAdmin } from "@/lib/api/_supabase/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { createNotification, manageEntityNotifications, notifyAdministrators } from "@/features/notifications/services/notifications.server";

import type { RequestAccessPayload } from "../types/requestAccess.types";

const DUPLICATE_MESSAGES = {
  userId: "Ya existe una solicitud o usuario registrado con ese User ID.",
  documento: "Ya existe una solicitud o usuario registrado con ese DNI.",
  email: "Ya existe una solicitud o usuario registrado con ese email.",
} as const;
const AVATARS_BUCKET = process.env.SUPABASE_BUCKET_AVATARS || "avatars";

class RequestAccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RequestAccessError";
  }
}

async function getDefaultRequestRoleId() {
  const role = await prisma.rol.findUnique({
    where: {
      codigo: "citizen",
      activo: true,
    },
    select: { id: true },
  });

  if (!role) {
    throw new RequestAccessError(
      "No hay un rol base configurado para registrar la solicitud.",
      500,
    );
  }

  return role.id;
}

function getDuplicateMessage(field: unknown) {
  if (field === "userId") {
    return DUPLICATE_MESSAGES.userId;
  }

  if (field === "documento") {
    return DUPLICATE_MESSAGES.documento;
  }

  if (field === "email") {
    return DUPLICATE_MESSAGES.email;
  }

  return "Ya existe una solicitud o usuario registrado con esos datos.";
}

async function commitRequestImage(tmpPath: string, userId: string, folder: "identity-photos" | "users") {
  if (!tmpPath || !tmpPath.startsWith("tmp/")) {
    return null;
  }

  const ext = path.extname(tmpPath) || ".jpg";
  const finalPath = `${folder}/${userId}/${crypto.randomUUID()}${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .move(tmpPath, finalPath);

  if (error) {
    console.error("[request-access/profile-photo] move error:", {
      bucket: AVATARS_BUCKET,
      message: error.message,
    });
    return null;
  }

  const { data } = supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(finalPath);

  return data.publicUrl;
}

export async function createRequestAccess(
  payload: RequestAccessPayload,
  authenticatedUserId?: string,
) {
  const userId = payload.userId.trim().toLowerCase();
  const email = payload.email.trim().toLowerCase();
  const documento = payload.dni.trim();
  const citizenRoleId = await getDefaultRequestRoleId();

  const duplicate = await prisma.usuario.findFirst({
    where: {
      deletedAt: null,
      OR: [{ userId }, { email }, { documento }],
    },
    select: { id: true, userId: true, email: true, documento: true, estado: true },
  });

  if (duplicate) {
    const sameIdentity =
      duplicate.userId === userId &&
      duplicate.email === email &&
      duplicate.documento === documento;
    if (
      sameIdentity &&
      duplicate.estado === "RECHAZADO" &&
      authenticatedUserId === duplicate.id
    ) {
      const passwordHash = await hashPassword(payload.password);
      await prisma.$transaction(async (tx) => {
        const pending = await tx.solicitudAcceso.findFirst({
          where: { usuarioId: duplicate.id, estado: "PENDIENTE" },
          select: { id: true },
        });
        if (pending) {
          throw new RequestAccessError("Ya existe una solicitud pendiente.", 409);
        }
        await tx.usuario.update({
          where: { id: duplicate.id },
          data: {
            nombre: payload.nombre.trim(), apellido: payload.apellido.trim(),
            domicilio: payload.direccion.trim(), localidad: payload.localidad.trim(), provincia: payload.provincia.trim(), codigoPostal: payload.codigoPostal.trim(), domicilioPlaceId: payload.direccionPlaceId || null,
            domicilioLat: payload.direccionLat, domicilioLng: payload.direccionLng,
            celular: payload.telefono.trim(),
            contactoEmergenciaNombre: payload.contactoEmergenciaNombre.trim(), contactoEmergenciaTelefono: payload.contactoEmergenciaTelefono.trim(), coberturaMedicaId: payload.coberturaMedicaId, numeroAfiliado: payload.numeroAfiliado.trim()||null,
            fechaNacimiento: new Date(`${payload.fechaNacimiento}T00:00:00.000Z`), genero: payload.genero, nacionalidad: payload.nacionalidad,
            password: passwordHash, estado: "PENDIENTE", perfilCompleto: true, rolId: citizenRoleId,
          },
        });
        const request = await tx.solicitudAcceso.create({ data: { usuarioId: duplicate.id } });
        await createNotification({
          userId: duplicate.id, type: "SOLICITUD_ACCESO_CREADA",
          title: "Solicitud reenviada", message: "Tu solicitud corregida fue enviada y está pendiente de revisión.",
          priority: "NORMAL", actionUrl: "/request-access/status", actionLabel: "Ver estado",
          entityType: "access_request", entityId: request.id,
          deduplicationKey: `access-request-created:${request.id}`,
        }, tx);
        await notifyAdministrators({
          senderId: duplicate.id, type: "SOLICITUD_ACCESO_CREADA", title: "Solicitud de acceso reenviada",
          message: `${payload.nombre.trim()} ${payload.apellido.trim()} corrigió y reenvió su solicitud de acceso.`, priority: "ALTA",
          actionUrl: `/users/${duplicate.id}`, actionLabel: "Revisar solicitud", entityType: "access_request", entityId: request.id,
          deduplicationKey: `admin-access-request-created:${request.id}`,
        }, tx);
      });
      const [profilePhotoUrl, avatarUrl] = await Promise.all([
        commitRequestImage(payload.profilePhotoTmpPath ?? "", duplicate.id, "identity-photos"),
        commitRequestImage(payload.avatarTmpPath ?? "", duplicate.id, "users"),
      ]);
      if (profilePhotoUrl || avatarUrl) {
        await prisma.usuario.update({
          where: { id: duplicate.id },
          data: { ...(profilePhotoUrl ? { fotoPerfilUrl: profilePhotoUrl } : {}), ...(avatarUrl ? { avatarUrl } : {}) },
        });
      }
      return { ok: true, message: "Solicitud reenviada correctamente" };
    }
    if (duplicate.userId === userId) {
      throw new RequestAccessError(DUPLICATE_MESSAGES.userId, 409);
    }

    if (duplicate.documento === documento) {
      throw new RequestAccessError(DUPLICATE_MESSAGES.documento, 409);
    }

    throw new RequestAccessError(DUPLICATE_MESSAGES.email, 409);
  }

  const passwordHash = await hashPassword(payload.password);

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.usuario.create({
      data: {
        userId, email, nombre: payload.nombre.trim(), apellido: payload.apellido.trim(),
        tipoDocumento: "DNI", documento, domicilio: payload.direccion.trim(), localidad: payload.localidad.trim(), provincia: payload.provincia.trim(), codigoPostal: payload.codigoPostal.trim(),
        domicilioPlaceId: payload.direccionPlaceId || null,
        domicilioLat: payload.direccionLat, domicilioLng: payload.direccionLng,
        celular: payload.telefono.trim(), contactoEmergenciaNombre: payload.contactoEmergenciaNombre.trim(), contactoEmergenciaTelefono: payload.contactoEmergenciaTelefono.trim(), coberturaMedicaId: payload.coberturaMedicaId, numeroAfiliado: payload.numeroAfiliado.trim()||null, fechaNacimiento: new Date(`${payload.fechaNacimiento}T00:00:00.000Z`), genero: payload.genero, nacionalidad: payload.nacionalidad,
        password: passwordHash, estado: "PENDIENTE", perfilCompleto: true, rolId: citizenRoleId,
      }, select: { id: true },
    });
    const request = await tx.solicitudAcceso.create({ data: { usuarioId: user.id } });
    await createNotification({
      userId: user.id, type: "SOLICITUD_ACCESO_CREADA", title: "Solicitud recibida",
      message: "Tu solicitud fue recibida y está pendiente de revisión.", priority: "NORMAL",
      actionUrl: null, actionLabel: null,
      entityType: "access_request", entityId: request.id,
      deduplicationKey: `access-request-created:${request.id}`,
    }, tx);
    await notifyAdministrators({
      senderId: user.id, type: "SOLICITUD_ACCESO_CREADA", title: "Nueva solicitud de acceso",
      message: `${payload.nombre.trim()} ${payload.apellido.trim()} solicitó acceso al portal.`, priority: "ALTA",
      actionUrl: `/users/${user.id}`, actionLabel: "Revisar solicitud", entityType: "access_request", entityId: request.id,
      deduplicationKey: `admin-access-request-created:${request.id}`,
    }, tx);
    return user;
  });

  const [profilePhotoUrl, avatarUrl] = await Promise.all([
    commitRequestImage(payload.profilePhotoTmpPath ?? "", createdUser.id, "identity-photos"),
    commitRequestImage(payload.avatarTmpPath ?? "", createdUser.id, "users"),
  ]);

  if (profilePhotoUrl || avatarUrl) {
    await prisma.usuario.update({
      where: { id: createdUser.id },
      data: { ...(profilePhotoUrl ? { fotoPerfilUrl: profilePhotoUrl } : {}), ...(avatarUrl ? { avatarUrl } : {}) },
      select: { id: true },
    });
  }

  return {
    ok: true,
    message: "Solicitud enviada correctamente",
  };
}

export async function getCurrentAccessRequest(userId: string) {
  return prisma.solicitudAcceso.findFirst({
    where: { usuarioId: userId },
    orderBy: { enviadaAt: "desc" },
    select: {
      id: true, estado: true, motivoRechazo: true, enviadaAt: true, revisadaAt: true,
      revisadaPor: { select: { nombre: true, apellido: true } },
    },
  });
}

export async function listAccessRequests(userId: string) {
  return prisma.solicitudAcceso.findMany({
    where: { usuarioId: userId },
    orderBy: { enviadaAt: "desc" },
    select: {
      id: true,
      estado: true,
      motivoRechazo: true,
      enviadaAt: true,
      revisadaAt: true,
      revisadaPor: { select: { nombre: true, apellido: true } },
    },
  });
}

export async function reviewAccessRequest(input: {
  userId: string;
  reviewerId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.solicitudAcceso.findFirst({
      where: { usuarioId: input.userId, estado: "PENDIENTE" },
      orderBy: { enviadaAt: "desc" },
    });
    if (!request) throw new RequestAccessError("No existe una solicitud pendiente.", 409);
    const user = await tx.usuario.findUnique({ where: { id: input.userId }, select: { id: true, estado: true } });
    if (!user || user.estado !== "PENDIENTE") throw new RequestAccessError("La solicitud ya fue resuelta.", 409);
    const rejected = input.decision === "REJECT";
    const reviewedAt = new Date();
    await tx.solicitudAcceso.update({
      where: { id: request.id },
      data: {
        estado: rejected ? "RECHAZADA" : "APROBADA",
        motivoRechazo: rejected ? input.rejectionReason?.trim() : null,
        revisadaAt: reviewedAt, revisadaPorId: input.reviewerId,
      },
    });
    await tx.usuario.update({ where: { id: input.userId }, data: { estado: rejected ? "RECHAZADO" : "ACTIVO" } });
    await createNotification({
      userId: input.userId,
      senderId: input.reviewerId,
      type: rejected ? "SOLICITUD_ACCESO_RECHAZADA" : "SOLICITUD_ACCESO_APROBADA",
      title: rejected ? "Solicitud rechazada" : "Solicitud aprobada",
      message: rejected
        ? `Tu solicitud fue rechazada. Motivo: ${input.rejectionReason?.trim()}`
        : "Tu solicitud fue aprobada. Ya podés ingresar al Portal Ciudadano.",
      priority: rejected ? "ALTA" : "NORMAL",
      actionUrl: rejected ? "/request-access" : null, actionLabel: rejected ? "Corregir y reenviar" : null,
      entityType: "access_request", entityId: request.id,
      deduplicationKey: `access-request-${rejected ? "rejected" : "approved"}:${request.id}`,
    }, tx);
    await manageEntityNotifications(
      "access_request", request.id, input.reviewerId, "RESUELTA",
      rejected ? `Solicitud rechazada: ${input.rejectionReason?.trim()}` : "Solicitud aprobada.", tx,
    );
    return { requestId: request.id, status: rejected ? "RECHAZADA" : "APROBADA", reviewedAt };
  });
}

export function handleRequestAccessError(error: unknown) {
  if (error instanceof RequestAccessError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

    return {
      status: 409,
      message: getDuplicateMessage(target[0]),
    };
  }

  return {
    status: 500,
    message: "No pudimos enviar la solicitud. Intentá nuevamente.",
  };
}
