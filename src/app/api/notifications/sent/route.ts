import { NextRequest, NextResponse } from "next/server";
import { listSentNotifications } from "@/features/notifications/services/notifications.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({ data: await listSentNotifications(user.id, Object.fromEntries(req.nextUrl.searchParams)) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar las notificaciones enviadas.");
  }
}
