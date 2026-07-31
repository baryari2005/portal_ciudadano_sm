import { NextRequest,NextResponse } from "next/server";
import { auditLogFiltersSchema } from "@/features/audit-log/schemas/audit-log.schema";
import { listAuditLogs } from "@/features/audit-log/services/audit-log.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth,requirePermission } from "@/lib/server-auth";
export async function GET(req:NextRequest){try{const user=await requireAuth(req);requirePermission(user,"audit_log","ver");const parsed=auditLogFiltersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));if(!parsed.success)return NextResponse.json({message:"Filtros inválidos",details:parsed.error.flatten()},{status:400});return NextResponse.json({data:await listAuditLogs(parsed.data)});}catch(error){return mapApiRouteError(error,"No pudimos cargar el historial.");}}
