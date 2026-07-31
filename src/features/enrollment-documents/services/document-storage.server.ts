import { supabaseAdmin } from "@/lib/api/_supabase/server";
import { ENROLLMENT_DOCUMENT_BUCKET } from "../constants/file-rules";
export async function uploadEnrollmentDocument(path: string, content: Buffer, contentType: string) { const { error } = await supabaseAdmin.storage.from(ENROLLMENT_DOCUMENT_BUCKET).upload(path, content, { contentType, upsert: false }); if (error) throw new Error("DOCUMENT_STORAGE_UNAVAILABLE"); }
export async function removeEnrollmentDocument(path: string) { const { error } = await supabaseAdmin.storage.from(ENROLLMENT_DOCUMENT_BUCKET).remove([path]); if (error) throw new Error("DOCUMENT_STORAGE_UNAVAILABLE"); }
export async function createEnrollmentDocumentSignedUrl(path: string) { const { data, error } = await supabaseAdmin.storage.from(ENROLLMENT_DOCUMENT_BUCKET).createSignedUrl(path, 300); if (error || !data?.signedUrl) throw new Error("DOCUMENT_SIGN_FAILED"); return data.signedUrl; }
