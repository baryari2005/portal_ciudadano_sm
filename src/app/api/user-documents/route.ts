import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/features/notifications/services/notifications.server";
import { listAdminUserDocuments, uploadAdminUserDocument } from "@/features/user-documents/services/user-documents.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try { const user = await requireAuth(req); requirePermission(user, "enrollment_documents", "ver"); return NextResponse.json({ data: await listAdminUserDocuments() }); }
  catch (error) { return mapApiRouteError(error, "No pudimos cargar los documentos."); }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(req);
    requirePermission(admin, "enrollment_documents", "crear");
    const form = await req.formData(), file = form.get("file"), userId = String(form.get("userId") || ""), requirementId = String(form.get("requirementId") || "");
    if (!(file instanceof File)) return NextResponse.json({ message: "Adjuntá un archivo." }, { status: 400 });
    const document = await uploadAdminUserDocument(userId, requirementId, file, admin.id, String(form.get("observations") || ""));
    await createNotification({ userId, type: "GENERAL", title: "Documento recibido en administración", message: `Administración registró tu documento ${document.requirementName}. Quedó pendiente de revisión.`, priority: "NORMAL", actionUrl: "/citizen/documents", actionLabel: "Ver mis documentos", entityType: "user_document", entityId: document.id, deduplicationKey: `admin-user-document-uploaded:${document.id}` });
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) { return mapApiRouteError(error, "No pudimos cargar el documento."); }
}
