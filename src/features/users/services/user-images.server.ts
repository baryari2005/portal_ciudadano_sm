import { supabaseAdmin } from "@/lib/api/_supabase/server";

export const USER_IMAGE_URL_TTL_SECONDS = 300;

// References remain unchanged in PostgreSQL; signed URLs are display-only.
export async function resolveUserImage(reference: string | null): Promise<string | null> {
  if (!reference) return null;
  if (reference.startsWith("/") && !reference.startsWith("//")) return reference;
  const url = new URL(reference);
  const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  if (url.origin !== storage.origin) return reference;
  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
  if (!match) throw new Error("Referencia de imagen no reconocida.");
  const bucket = decodeURIComponent(match[1]);
  const objectPath = decodeURIComponent(match[2]);
  if (bucket !== (process.env.SUPABASE_BUCKET_AVATARS || "avatars") || objectPath.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Referencia de imagen no permitida.");
  }
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(objectPath, USER_IMAGE_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new Error("No se pudo recuperar la imagen almacenada.");
  return data.signedUrl;
}
