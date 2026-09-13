import { NextRequest, NextResponse } from "next/server";
import { listEnrollmentDocuments } from "@/features/enrollment-documents/services/enrollment-documents.server";
import { assertTeacherEnrollmentAccess } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request), enrollmentId = request.nextUrl.searchParams.get("enrollmentId") ?? "", establishmentId = request.nextUrl.searchParams.get("establishmentId") ?? "";
    await assertTeacherEnrollmentAccess(user.id, enrollmentId, establishmentId);
    return NextResponse.json({ data: await listEnrollmentDocuments({ enrollmentId }) });
  } catch (error) { return mapApiRouteError(error, "No pudimos cargar la documentación de la inscripción."); }
}
