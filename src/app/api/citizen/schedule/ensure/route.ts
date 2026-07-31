import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureCitizenSchedule } from "@/features/citizen/services/citizen.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

const inputSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict();

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Mes inválido." }, { status: 400 });
    const [year, month] = parsed.data.month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dateFrom = `${parsed.data.month}-01`;
    const dateTo = `${parsed.data.month}-${String(lastDay).padStart(2, "0")}`;
    return NextResponse.json({ data: await ensureCitizenSchedule(user.id, dateFrom, dateTo) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos preparar las clases del mes.");
  }
}
