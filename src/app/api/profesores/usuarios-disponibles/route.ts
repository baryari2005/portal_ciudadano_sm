import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { listarUsuariosDisponibles } from "@/features/profesores/services/profesores.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

const querySchema = z.object({
  search: z.string().trim().max(160).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  role: z.enum(["teacher", "admin"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const canCreate = user.permisos.some(
      (p) => p.modulo === "profesores" && p.accion === "crear",
    );
    const canEdit = user.permisos.some(
      (p) => p.modulo === "profesores" && p.accion === "editar",
    );
    if (!canCreate && !canEdit) requirePermission(user, "profesores", "crear");
    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams),
    );
    if (!parsed.success)
      return NextResponse.json(
        { message: "Filtros inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    const result = await listarUsuariosDisponibles(
      parsed.data.search,
      parsed.data.page,
      parsed.data.pageSize,
      parsed.data.role,
    );
    return NextResponse.json({ data: result.items, meta: result.meta });
  } catch (error) {
    return mapApiRouteError(
      error,
      "No pudimos cargar los usuarios disponibles.",
    );
  }
}
