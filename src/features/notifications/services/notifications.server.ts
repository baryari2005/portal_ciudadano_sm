import {
  NotificacionAudiencia,
  NotificacionEstado,
  NotificacionGestionEstado,
  NotificacionOrigen,
  NotificacionPrioridad,
  NotificacionTipo,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";

type Db = Prisma.TransactionClient | PrismaClient;

export type CreateNotificationInput = {
  userId: string;
  senderId?: string | null;
  type: NotificacionTipo;
  title: string;
  message: string;
  priority?: NotificacionPrioridad;
  actionUrl?: string | null;
  actionLabel?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  deduplicationKey?: string | null;
  managementStatus?: NotificacionGestionEstado;
};

const eventInclude = {
  emisor: { select: { id: true, nombre: true, apellido: true } },
  rolDestinatario: { select: { id: true, codigo: true, nombre: true } },
  gestionadaPor: { select: { id: true, nombre: true, apellido: true } },
} satisfies Prisma.NotificacionInclude;

const deliveryInclude = {
  usuario: { select: { id: true, nombre: true, apellido: true } },
  notificacion: { include: eventInclude },
} satisfies Prisma.EntregaNotificacionInclude;

const safeUrl = (value?: string | null) => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /^[a-z]+:/i.test(value))
    throw new CatalogValidationError("La acción debe utilizar una ruta interna.");
  return value;
};

function mapDelivery(row: any) {
  const event = row.notificacion;
  return {
    id: row.id,
    notificationId: event.id,
    userId: row.usuarioId,
    senderId: event.emisorId,
    audience: event.audiencia,
    deliveryOrigin: row.origen,
    role: event.rolDestinatario,
    type: event.tipo,
    title: event.titulo,
    message: event.mensaje,
    status: row.estado,
    priority: event.prioridad,
    managementStatus: event.estadoGestion,
    managedBy: event.gestionadaPor,
    managedAt: event.gestionadaAt,
    managementResult: event.resultadoGestion,
    actionUrl: event.actionUrl,
    actionLabel: event.actionLabel,
    entityType: event.entidadTipo,
    entityId: event.entidadId,
    readAt: row.leidaAt,
    archivedAt: row.archivadaAt,
    createdAt: event.createdAt,
    user: row.usuario
      ? { id: row.usuario.id, firstName: row.usuario.nombre, lastName: row.usuario.apellido }
      : undefined,
    sender: event.emisor
      ? { id: event.emisor.id, firstName: event.emisor.nombre, lastName: event.emisor.apellido }
      : null,
  };
}

function mapSent(row: any) {
  return {
    id: row.id,
    notificationId: row.id,
    senderId: row.emisorId,
    audience: row.audiencia,
    role: row.rolDestinatario,
    type: row.tipo,
    title: row.titulo,
    message: row.mensaje,
    priority: row.prioridad,
    managementStatus: row.estadoGestion,
    managedBy: row.gestionadaPor,
    actionUrl: row.actionUrl,
    actionLabel: row.actionLabel,
    entityType: row.entidadTipo,
    entityId: row.entidadId,
    createdAt: row.createdAt,
    recipientCount: row._count?.entregas ?? 0,
    status: "ENVIADA",
  };
}

async function validateUsers(userIds: string[], db: Db) {
  const unique = [...new Set(userIds)];
  const count = await db.usuario.count({ where: { id: { in: unique }, deletedAt: null } });
  if (count !== unique.length) throw new CatalogValidationError("Uno o más destinatarios no existen.");
  return unique;
}

async function createEventWithDeliveries(
  input: Omit<CreateNotificationInput, "userId">,
  userIds: string[],
  audience: NotificacionAudiencia,
  origin: NotificacionOrigen,
  db: Db,
  roleId?: number,
) {
  const recipients = await validateUsers(userIds, db);
  if (input.deduplicationKey) {
    const existing = await db.notificacion.findUnique({
      where: { deduplicationKey: input.deduplicationKey },
      include: { entregas: { include: deliveryInclude }, ...eventInclude },
    });
    if (existing) return existing.entregas.map(mapDelivery);
  }
  const event = await db.notificacion.create({
    data: {
      emisorId: input.senderId ?? null,
      audiencia: audience,
      rolDestinatarioId: roleId,
      tipo: input.type,
      titulo: input.title.trim(),
      mensaje: input.message.trim(),
      prioridad: input.priority ?? "NORMAL",
      estadoGestion: input.managementStatus ?? "INFORMATIVA",
      actionUrl: safeUrl(input.actionUrl),
      actionLabel: input.actionLabel?.trim() || null,
      entidadTipo: input.entityType,
      entidadId: input.entityId,
      metadata: input.metadata,
      deduplicationKey: input.deduplicationKey,
      entregas: { create: recipients.map((usuarioId) => ({ usuarioId, origen: origin })) },
    },
    include: { entregas: { include: deliveryInclude } },
  });
  return event.entregas.map(mapDelivery);
}

