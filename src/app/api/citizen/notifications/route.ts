import { NextRequest, NextResponse } from "next/server";
import { notificationFiltersSchema } from "@/features/notifications/schemas/notification.schema";
import { ensurePendingAccessRequestNotifications, listUserNotifications } from "@/features/notifications/services/notifications.server";
import { ensureDocumentExpirationNotifications } from "@/features/user-documents/services/document-expiration.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const parsed = notificationFiltersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: "Filtros inválidos" }, { status: 400 });
    if (user.rol?.codigo === "admin") await ensurePendingAccessRequestNotifications();
    await ensureDocumentExpirationNotifications(user.id);
    return NextResponse.json({ data: await listUserNotifications(user.id, parsed.data) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar tus notificaciones.");
  }
}
