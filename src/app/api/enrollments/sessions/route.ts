import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { listActivitySessions } from "@/features/activity-sessions/services/activity-sessions.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

const querySchema = z.object({ activityId: z.string().min(1) });

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "enrollments", "crear");
    requirePermission(user, "enrollments", "asignar");
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: "Seleccioná una actividad válida." }, { status: 400 });
    const today = new Date().toISOString().slice(0, 10);
    const result = await listActivitySessions({ activityId: parsed.data.activityId, dateFrom: today, page: 1, pageSize: 100 });
    return NextResponse.json({
      data: result.items.filter((session) => ["PROGRAMADA", "EN_CURSO"].includes(session.status)),
      meta: result.meta,
    });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar las fechas disponibles para la inscripción.");
  }
}
