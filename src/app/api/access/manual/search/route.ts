import { NextRequest, NextResponse } from "next/server";
import { manualSearchSchema } from "@/features/access/schemas/access.schema";
import { searchAccessUsers } from "@/features/access/services/access.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
export async function GET(req: NextRequest) { try { const user = await requireAuth(req); requirePermission(user, "access", "ver"); const parsed = manualSearchSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams)); if (!parsed.success) return NextResponse.json({ message: "Búsqueda inválida", details: parsed.error.flatten() }, { status: 400 }); const data = await searchAccessUsers(parsed.data.q, parsed.data.establishmentId, parsed.data.page, parsed.data.pageSize); return NextResponse.json({ data: data.items, meta: data.meta }); } catch (error) { return mapApiRouteError(error, "No pudimos buscar personas."); } }
