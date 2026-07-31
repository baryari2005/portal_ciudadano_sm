import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { updateCategoriaActividadSchema } from "@/features/categorias-actividades/schemas/categoria-actividad.schema";
import {
  deactivateCategoriaActividad,
  getCategoriaActividad,
  updateCategoriaActividad,
} from "@/features/categorias-actividades/services/categorias-actividades.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);

  return parsed.success ? parsed.data : null;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "categorias_actividades", "ver");

    const id = await parseId(params);

    if (!id) {
      return NextResponse.json({ message: "ID invalido" }, { status: 400 });
    }

    const data = await getCategoriaActividad(id);

    if (!data) {
      return NextResponse.json({ message: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar la categoria.");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);

    const id = await parseId(params);

    if (!id) {
      return NextResponse.json({ message: "ID invalido" }, { status: 400 });
    }

    const body = await req.json();
    const keys = Object.keys(body);
    if (keys.length === 0) {
      return NextResponse.json(
        { message: "No se informaron cambios" },
        { status: 400 },
      );
    }
    const changesStatus = keys.includes("activo");
    const changesFields = keys.some((key) => key !== "activo");

    if (changesFields) {
      requirePermission(user, "categorias_actividades", "editar");
    }
    if (changesStatus) {
      requirePermission(user, "categorias_actividades", "eliminar");
    }

    const parsed = updateCategoriaActividadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = await updateCategoriaActividad(id, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos actualizar la categoria.");
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "categorias_actividades", "eliminar");

    const id = await parseId(params);

    if (!id) {
      return NextResponse.json({ message: "ID invalido" }, { status: 400 });
    }

    const data = await deactivateCategoriaActividad(id);
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos desactivar la categoria.");
  }
}
