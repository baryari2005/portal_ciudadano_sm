import { NextRequest, NextResponse } from "next/server";
import { confirmOfferedSeat } from "@/features/class-reservations/services/class-reservations.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await requireAuth(req); return NextResponse.json({ data: await confirmOfferedSeat(user.id, (await params).id) }); }
  catch (error) { return mapApiRouteError(error, "No pudimos confirmar el cupo."); }
}
