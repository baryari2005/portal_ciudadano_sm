import { NextRequest, NextResponse } from "next/server";
import { participationPolicySchema } from "@/features/class-reservations/schemas/class-reservation.schema";
import { updateParticipationPolicy } from "@/features/class-reservations/services/participation-review.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const admin = await requireAuth(req); requirePermission(admin, "user_records", "editar"); const parsed = participationPolicySchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ message: "Revisá la configuración de participación.", details: parsed.error.flatten() }, { status: 400 }); return NextResponse.json({ data: await updateParticipationPolicy((await params).id, parsed.data) }); }
  catch (error) { return mapApiRouteError(error, "No pudimos actualizar la participación del usuario."); }
}
