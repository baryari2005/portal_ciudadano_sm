import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function mapRoleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid payload", details: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      "code" in error &&
      typeof error.code === "string" &&
      (error.code === "P2002" || error.code === "P2010")
    ) {
      return NextResponse.json(
        { error: "Role name already exists" },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
