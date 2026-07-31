import { NextRequest, NextResponse } from "next/server";

import { categoriaActividadSchema } from "@/features/categorias-actividades/schemas/categoria-actividad.schema";
import {
  createCategoriaActividad,
  listCategoriasActividades,
} from "@/features/categorias-actividades/services/categorias-actividades.server";
import type { CategoriaActividadListParams } from "@/features/categorias-actividades/services/categorias-actividades.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseListParams(url: string): CategoriaActividadListParams {
  const params = new URL(url).searchParams;
  const activo = params.get("activo");
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 50);
  const orderBy = params.get("orderBy");
  const orderDir = params.get("orderDir");

  return {
    activo: activo === "true" ? true : activo === "false" ? false : undefined,
    nombre: params.get("nombre") || undefined,
    search: params.get("search") || undefined,
    orderBy:
      orderBy === "nombre" || orderBy === "createdAt" || orderBy === "orden"
        ? orderBy
        : undefined,
    orderDir: orderDir === "desc" ? "desc" : "asc",
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 50,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "categorias_actividades", "ver");

    const { items, meta } = await listCategoriasActividades(
      parseListParams(req.url),
    );

    return NextResponse.json({ data: items, meta });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar categorias.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "categorias_actividades", "crear");

    const body = await req.json();
    const parsed = categoriaActividadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = await createCategoriaActividad(parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos crear la categoria.");
  }
}
