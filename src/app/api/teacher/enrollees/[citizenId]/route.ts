import { NextRequest, NextResponse } from "next/server";
import { toUserDetail } from "@/features/users/lib/user.mapper";
import { getUserByIdOrThrow } from "@/features/users/services/user-detail.service";
import { assertTeacherCitizenAccess } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ citizenId: string }> }) {
  try {
    const user = await requireAuth(request);
    const citizenId = (await params).citizenId, establishmentId = request.nextUrl.searchParams.get("establishmentId") ?? undefined;
    await assertTeacherCitizenAccess(user.id, citizenId, establishmentId);
    return NextResponse.json({ data: toUserDetail(await getUserByIdOrThrow(citizenId)) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar la ficha del ciudadano.");
  }
}
