import { NextRequest, NextResponse } from "next/server";

import { publicoObjetivoSchema } from "@/features/publicos-objetivo/schemas/publico-objetivo.schema";
import {
  createPublicoObjetivo,
  listPublicosObjetivo,
} from "@/features/publicos-objetivo/services/publicos-objetivo.server";
import type { PublicoObjetivoListParams } from "@/features/publicos-objetivo/services/publicos-objetivo.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseListParams(url: string): PublicoObjetivoListParams {
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
    requirePermission(user, "publicos_objetivo", "ver");

    const { items, meta } = await listPublicosObjetivo(
      parseListParams(req.url),
    );

    return NextResponse.json({ data: items, meta });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar publicos objetivo.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "publicos_objetivo", "crear");

    const body = await req.json();
    const parsed = publicoObjetivoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = await createPublicoObjetivo(parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos crear el publico objetivo.");
  }
}