export async function createNotification(input: CreateNotificationInput, db: Db = prisma) {
  const [delivery] = await createEventWithDeliveries(
    input,
    [input.userId],
    "INDIVIDUAL",
    "INDIVIDUAL",
    db,
  );
  return delivery;
}

export async function createNotifications(inputs: CreateNotificationInput[], db: Db = prisma) {
  if (!inputs.length) return [];
  const groups = new Map<string, CreateNotificationInput[]>();
  for (const input of inputs) {
    const signature = JSON.stringify({
      senderId: input.senderId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority ?? "NORMAL",
      actionUrl: input.actionUrl ?? null,
      actionLabel: input.actionLabel ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      managementStatus: input.managementStatus ?? "INFORMATIVA",
    });
    groups.set(signature, [...(groups.get(signature) ?? []), input]);
  }
  const result = [];
  for (const group of groups.values()) {
    const first = group[0];
    result.push(...(await createEventWithDeliveries(
      { ...first, deduplicationKey: first.deduplicationKey },
      group.map((item) => item.userId),
      group.length > 1 ? "MASIVA" : "INDIVIDUAL",
      group.length > 1 ? "MASIVA" : "INDIVIDUAL",
      db,
    )));
  }
  return result;
}

export async function notifyAdministrators(
  input: Omit<CreateNotificationInput, "userId">,
  db: Db = prisma,
) {
  const role = await db.rol.findUnique({ where: { codigo: "admin" }, select: { id: true } });
  if (!role) throw new CatalogValidationError("No existe el rol administrador.");
  const admins = await db.usuario.findMany({
    where: { deletedAt: null, estado: "ACTIVO", rolId: role.id },
    select: { id: true },
  });
  return createEventWithDeliveries(
    { ...input, managementStatus: input.managementStatus ?? "ABIERTA" },
    admins.map((admin) => admin.id),
    "ROL",
    "ROL",
    db,
    role.id,
  );
}

export async function ensurePendingAccessRequestNotifications(db: Db = prisma) {
  const pending = await db.solicitudAcceso.findMany({
    where: { estado: "PENDIENTE" },
    select: { id: true, usuario: { select: { id: true, nombre: true, apellido: true } } },
  });
  const existing = await db.notificacion.findMany({
    where: { entidadTipo: "access_request", entidadId: { in: pending.map((item) => item.id) }, audiencia: "ROL" },
    select: { entidadId: true },
  });
  const existingIds = new Set(existing.map((item) => item.entidadId));
  for (const request of pending) {
    if (existingIds.has(request.id)) continue;
    const name = [request.usuario.nombre, request.usuario.apellido].filter(Boolean).join(" ") || "Un ciudadano";
    await notifyAdministrators({
      senderId: request.usuario.id, type: "SOLICITUD_ACCESO_CREADA", title: "Nueva solicitud de acceso",
      message: `${name} solicitó acceso al portal.`, priority: "ALTA",
      actionUrl: `/users/${request.usuario.id}`, actionLabel: "Revisar solicitud",
      entityType: "access_request", entityId: request.id,
      deduplicationKey: `admin-access-request-created:${request.id}`,
    }, db);
  }
}

