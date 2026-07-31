import { NextRequest, NextResponse } from "next/server";

import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { ownNotificationActionSchema } from "@/features/notifications/schemas/notification.schema";
import { getUserNotification, updateOwnNotification } from "@/features/notifications/services/notifications.server";
import { prisma } from "@/lib/db";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "notifications", "ver");
    return NextResponse.json({ data: await getUserNotification((await params).id, user.id) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar la notificación.");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "notifications", "editar");
    const parsed = ownNotificationActionSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Acción inválida" }, { status: 400 });
    return NextResponse.json({
      data: await updateOwnNotification((await params).id, user.id, parsed.data.action),
    });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos actualizar la notificación.");
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "notifications", "eliminar");
    const id = (await params).id;
    const before = await prisma.entregaNotificacion.findFirst({
      where: { id, usuarioId: user.id },
      select: { estado: true, notificacion: { select: { titulo: true } } },
    });
    const data = await updateOwnNotification(id, user.id, "archive");
    await createAuditLog({
      actorId: user.id,
      action: "DESACTIVAR",
      entityType: "NOTIFICACION",
      entityId: id,
      entityName: before?.notificacion.titulo ?? null,
      changes: { estado: { before: before?.estado ?? null, after: "ARCHIVADA" } },
      origin: "ADMINISTRACION",
      requestContext: getAuditRequestContext(req.headers),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos archivar la notificación.");
  }
}
