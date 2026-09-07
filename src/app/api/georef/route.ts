import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listGeorefDepartments, listGeorefLocalities, listGeorefProvinces, resolveGeorefLocality, searchGeorefAddresses } from "@/features/georef/services/georef.server";

const querySchema = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("provinces") }),
  z.object({ resource: z.literal("departments"), provinceId: z.string().min(1) }),
  z.object({ resource: z.literal("localities"), provinceId: z.string().min(1), departmentId: z.string().min(1) }),
  z.object({ resource: z.literal("resolve-locality"), provinceId: z.string().min(1), locality: z.string().min(1) }),
  z.object({ resource: z.literal("addresses"), address: z.string().trim().min(3).max(200), province: z.string().min(1), department: z.string().optional(), locality: z.string().optional() }),
]);

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ message: "Parámetros geográficos inválidos." }, { status: 400 });
  try {
    const query = parsed.data;
    const data = query.resource === "provinces" ? await listGeorefProvinces()
      : query.resource === "departments" ? await listGeorefDepartments(query.provinceId)
        : query.resource === "localities" ? await listGeorefLocalities(query.provinceId, query.departmentId)
          : query.resource === "resolve-locality" ? await resolveGeorefLocality(query.provinceId, query.locality)
            : await searchGeorefAddresses(query);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ message: "No pudimos consultar API Georef." }, { status: 502 });
  }
}
