import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentDocument, getSignedDocumentUrl } from "@/features/enrollment-documents/services/enrollment-documents.server";
import { assertTeacherEnrollmentAccess } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";
import { requireTeacherDocumentProfile } from "@/features/teacher/services/teacher-citizen-documents.server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await requireAuth(request);
    await requireTeacherDocumentProfile(user.id);
    const documentId = (await params).documentId, document = await getEnrollmentDocument(documentId), establishmentId = request.nextUrl.searchParams.get("establishmentId") ?? undefined;
    await assertTeacherEnrollmentAccess(user.id, document.enrollmentId, establishmentId);
    return NextResponse.json({ data: { url: await getSignedDocumentUrl(documentId) } });
  } catch (error) { return mapApiRouteError(error, "No pudimos abrir el documento."); }
}
