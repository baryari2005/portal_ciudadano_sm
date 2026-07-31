import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listCitizenSchedule } from "@/features/citizen/services/citizen.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const filtersSchema = z.object({ dateFrom: date, dateTo: date }).refine(
  ({ dateFrom, dateTo }) => dateFrom <= dateTo,
  { message: "El rango de fechas es inválido." },
);

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const parsed = filtersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: "Período inválido." }, { status: 400 });
    return NextResponse.json({
      data: await listCitizenSchedule(user.id, {
        dateFrom: new Date(`${parsed.data.dateFrom}T00:00:00.000Z`),
        dateTo: new Date(`${parsed.data.dateTo}T00:00:00.000Z`),
      }),
    });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar tus clases.");
  }
}
