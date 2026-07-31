import { NextRequest, NextResponse } from "next/server";
import { updateResourceSchema } from "@/features/resources/schemas/resource.schema";
import { deleteResource, getResource, updateResource } from "@/features/resources/services/resources.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
type Params = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Params) { try { const user = await requireAuth(req); requirePermission(user, "resources", "ver"); const data = await getResource((await params).id); return data ? NextResponse.json({ data }) : NextResponse.json({ message: "Recurso no encontrado." }, { status: 404 }); } catch (error) { return mapApiRouteError(error, "No pudimos cargar el recurso."); } }
export async function PATCH(req: NextRequest, { params }: Params) { try { const user = await requireAuth(req); requirePermission(user, "resources", "editar"); const parsed = updateResourceSchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ message: "Revisá los datos.", details: parsed.error.flatten() }, { status: 400 }); return NextResponse.json({ data: await updateResource((await params).id, parsed.data) }); } catch (error) { return mapApiRouteError(error, "No pudimos actualizar el recurso."); } }
export async function DELETE(req: NextRequest, { params }: Params) { try { const user = await requireAuth(req); requirePermission(user, "resources", "eliminar"); return NextResponse.json({ data: await deleteResource((await params).id) }); } catch (error) { return mapApiRouteError(error, "No pudimos eliminar el recurso."); } }
