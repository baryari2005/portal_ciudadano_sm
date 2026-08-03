import { NextRequest, NextResponse } from "next/server";
import { getGeneralSettings, updateGeneralSettings } from "@/features/general-settings/services/general-settings.server";
import { generalSettingsSchema } from "@/features/general-settings/schemas/general-settings.schema";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try { const user = await requireAuth(req); requirePermission(user, "general_settings", "ver"); return NextResponse.json({ data: await getGeneralSettings() }); }
  catch (error) { return mapApiRouteError(error, "No pudimos cargar los parámetros generales."); }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req); requirePermission(user, "general_settings", "editar");
    const parsed = generalSettingsSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Revisá los parámetros ingresados.", details: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json({ data: await updateGeneralSettings(parsed.data, user.id) });
  } catch (error) { return mapApiRouteError(error, "No pudimos guardar los parámetros generales."); }
}
