import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentSlotAvailability } from "@/features/enrollments/services/enrollments.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
export async function POST(request:NextRequest){try{const user=await requireAuth(request);requirePermission(user,"enrollments","crear");const body=await request.json() as {selections?:Array<{horarioActividadId:string;horaInicio:string;horaFin:string}>;usuarioId?:string;actividadId?:string};if(!body.selections?.length)return NextResponse.json({data:[]});return NextResponse.json({data:await getEnrollmentSlotAvailability(body.selections,body.usuarioId,body.actividadId)});}catch(error){return mapApiRouteError(error,"No pudimos verificar los cupos y la disponibilidad de la persona.");}}
