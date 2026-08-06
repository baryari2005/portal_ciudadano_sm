import { NextRequest, NextResponse } from "next/server";
import { teacherSessionFiltersSchema } from "@/features/teacher/schemas/teacher.schema";
import { listTeacherClasses } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
export async function GET(req:NextRequest){try{const user=await requireAuth(req);requirePermission(user,"activity_sessions","ver");const parsed=teacherSessionFiltersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));if(!parsed.success)return NextResponse.json({message:"Filtros inválidos"},{status:400});const result=await listTeacherClasses(user.id,{...parsed.data,establishmentId:parsed.data.establishmentId??""});return NextResponse.json({data:result.items,meta:result.meta});}catch(error){return mapApiRouteError(error,"No pudimos cargar tus clases.")}}
