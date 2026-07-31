import { NextRequest, NextResponse } from "next/server";

import { toUserDetail } from "@/features/users/lib/user.mapper";
import { getUserByIdOrThrow, mapUserDetailError } from "@/features/users/services/user-detail.service";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAuth(request);
  requirePermission(actor, "user_records", "ver");
  try {
    return NextResponse.json({ data: toUserDetail(await getUserByIdOrThrow((await params).id)) });
  } catch (error) {
    const mapped = mapUserDetailError(error);
    return NextResponse.json({ message: mapped.message }, { status: mapped.status });
  }
}
