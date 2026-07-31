import { NextRequest, NextResponse } from "next/server";
import { getUserAttendanceHistory } from "@/features/attendance/services/attendance-history.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
type Params={params:Promise<{id:string}>};
export async function GET(req:NextRequest,{params}:Params){try{const user=await requireAuth(req);requirePermission(user,"attendance","ver");return NextResponse.json({data:await getUserAttendanceHistory((await params).id,5)});}catch(error){return mapApiRouteError(error,"No pudimos cargar el historial de asistencia.")}}
