import { NextResponse } from "next/server";

import { listMedicalCoverages } from "@/features/medical-coverages/services/medical-coverages.server";
import { mapApiRouteError } from "@/lib/api/route-error";

export async function GET() {
  try {
    return NextResponse.json({ data: await listMedicalCoverages(true) });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar las coberturas médicas.");
  }
}
