import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { mapApiRouteError } from "@/lib/api/route-error";
import { CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import { resolveUserImage } from "@/features/users/services/user-images.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth(req);
    const { id } = await params;
    // Same access as the existing own profile and administrative user record.
    if (actor.id !== id) requirePermission(actor, "user_records", "ver");
    const user = await prisma.usuario.findFirst({ where: { id, deletedAt: null }, select: { avatarUrl: true, fotoPerfilUrl: true } });
    if (!user) throw new CatalogNotFoundError("Usuario no encontrado.");
    const results = await Promise.allSettled([resolveUserImage(user.avatarUrl), resolveUserImage(user.fotoPerfilUrl)]);
    return NextResponse.json({ data: {
      avatarUrl: results[0].status === "fulfilled" ? results[0].value : null,
      identityPhotoUrl: results[1].status === "fulfilled" ? results[1].value : null,
    }, unavailable: results.flatMap((result, index) => result.status === "rejected" ? [index === 0 ? "avatar" : "identity"] : []) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = mapApiRouteError(error, "No pudimos recuperar las imágenes.");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
