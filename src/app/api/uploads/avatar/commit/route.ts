import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import crypto from "node:crypto";

import { getServerMe } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = process.env.SUPABASE_BUCKET || "avatars";

const clean = (p: string) => p.replace(/^\/+/, "");
const toBucketPath = (p: string) => clean(p).replace(/^avatars\//, "");

type ServerMeRole = {
  nombre?: string | null;
};

type ServerMeUser = {
  id?: string | null;
  userId?: string | null;
  rol?: ServerMeRole | null;
};

type ServerMeShape = {
  user?: ServerMeUser | null;
  userId?: string | null;
};

function getSafeServerMe(value: unknown): ServerMeShape | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const root = value as Record<string, unknown>;
  const rawUser = root.user;
  const rawRootUserId = root.userId;

  let user: ServerMeUser | null = null;

  if (rawUser && typeof rawUser === "object") {
    const userRecord = rawUser as Record<string, unknown>;
    const rawRol = userRecord.rol;

    let rol: ServerMeRole | null = null;

    if (rawRol && typeof rawRol === "object") {
      const rolRecord = rawRol as Record<string, unknown>;

      rol = {
        nombre: typeof rolRecord.nombre === "string" ? rolRecord.nombre : null,
      };
    }

    user = {
      id: typeof userRecord.id === "string" ? userRecord.id : null,
      userId: typeof userRecord.userId === "string" ? userRecord.userId : null,
      rol,
    };
  }

  return {
    user,
    userId: typeof rawRootUserId === "string" ? rawRootUserId : null,
  };
}

export async function POST(req: NextRequest) {
  const me = await getServerMe(req);
  const safeMe = getSafeServerMe(me);

  const roleName = safeMe?.user?.rol?.nombre?.toLowerCase();
  const isAdmin = roleName === "admin" || roleName === "administrador";

  const meId =
    safeMe?.user?.id ?? safeMe?.userId ?? safeMe?.user?.userId ?? null;

  if (!isAdmin && !meId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tmpPath?: string;
    finalPrefix?: string;
    oldPath?: string | null;
  };

  const { tmpPath, finalPrefix, oldPath } = body;

  if (!tmpPath) {
    return NextResponse.json(
      { error: "Faltan parámetros: tmpPath" },
      { status: 400 },
    );
  }

  const tmp = toBucketPath(tmpPath);
  const oldNorm = oldPath ? toBucketPath(oldPath) : null;
  const ext = path.extname(tmp) || ".png";

  const basePrefix = isAdmin
    ? finalPrefix
      ? toBucketPath(finalPrefix)
      : meId
        ? `users/${meId}`
        : "users/unknown"
    : `users/${meId}`;

  const uniqueName = crypto.randomUUID();
  const dest = clean(`${basePrefix}/${uniqueName}${ext}`);

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log("[commit:A] { BUCKET, tmp, dest, oldNorm } =>", {
    BUCKET,
    tmp,
    dest,
    oldNorm,
  });

  const { error: moveErr } = await supa.storage.from(BUCKET).move(tmp, dest);

  if (moveErr) {
    console.error("[avatar/commit] move error:", moveErr);
    return NextResponse.json({ error: moveErr.message }, { status: 500 });
  }

  if (oldNorm && oldNorm !== dest) {
    await supa.storage
      .from(BUCKET)
      .remove([oldNorm])
      .catch(() => {});
  }

  const { data } = supa.storage.from(BUCKET).getPublicUrl(dest);

  return NextResponse.json({
    publicUrl: data.publicUrl,
    path: dest,
  });
}
