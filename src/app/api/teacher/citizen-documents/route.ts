import { NextRequest, NextResponse } from "next/server";
import { searchEnrollmentCitizens } from "@/features/enrollments/services/enrollment-citizens.server";
import { requireTeacherProfile } from "@/features/teacher/services/teacher.server";
import { listCitizenUserDocuments } from "@/features/user-documents/services/user-documents.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

// This adapter never grants permissions: the existing document read permission is required.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "enrollment_documents", "ver");
    await requireTeacherProfile(user.id);
    const citizenId = request.nextUrl.searchParams.get("citizenId");
    if (citizenId) return NextResponse.json({ data: await listCitizenUserDocuments(citizenId) });
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ data: { items: [] } });
    return NextResponse.json({ data: await searchEnrollmentCitizens(query) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos consultar la documentación.");
  }
}
