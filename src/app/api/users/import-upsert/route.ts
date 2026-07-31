import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { importUpsertBodySchema } from "@/features/users/import-upsert/schemas/import-upsert.schema";
import { normalizeRawBody } from "@/features/users/import-upsert/lib/import-upsert.normalize";
import { toImportUpsertResponse } from "@/features/users/import-upsert/lib/import-upsert.mapper";
import {
  createOrUpdateImportedUser,
  mapImportUpsertError,
} from "@/features/users/import-upsert/services/import-upsert.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const loggedInUser = await requireAuth(req);
    requirePermission(loggedInUser, "usuarios", "importar");

    const url = new URL(req.url);
    const setTemp = url.searchParams.get("setTemp") === "1";

    const raw = await req.json();
    const normalized = normalizeRawBody(raw);
    const dto = importUpsertBodySchema.parse(normalized);

    const result = await createOrUpdateImportedUser(dto, { setTemp });

    return NextResponse.json(
      toImportUpsertResponse(result.user, result.legajo, result.tempPassword),
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "unauthorized", message: "Unauthorized" },
          { status: 401 },
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "forbidden", message: "Forbidden" },
          { status: 403 },
        );
      }
    }

    const mapped = mapImportUpsertError(error);

    if ("issues" in mapped) {
      return NextResponse.json(
        {
          error: "validation_error",
          issues: mapped.issues,
        },
        { status: mapped.status },
      );
    }

    return NextResponse.json(
      {
        error: "bad_request",
        message: mapped.message,
      },
      { status: mapped.status },
    );
  }
}
