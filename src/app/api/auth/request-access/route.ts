import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createRequestAccess,
  handleRequestAccessError,
} from "@/features/auth/request-access/services/requestAccess.server";
import { requestAccessSchema } from "@/features/auth/request-access/schemas/requestAccessSchema";
import { getServerMe } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload = requestAccessSchema.parse(await req.json());
    const session = await getServerMe(req);
    const rejectedUserId =
      session.user?.estado === "RECHAZADO" ? session.user.id : undefined;
    const result = await createRequestAccess(payload, rejectedUserId);

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    const { message, status } = handleRequestAccessError(error);
    return NextResponse.json({ ok: false, message }, { status });
  }
}
