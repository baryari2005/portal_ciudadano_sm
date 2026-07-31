import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnrollmentDocumentationSummaries } from "@/features/enrollment-documents/services/enrollment-documents.server";
import { createCitizenEnrollment, listCitizenEnrollments } from "@/features/citizen/services/citizen.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";
export async function GET(req: NextRequest) { try { const user=await requireAuth(req); const items=await listCitizenEnrollments(user.id); const summaries=await getEnrollmentDocumentationSummaries(items.map((item)=>item.id)); return NextResponse.json({data:items.map((item)=>({...item,documentation:summaries.get(item.id)}))}); } catch(error){return mapApiRouteError(error,"No pudimos cargar tus inscripciones.");} }
export async function POST(req: NextRequest) { try { const user=await requireAuth(req); const parsed=z.object({activityScheduleId:z.string().min(1),nivelConsentido:z.literal(true)}).strict().safeParse(await req.json()); if(!parsed.success)return NextResponse.json({message:"Tenés que confirmar que fuiste informado sobre el nivel de la actividad."},{status:400}); return NextResponse.json({data:await createCitizenEnrollment(user.id,parsed.data.activityScheduleId,parsed.data.nivelConsentido)},{status:201}); } catch(error){return mapApiRouteError(error,"No pudimos completar la inscripción.");} }
