import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import {
  getLegajoByUserId,
  parseLegajoBody,
  upsertLegajoByUserId,
  mapLegajoError,
} from "@/features/legajo/services/legajo.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "legajo", "ver");

  try {
    const { id } = await ctx.params;
    const legajo = await getLegajoByUserId(id);
    return NextResponse.json(legajo);
  } catch (error) {
    const { message, status } = mapLegajoError(error);
    return NextResponse.json({ message }, { status });
  }
}

async function upsertHandler(req: NextRequest, ctx: RouteContext) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "legajo", "editar");

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "bad_request", message: "JSON body requerido" },
        { status: 400 },
      );
    }

    const dto = parseLegajoBody(body);
    const saved = await upsertLegajoByUserId(id, dto);

    return NextResponse.json(saved);
  } catch (error) {
    const { message, status } = mapLegajoError(error);
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return upsertHandler(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return upsertHandler(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return upsertHandler(req, ctx);
}
