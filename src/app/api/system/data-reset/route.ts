import { NextRequest, NextResponse } from "next/server";

import { getDatabaseResetPreview, resetDatabaseData } from "@/features/system/services/database-reset.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "system", "reset_database");
    return NextResponse.json({ data: await getDatabaseResetPreview(user.id) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos analizar los datos de prueba.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "system", "reset_database");
    const body = await req.json();
    const data = await resetDatabaseData({
      userId: user.id,
      email: typeof body.email === "string" ? body.email : "",
      confirmation: typeof body.confirmation === "string" ? body.confirmation : "",
    });
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos reiniciar los datos de prueba.");
  }
}
