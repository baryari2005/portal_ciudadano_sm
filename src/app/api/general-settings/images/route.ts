export const runtime = "nodejs";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/api/_supabase/server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req); requirePermission(user, "general_settings", "editar");
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Seleccioná una imagen." }, { status: 400 });
    const extension = TYPES[file.type];
    if (!extension) return NextResponse.json({ message: "Solo se permiten imágenes JPG, PNG o WebP." }, { status: 415 });
    if (!file.size || file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "La imagen debe pesar menos de 5 MB." }, { status: 413 });
    const bucket = process.env.SUPABASE_BUCKET_GENERAL_SETTINGS || process.env.SUPABASE_BUCKET_ACTIVITY_IMAGES || process.env.SUPABASE_BUCKET_AVATARS || "avatars";
    const path = `general-settings/login/${randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) throw new Error("GENERAL_SETTINGS_IMAGE_UPLOAD_FAILED");
    return NextResponse.json({ data: { publicUrl: supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl } }, { status: 201 });
  } catch (error) { return mapApiRouteError(error, "No pudimos subir la imagen."); }
}
