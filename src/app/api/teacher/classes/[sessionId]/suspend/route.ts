import { NextRequest,NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { suspendTeacherClassSchema } from "@/features/teacher/schemas/teacher.schema";
import { suspendTeacherClass } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth,requirePermission } from "@/lib/server-auth";
type P={params:Promise<{sessionId:string}>};
export async function POST(req:NextRequest,{params}:P){try{const user=await requireAuth(req);requirePermission(user,"activity_sessions","ver");const parsed=suspendTeacherClassSchema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({message:parsed.error.issues[0]?.message??"Datos inválidos",details:parsed.error.flatten()},{status:400});return NextResponse.json({data:await suspendTeacherClass({userId:user.id,sessionId:(await params).sessionId,establishmentId:parsed.data.establishmentId,reason:parsed.data.reason,requestContext:getAuditRequestContext(req.headers)})});}catch(error){return mapApiRouteError(error,"No pudimos suspender la clase.")}}
