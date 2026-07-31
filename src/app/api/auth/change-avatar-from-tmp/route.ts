// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/db";
// import { requireAuth } from "@/lib/server-auth";

// import path from "node:path";
// import { supabaseAdmin } from "@/lib/api/_supabase/server";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// const BUCKET =
//   process.env.SUPABASE_BUCKET_AVATARS ||
//   process.env.SUPABASE_BUCKET || // si ya usabas uno común
//   "docs";                        // fallback

// function sanitizeFilename(name: string) {
//   return name.replace(/[^a-zA-Z0-9._-]/g, "_");
// }

// export async function POST(req: NextRequest) {
//   try {
//     const me = await requireAuth(req);
//     const { tmpPath } = await req.json();

//     if (!tmpPath || typeof tmpPath !== "string") {
//       return NextResponse.json({ error: "tmpPath requerido" }, { status: 400 });
//     }

//     // Chequear usuario vigente
//     const user = await prisma.usuario.findUnique({
//       where: { id: me.id },
//       select: { id: true, deletedAt: true },
//     });
//     if (!user || user.deletedAt) {
//       return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
//     }

//     // Normalizar nombre del archivo (solo basename)
//     const filenameRaw = path.basename(String(tmpPath));
//     const filename = sanitizeFilename(filenameRaw);

//     // Extensión (default .png)
//     const ext = path.extname(filename) || ".png";

//     // Claves en el bucket
//     const fromKey = `tmp/${filename}`;
//     const toKey = `avatars/${me.id}${ext}`;

//     // Mover en Supabase (tmp → avatars)
//     const { error: moveErr } = await supabaseAdmin.storage
//       .from(BUCKET)
//       .move(fromKey, toKey);
// //
//     if (moveErr) {
//       // Si no existe tmp/filename o permisos
//       const msg = moveErr.message || "No se pudo mover el archivo.";
//       const notFound = /not.*found|no such file/i.test(msg);
//       return NextResponse.json(
//         { error: notFound ? "Archivo temporal no encontrado." : msg },
//         { status: notFound ? 400 : 500 }
//       );
//     }

//     // URL pública
//     const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(toKey);
//     const publicUrl = pub.publicUrl;

//     // Guardar en DB
//     await prisma.usuario.update({
//       where: { id: me.id },
//       data: { avatarUrl: publicUrl },
//     });

//     return NextResponse.json({ avatarUrl: publicUrl });
//   } catch (e: any) {
//     if (e?.message === "UNAUTHORIZED")
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
//   }
// }
export {};
