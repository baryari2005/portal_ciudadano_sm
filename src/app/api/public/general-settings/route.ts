import { NextResponse } from "next/server";
import { getGeneralSettings } from "@/features/general-settings/services/general-settings.server";

export const dynamic = "force-dynamic";
export async function GET() {
  const settings = await getGeneralSettings().catch(() => null);
  return NextResponse.json({ data: settings });
}
