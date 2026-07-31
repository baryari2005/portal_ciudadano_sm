// src/app/api/media/avatars/commit/route.ts
import { supabaseAdmin } from "@/lib/api/_supabase/server";
import { NextResponse } from "next/server";

import crypto from "node:crypto";
import path from "node:path";

const BUCKET = process.env.SUPABASE_BUCKET_AVATARS || "avatars";

export async function POST(req: Request) {
  const { tmpPath, finalPrefix, deleteOldPath } = (await req.json()) as {
    tmpPath: string; // p.ej. "tmp/3b0c...-a.png"
    finalPrefix: string; // p.ej. `users/${userId}`
    deleteOldPath?: string | null; // p.ej. "users/123/old.png"
  };

  if (!tmpPath || !finalPrefix) {
    return NextResponse.json(
      { error: "tmpPath y finalPrefix requeridos" },
      { status: 400 },
    );
  }

  const ext = path.extname(tmpPath) || ".png";
  const filename = `${crypto.randomUUID()}${ext}`;
  const finalPath = `${finalPrefix}/${filename}`;

  // mover dentro del mismo bucket
  const { error: moveError } = await supabaseAdmin.storage
    .from(BUCKET)
    .move(tmpPath, finalPath);

  if (moveError) {
    console.error("[media/avatars/commit] move error:", {
      bucket: BUCKET,
      message: moveError.message,
    });

    return NextResponse.json({ error: moveError.message }, { status: 400 });
  }

  if (deleteOldPath) {
    await supabaseAdmin.storage.from(BUCKET).remove([deleteOldPath]);
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(finalPath);
  return NextResponse.json({ path: finalPath, publicUrl: data.publicUrl });
}
