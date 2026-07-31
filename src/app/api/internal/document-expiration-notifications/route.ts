import { NextRequest, NextResponse } from "next/server";

import { processDocumentExpirationNotifications } from "@/features/user-documents/services/document-expiration.server";

export async function POST(request: NextRequest) {
  const secret = process.env.DOCUMENT_EXPIRATION_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  return NextResponse.json({ data: await processDocumentExpirationNotifications() });
}
