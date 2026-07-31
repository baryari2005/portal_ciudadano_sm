import { NextRequest, NextResponse } from "next/server";
import { SCHEDULE_STATUSES, WEEK_DAYS } from "@/features/activity-schedules/schemas/activity-schedule.schema";
import { listActivitySchedules } from "@/features/activity-schedules/services/activity-schedules.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "activity_schedules", "ver");
    const params = req.nextUrl.searchParams;
    const day = params.get("day"), status = params.get("status");
    return NextResponse.json({ data: await listActivitySchedules({ search: params.get("search") || undefined, activityId: params.get("activityId") || undefined, establishmentId: params.get("establishmentId") || undefined, professorId: params.get("professorId") || undefined, day: WEEK_DAYS.includes(day as never) ? day as never : undefined, status: SCHEDULE_STATUSES.includes(status as never) ? status as never : undefined }) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar los horarios.");
  }
}

export async function POST() {
  return NextResponse.json({ message: "Los horarios se crean únicamente desde el workflow de actividades." }, { status: 409 });
}
