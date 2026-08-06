import { NextRequest,NextResponse } from "next/server";
import { getTeacherClass } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth,requirePermission } from "@/lib/server-auth";
type P={params:Promise<{sessionId:string}>};
export async function GET(req:NextRequest,{params}:P){try{const user=await requireAuth(req);requirePermission(user,"activity_sessions","ver");return NextResponse.json({data:await getTeacherClass(user.id,(await params).sessionId,req.nextUrl.searchParams.get("establishmentId")??"")});}catch(error){return mapApiRouteError(error,"No pudimos cargar la clase.")}}
