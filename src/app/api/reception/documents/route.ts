import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { uploadReceptionUserDocument } from "@/features/user-documents/services/user-documents.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const operator = await requireAuth(request);
    requirePermission(operator, "enrollment_documents", "editar");
    requirePermission(operator, "access", "ver");
    if (operator.rol.codigo?.trim().toLowerCase() !== "reception") return NextResponse.json({ message: "Esta operación pertenece a la experiencia de Recepción." }, { status: 403 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Adjuntá un archivo." }, { status: 400 });
    const data = await uploadReceptionUserDocument({
      userId: String(form.get("userId") || ""), requirementId: String(form.get("requirementId") || ""), file,
      observations: String(form.get("observations") || ""),
      operator: { id: operator.id, nombre: operator.nombre, apellido: operator.apellido },
      requestContext: getAuditRequestContext(request.headers),
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar el documento.");
  }
}
