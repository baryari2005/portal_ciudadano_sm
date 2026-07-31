// src/app/api/admin/storage/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedPayrollPath(path: string) {
  return path.startsWith("payroll/") && !path.includes("..");
}

export async function GET(req: NextRequest) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "recibos", "seguimiento");

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const bucket = process.env.SUPABASE_BUCKET || "docs";

  if (!path) {
    return NextResponse.json({ error: "Falta path" }, { status: 400 });
  }

  if (!isAllowedPayrollPath(path)) {
    return NextResponse.json({ error: "Path no permitido" }, { status: 403 });
  }

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supa.storage
    .from(bucket)
    .createSignedUrl(path, 3600, {
      download: false,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "No se pudo firmar URL" },
      { status: 500 },
    );
  }

  let head: Record<string, string | null> = {};

  try {
    const response = await fetch(data.signedUrl, {
      method: "HEAD",
      cache: "no-store",
    });

    head = {
      status: String(response.status),
      "content-length": response.headers.get("content-length"),
      "content-type": response.headers.get("content-type"),
      "last-modified": response.headers.get("last-modified"),
      etag: response.headers.get("etag"),
    };
  } catch {
    // no es critico
  }

  return NextResponse.json({
    ok: true,
    bucket,
    path,
    signedUrl: data.signedUrl,
    head,
  });
}
