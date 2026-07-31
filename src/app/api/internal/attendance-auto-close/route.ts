import { NextRequest, NextResponse } from "next/server";
import { closeOverdueAttendanceRosters } from "@/features/attendance/services/attendance-auto-close.server";

export async function POST(request: NextRequest) {
  if (!process.env.ATTENDANCE_AUTO_CLOSE_CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.ATTENDANCE_AUTO_CLOSE_CRON_SECRET}`) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  try { return NextResponse.json({ data: await closeOverdueAttendanceRosters() }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "No pudimos cerrar las planillas." }, { status: 500 }); }
}