function deliveryWhere(userId: string, filters: any = {}): Prisma.EntregaNotificacionWhereInput {
  const search = filters.search?.trim();
  return {
    usuarioId: userId,
    origen: filters.origin,
    estado: filters.unreadOnly
      ? "NO_LEIDA"
      : filters.status ?? (filters.includeArchived ? undefined : { not: "ARCHIVADA" }),
    notificacion: {
      tipo: filters.type,
      prioridad: filters.priority,
      audiencia: filters.audience,
      createdAt: filters.dateFrom || filters.dateTo
        ? { gte: filters.dateFrom, lte: filters.dateTo }
        : undefined,
      ...(search
        ? {
            OR: [
              { titulo: { contains: search, mode: "insensitive" as const } },
              { mensaje: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  };
}

export async function listUserNotifications(userId: string, filters: any = {}) {
  const where = deliveryWhere(userId, filters);
  const page = Number(filters.page ?? 1);
  const pageSize = Number(filters.pageSize ?? 20);
  const [total, unreadCount, rows] = await prisma.$transaction([
    prisma.entregaNotificacion.count({ where }),
    prisma.entregaNotificacion.count({ where: { usuarioId: userId, estado: "NO_LEIDA" } }),
    prisma.entregaNotificacion.findMany({
      where,
      include: deliveryInclude,
      orderBy: { notificacion: { createdAt: "desc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items: rows.map(mapDelivery),
    meta: { total, unreadCount, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function listSentNotifications(senderId: string, filters: any = {}) {
  const search = filters.search?.trim();
  const rows = await prisma.notificacion.findMany({
    where: {
      emisorId: senderId,
      audiencia: filters.audience,
      ...(search ? { OR: [{ titulo: { contains: search, mode: "insensitive" } }, { mensaje: { contains: search, mode: "insensitive" } }] } : {}),
    },
    include: { ...eventInclude, _count: { select: { entregas: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapSent);
}

export async function getUserNotification(id: string, userId: string) {
  const row = await prisma.entregaNotificacion.findFirst({
    where: { id, usuarioId: userId },
    include: deliveryInclude,
  });
  if (!row) throw new CatalogNotFoundError("Notificación no encontrada.");
  return mapDelivery(row);
}

export async function updateOwnNotification(
  id: string,
  userId: string,
  action: "markAsRead" | "markAsUnread" | "archive",
) {
  await getUserNotification(id, userId);
  const now = new Date();
  const data = action === "markAsRead"
    ? { estado: NotificacionEstado.LEIDA, leidaAt: now }
    : action === "markAsUnread"
      ? { estado: NotificacionEstado.NO_LEIDA, leidaAt: null, archivadaAt: null }
      : { estado: NotificacionEstado.ARCHIVADA, archivadaAt: now };
  return mapDelivery(await prisma.entregaNotificacion.update({ where: { id }, data, include: deliveryInclude }));
}

export async function manageNotification(
  notificationId: string,
  managerId: string,
  status: "EN_TRATAMIENTO" | "RESUELTA" | "CANCELADA",
  result?: string | null,
) {
  return prisma.notificacion.update({
    where: { id: notificationId },
    data: {
      estadoGestion: status,
      gestionadaPorId: managerId,
      gestionadaAt: status === "EN_TRATAMIENTO" ? undefined : new Date(),
      resultadoGestion: result?.trim() || null,
    },
    include: eventInclude,
  });
}

export async function manageEntityNotifications(
  entityType: string,
  entityId: string,
  managerId: string,
  status: "EN_TRATAMIENTO" | "RESUELTA" | "CANCELADA",
  result?: string | null,
  db: Db = prisma,
) {
  return db.notificacion.updateMany({
    where: { entidadTipo: entityType, entidadId: entityId, audiencia: "ROL" },
    data: {
      estadoGestion: status,
      gestionadaPorId: managerId,
      gestionadaAt: status === "EN_TRATAMIENTO" ? null : new Date(),
      resultadoGestion: result?.trim() || null,
    },
  });
}

export async function markAllAsRead(userId: string, origin?: NotificacionOrigen) {
  return prisma.entregaNotificacion.updateMany({
    where: { usuarioId: userId, estado: "NO_LEIDA", origen: origin ?? { not: "ROL" } },
    data: { estado: "LEIDA", leidaAt: new Date() },
  });
}

export async function archiveAllUserNotifications(userId: string, origin?: NotificacionOrigen) {
  return prisma.entregaNotificacion.updateMany({
    where: { usuarioId: userId, estado: { not: "ARCHIVADA" }, origen: origin ?? { not: "ROL" } },
    data: { estado: "ARCHIVADA", archivadaAt: new Date() },
  });
}

export async function markEntityNotificationsAsRead(
  entityType: string,
  entityId: string,
  userId?: string,
  db: Db = prisma,
) {
  return db.entregaNotificacion.updateMany({
    where: {
      estado: "NO_LEIDA",
      ...(userId ? { usuarioId: userId } : {}),
      notificacion: { entidadTipo: entityType, entidadId: entityId },
    },
    data: { estado: "LEIDA", leidaAt: new Date() },
  });
}

export const getUnreadCount = (userId: string) =>
  prisma.entregaNotificacion.count({ where: { usuarioId: userId, estado: "NO_LEIDA" } });

export async function listNotifications(filters: any = {}) {
  if (!filters.userId) throw new CatalogValidationError("El usuario es obligatorio.");
  return (await listUserNotifications(filters.userId, { ...filters, pageSize: 100 })).items;
}
