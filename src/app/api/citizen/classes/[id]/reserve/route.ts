import { NextRequest, NextResponse } from "next/server";
import { reserveCitizenClass } from "@/features/class-reservations/services/class-reservations.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await requireAuth(req); return NextResponse.json({ data: await reserveCitizenClass(user.id, (await params).id) }, { status: 201 }); }
  catch (error) { return mapApiRouteError(error, "No pudimos reservar la clase."); }
}
