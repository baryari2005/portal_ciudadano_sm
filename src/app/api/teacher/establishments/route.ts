import { NextRequest, NextResponse } from "next/server";
import { listTeacherEstablishments } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({ data: await listTeacherEstablishments(user.id) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar tus establecimientos.");
  }
}
