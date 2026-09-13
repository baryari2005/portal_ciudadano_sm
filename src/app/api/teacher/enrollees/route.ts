import { NextRequest, NextResponse } from "next/server";

import { teacherEnrolleeFiltersSchema } from "@/features/teacher/schemas/teacher.schema";
import { listTeacherEnrollees } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "enrollments", "ver");
    const parsed = teacherEnrolleeFiltersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: "Filtros inválidos" }, { status: 400 });
    const result = await listTeacherEnrollees(user.id, parsed.data);
    return NextResponse.json({ data: result.items, meta: result.meta });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar tus inscriptos.");
  }
}
