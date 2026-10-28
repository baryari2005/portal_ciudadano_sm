import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertTeacherCitizenAccess } from "@/features/teacher/services/teacher.server";
import { requireTeacherDocumentProfile, searchTeacherDocumentCitizens } from "@/features/teacher/services/teacher-citizen-documents.server";
import { listCitizenUserDocuments } from "@/features/user-documents/services/user-documents.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await requireTeacherDocumentProfile(user.id);
    const citizenId = request.nextUrl.searchParams.get("citizenId");
    if (citizenId) {
      if (!z.string().uuid().safeParse(citizenId).success) return NextResponse.json({ message: "Identificador inválido." }, { status: 400 });
      await assertTeacherCitizenAccess(user.id, citizenId, request.nextUrl.searchParams.get("establishmentId") ?? undefined);
      return NextResponse.json({ data: await listCitizenUserDocuments(citizenId) });
    }
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const parsed = searchParamsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: "Paginación inválida." }, { status: 400 });
    if (query.length < 2) return NextResponse.json({ data: { items: [] } });
    return NextResponse.json({ data: await searchTeacherDocumentCitizens(user.id, query, parsed.data.page, parsed.data.pageSize, request.nextUrl.searchParams.get("establishmentId") ?? undefined) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos consultar la documentación.");
  }
}
