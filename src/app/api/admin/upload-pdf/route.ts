import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerMe } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  // 1) Auth + rol (usa el shape que ya te funciona)
  const me = await getServerMe(req);
  const roleName = me?.user?.rol?.nombre?.toLowerCase() ?? "";
  const roleId = me?.user?.rol?.id?.toString() ?? "";

  // Permití configurar por env si tu id de admin es numérico distinto
  const ADMIN_ROLE_NAMES = (
    process.env.ADMIN_ROLE_NAMES || "admin,administrador"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const ADMIN_ROLE_IDS = (process.env.ADMIN_ROLE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isAdmin =
    ADMIN_ROLE_NAMES.includes(roleName) ||
    (ADMIN_ROLE_IDS.length ? ADMIN_ROLE_IDS.includes(roleId) : false);

  if (!isAdmin) {
    console.warn("[upload-pdf] usuario no admin:", { roleName, roleId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Leer archivo
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  const isPdf =
    file.type === "application/pdf" ||
    file.name?.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ error: "Sólo PDF" }, { status: 400 });

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > 16)
    return NextResponse.json({ error: "Máximo 16MB" }, { status: 400 });

  // 3) Subir a Supabase Storage (service role, sólo server)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const bucket = process.env.SUPABASE_BUCKET || "docs";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const safeName = sanitizeFilename(file.name || "archivo.pdf");
  const objectPath = `pdfs/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (upErr) {
    console.error("[upload-pdf] supabase upload error:", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // 4) URL (pública o firmada)
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  return NextResponse.json({
    path: objectPath,
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
