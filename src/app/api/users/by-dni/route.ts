import { NextRequest, NextResponse } from "next/server";

import { findAccessUserByDni } from "@/features/access/services/access.server";
import { isValidDni, sanitizeDni } from "@/features/access/helpers/qr.helpers";
import { requireAuth } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const dni = sanitizeDni(req.nextUrl.searchParams.get("dni") ?? "");

    if (!isValidDni(dni)) {
      return NextResponse.json(null);
    }

    const user = await findAccessUserByDni(dni);

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ALLOWED") {
      return NextResponse.json(
        { message: "Cuenta no habilitada" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "No pudimos validar el QR." },
      { status: 500 },
    );
  }
}
