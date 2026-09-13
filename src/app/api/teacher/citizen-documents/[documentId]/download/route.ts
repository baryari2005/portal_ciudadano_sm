import { NextRequest, NextResponse } from "next/server";
import { assertTeacherCitizenAccess } from "@/features/teacher/services/teacher.server";
import { getUserDocumentUrl } from "@/features/user-documents/services/user-documents.server";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await requireAuth(request), documentId = (await params).documentId, document = await prisma.documentoUsuario.findUnique({ where: { id: documentId }, select: { usuarioId: true } });
    if (!document) throw new CatalogNotFoundError("Documento no encontrado.");
    await assertTeacherCitizenAccess(user.id, document.usuarioId, request.nextUrl.searchParams.get("establishmentId") ?? "");
    return NextResponse.json({ data: { url: await getUserDocumentUrl(documentId, document.usuarioId) } });
  } catch (error) { return mapApiRouteError(error, "No pudimos abrir el documento."); }
}
