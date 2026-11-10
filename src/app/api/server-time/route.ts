import { ARGENTINA_TIME_ZONE } from "@/constants/time-zone";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    now: new Date().toISOString(),
    timeZone: ARGENTINA_TIME_ZONE,
  }, { headers: { "Cache-Control": "no-store" } });
}
