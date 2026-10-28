import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { hasAdministrativeWorkspace } from "@/features/auth/libs/workspaces";
import { withDefaultDashboardDates } from "@/features/dashboard/schemas/dashboard-filters.schema";
import { getDashboardSummary } from "@/features/dashboard/services/dashboard.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!hasAdministrativeWorkspace({ id: user.id, userId: user.userId, rol: user.rol, permisos: user.permisos })) {
      throw new Error("FORBIDDEN");
    }
    const filters = withDefaultDashboardDates(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json({ data: await getDashboardSummary(filters) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "Filtros inválidos.", details: error.flatten() }, { status: 400 });
    return mapApiRouteError(error, "No pudimos cargar el dashboard.");
  }
}