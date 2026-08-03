import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCitizenProfile, updateCitizenProfile } from "@/features/citizen/services/citizen.server";
import { isValidPhone } from "@/lib/validation/phone";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";
import { GENERO_OPCIONES } from "@/constants/genero";
import { NACIONALIDAD_VALUES } from "@/constants/nacionalidad";

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().refine(isValidPhone, "El teléfono no es válido."),
  address: z.string().trim().min(1).max(200),
  locality: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  addressPlaceId: z.string().trim().nullable().optional(),
  addressLat: z.number().finite().nullable().optional(),
  addressLng: z.number().finite().nullable().optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  emergencyContactName: z.string().trim().min(1).max(120),
  emergencyContactPhone: z.string().trim().refine(isValidPhone,"El teléfono de emergencia no es válido."),
  medicalCoverageId: z.string().uuid().nullable().optional(),
  affiliateNumber: z.string().trim().max(80).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const date = new Date(`${value}T00:00:00.000Z`); return !Number.isNaN(date.getTime()) && date <= new Date(); }, "La fecha de nacimiento no es válida."),
  nationality: z.enum(NACIONALIDAD_VALUES),
  gender: z.enum(GENERO_OPCIONES),
}).strict();

export async function GET(req: NextRequest) {
  try { const user = await requireAuth(req); return NextResponse.json({ data: await getCitizenProfile(user.id) }); }
  catch (error) { return mapApiRouteError(error, "No pudimos cargar tu perfil."); }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const parsed = profileSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Revisá los datos ingresados.", details: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json({ data: await updateCitizenProfile(user.id, parsed.data) });
  } catch (error) { return mapApiRouteError(error, "No pudimos actualizar tu perfil."); }
}
