import { NextRequest, NextResponse } from "next/server";
import { createActivityDraft, createActivityEditDraft, listActivityDrafts } from "@/features/activity-workflow/services/activity-drafts.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
export async function GET(req: NextRequest) { try { const user = await requireAuth(req); requirePermission(user, "actividades", "ver"); return NextResponse.json({ data: await listActivityDrafts() }); } catch (error) { return mapApiRouteError(error, "No pudimos cargar los borradores."); } }
export async function POST(req: NextRequest) { try { const user = await requireAuth(req); const body = await req.json().catch(() => ({})); const activityId = typeof body.activityId === "string" ? body.activityId : null; requirePermission(user, "actividades", activityId ? "editar" : "crear"); return NextResponse.json({ data: activityId ? await createActivityEditDraft(activityId, user.id) : await createActivityDraft(user.id) }, { status: 201 }); } catch (error) { return mapApiRouteError(error, "No pudimos iniciar la actividad."); } }
