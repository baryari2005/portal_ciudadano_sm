import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewUserDocument } from "@/features/user-documents/services/user-documents.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requireDocumentReviewPermission } from "@/lib/server-auth";

const schema = z.object({ status: z.enum(["APROBADO", "RECHAZADO"]), reason: z.string().trim().max(500).optional() }).superRefine((value, ctx) => { if (value.status === "RECHAZADO" && !value.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "El motivo del rechazo es obligatorio." }); });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    requireDocumentReviewPermission(user);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Revisá los datos." }, { status: 400 });
    return NextResponse.json({ data: await reviewUserDocument((await params).id, user.id, parsed.data.status, parsed.data.reason) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos revisar el documento.");
  }
}
