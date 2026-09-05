import type { NextRequest } from "next/server";

import { POST as handleRequestAccess } from "../request-access/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleRequestAccess(req);
}
