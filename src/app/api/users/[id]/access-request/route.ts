import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { accessRequestReviewSchema } from "@/features/auth/request-access/schemas/accessRequestReviewSchema";
import {
  handleRequestAccessError,
  listAccessRequests,
  reviewAccessRequest,
} from "@/features/auth/request-access/services/requestAccess.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const reviewer = await requireAuth(req);
  requirePermission(reviewer, "usuarios", "editar");
  const { id } = await context.params;
  return NextResponse.json({ data: await listAccessRequests(id) });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const reviewer = await requireAuth(req);
  requirePermission(reviewer, "usuarios", "editar");

  try {
    const { id } = await context.params;
    const payload = accessRequestReviewSchema.parse(await req.json());
    const result = await reviewAccessRequest({
      userId: id,
      reviewerId: reviewer.id,
      decision: payload.decision,
      rejectionReason:
        payload.decision === "REJECT" ? payload.rejectionReason : undefined,
    });

    await createAuditLog({
      actorId: reviewer.id,
      action: payload.decision === "APPROVE" ? "APROBAR" : "RECHAZAR",
      entityType: "USUARIO",
      entityId: id,
      metadata:
        payload.decision === "REJECT"
          ? { rejectionReason: payload.rejectionReason }
          : undefined,
      origin: "ADMINISTRACION",
      requestContext: getAuditRequestContext(req.headers),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }
    const mapped = handleRequestAccessError(error);
    return NextResponse.json({ message: mapped.message }, { status: mapped.status });
  }
}
