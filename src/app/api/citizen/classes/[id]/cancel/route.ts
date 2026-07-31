import { NextRequest, NextResponse } from "next/server";
import { cancelClassReservationSchema } from "@/features/class-reservations/schemas/class-reservation.schema";
import { cancelCitizenClass } from "@/features/class-reservations/services/class-reservations.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { ALLOWED_ENROLLMENT_DOCUMENT_TYPES, MAX_ENROLLMENT_DOCUMENT_BYTES } from "@/features/enrollment-documents/constants/file-rules";
import { removeEnrollmentDocument, uploadEnrollmentDocument } from "@/features/enrollment-documents/services/document-storage.server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let uploadedPath: string | null = null;
  try {
    const user = await requireAuth(req), classId = (await params).id;
    const multipart = req.headers.get("content-type")?.includes("multipart/form-data");
    let reason = "", proof: File | null = null;
    if (multipart) { const form = await req.formData(); reason = String(form.get("reason") || ""); const value = form.get("proof"); proof = value instanceof File && value.size ? value : null; }
    else { const body = await req.json(); reason = String(body.reason || ""); }
    const parsed = cancelClassReservationSchema.safeParse({ reason, proofUrl: null });
    if (!parsed.success) return NextResponse.json({ message: "Indicá el motivo de la cancelación.", details: parsed.error.flatten() }, { status: 400 });
    if (proof) {
      if (proof.size > MAX_ENROLLMENT_DOCUMENT_BYTES) return NextResponse.json({ message: "El comprobante supera los 10 MB." }, { status: 400 });
      const expected = ALLOWED_ENROLLMENT_DOCUMENT_TYPES[proof.type as keyof typeof ALLOWED_ENROLLMENT_DOCUMENT_TYPES], extension = extname(proof.name).toLowerCase();
      if (!expected || (proof.type === "image/jpeg" ? ![".jpg", ".jpeg"].includes(extension) : extension !== expected)) return NextResponse.json({ message: "El comprobante debe ser PDF, JPG o PNG." }, { status: 400 });
      uploadedPath = `absence-proofs/${user.id}/${classId}/${randomUUID()}${expected}`;
      await uploadEnrollmentDocument(uploadedPath, Buffer.from(await proof.arrayBuffer()), proof.type);
    }
    return NextResponse.json({ data: await cancelCitizenClass(user.id, classId, parsed.data.reason, uploadedPath) });
  }
  catch (error) { if (uploadedPath) await removeEnrollmentDocument(uploadedPath).catch(() => undefined); return mapApiRouteError(error, "No pudimos cancelar tu participación."); }
}
