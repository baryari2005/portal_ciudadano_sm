import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  CatalogConflictError,
  CatalogNotFoundError,
  CatalogValidationError,
} from "@/lib/errors/catalog-errors";
import { ProfesorError } from "@/features/profesores/services/profesores.server";
import { TeacherSessionAccessError } from "@/features/teacher/services/teacher.server";

export function mapApiRouteError(error: unknown, fallback: string) {
  if (error instanceof TeacherSessionAccessError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof ProfesorError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
  }

  if (error instanceof Error && error.message === "ACCOUNT_NOT_ALLOWED") {
    return NextResponse.json(
      { message: "Cuenta no habilitada" },
      { status: 403 },
    );
  }

  if (
    error instanceof CatalogConflictError ||
    error instanceof CatalogNotFoundError ||
    error instanceof CatalogValidationError
  ) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      { message: "Ya existe un registro con esos datos." },
      { status: 409 },
    );
  }

  return NextResponse.json({ message: fallback }, { status: 500 });
}
