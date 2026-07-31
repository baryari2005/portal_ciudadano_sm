import { NextRequest, NextResponse } from "next/server";
import { archiveAllUserNotifications } from "@/features/notifications/services/notifications.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({ data: await archiveAllUserNotifications(user.id) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos archivar las notificaciones.");
  }
}
