import { NextRequest, NextResponse } from "next/server";
import { identifyEnrollmentCitizen, searchEnrollmentCitizens } from "@/features/enrollments/services/enrollment-citizens.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

function requireCitizenDocumentSearchPermission(user: Awaited<ReturnType<typeof requireAuth>>) {
  const reception = ["reception", "recepcion"].includes(user.rol.codigo?.trim().toLowerCase() ?? "");
  requirePermission(user, "enrollment_documents", reception ? "editar" : "crear");
}

export async function GET(request: NextRequest) { try { const user = await requireAuth(request); requireCitizenDocumentSearchPermission(user); return NextResponse.json({ data: await searchEnrollmentCitizens(request.nextUrl.searchParams.get("q") ?? "", 1) }); } catch (error) { return mapApiRouteError(error, "No pudimos buscar ciudadanos."); } }
export async function POST(request: NextRequest) { try { const user = await requireAuth(request); requireCitizenDocumentSearchPermission(user); const body = await request.json() as { qrToken?: string }; return NextResponse.json({ data: await identifyEnrollmentCitizen(body.qrToken ?? "") }); } catch (error) { return mapApiRouteError(error, "No pudimos identificar el QR."); } }
