import { NextRequest,NextResponse } from "next/server";
import { auditLogIdSchema } from "@/features/audit-log/schemas/audit-log.schema";
import { getAuditLogById } from "@/features/audit-log/services/audit-log.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth,requirePermission } from "@/lib/server-auth";
type P={params:Promise<{id:string}>};
export async function GET(req:NextRequest,{params}:P){try{const user=await requireAuth(req);requirePermission(user,"audit_log","ver");const id=auditLogIdSchema.parse((await params).id);return NextResponse.json({data:await getAuditLogById(id)});}catch(error){return mapApiRouteError(error,"No pudimos cargar el registro de auditoría.");}}
