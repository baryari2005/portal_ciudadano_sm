export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/api/_supabase/server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

const MAX_BYTES = 5 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const canUpload = user.permisos.some(
      (permission) =>
        permission.modulo === "actividades" &&
        ["crear", "editar"].includes(permission.accion),
    );
    if (!canUpload) throw new Error("FORBIDDEN");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Seleccioná una imagen." }, { status: 400 });
    }
    const extension = allowedTypes[file.type];
    if (!extension) {
      return NextResponse.json({ message: "Solo se permiten imágenes JPG, PNG o WebP." }, { status: 415 });
    }
    if (!file.size || file.size > MAX_BYTES) {
      return NextResponse.json({ message: "La imagen debe pesar menos de 5 MB." }, { status: 413 });
    }

    const bucket = process.env.SUPABASE_BUCKET_ACTIVITY_IMAGES || process.env.SUPABASE_BUCKET_AVATARS || "avatars";
    const path = `activities/${randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error("ACTIVITY_IMAGE_UPLOAD_FAILED");

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ data: { path, publicUrl: data.publicUrl } }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos subir la imagen de la actividad.");
  }
}
