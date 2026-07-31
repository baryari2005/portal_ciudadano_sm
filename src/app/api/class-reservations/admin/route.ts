import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { reserveCitizenClass } from "@/features/class-reservations/services/class-reservations.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

const schema = z.object({ userId: z.string().uuid(), classId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(req);
    requirePermission(admin, "enrollments", "asignar");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Seleccioná un ciudadano y una clase válidos." }, { status: 400 });
    const data = await reserveCitizenClass(parsed.data.userId, parsed.data.classId);
    await createAuditLog({ actorId: admin.id, action: "INSCRIBIR", entityType: "INSCRIPCION", entityId: data.id, entityName: "Reserva administrativa de clase", metadata: parsed.data, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos reservar la clase para el ciudadano.");
  }
}
