import { NextRequest, NextResponse } from "next/server";
import { identifyEnrollmentCitizen, searchEnrollmentCitizens } from "@/features/enrollments/services/enrollment-citizens.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "enrollments", "crear");
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    return NextResponse.json({ data: await searchEnrollmentCitizens(query, page) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos buscar ciudadanos.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "enrollments", "crear");
    const body = (await request.json()) as { qrToken?: string };
    return NextResponse.json({ data: await identifyEnrollmentCitizen(body.qrToken ?? "") });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos identificar el QR.");
  }
}
