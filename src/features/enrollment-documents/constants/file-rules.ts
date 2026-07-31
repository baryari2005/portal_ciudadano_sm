export const ENROLLMENT_DOCUMENT_BUCKET = process.env.SUPABASE_BUCKET_ENROLLMENT_DOCUMENTS || "enrollment-documents";
export const MAX_ENROLLMENT_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ENROLLMENT_DOCUMENT_TYPES = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" } as const;
export function sanitizeOriginalName(value: string) { return value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 180) || "documento"; }
