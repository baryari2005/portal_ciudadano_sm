import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reverseAddress, searchAddresses } from "@/features/geocoding/services/nominatim.server";

const searchSchema = z.object({ q: z.string().trim().min(3).max(200) });
const reverseSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export async function GET(request: NextRequest) {
  try {
    const input = Object.fromEntries(request.nextUrl.searchParams);
    if ("q" in input) {
      const parsed = searchSchema.safeParse(input);
      if (!parsed.success) return NextResponse.json({ message: "Ingresá al menos 3 caracteres." }, { status: 400 });
      return NextResponse.json({ data: await searchAddresses(parsed.data.q) });
    }
    const parsed = reverseSchema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ message: "Coordenadas inválidas." }, { status: 400 });
    return NextResponse.json({ data: await reverseAddress(parsed.data.lat, parsed.data.lng) });
  } catch {
    return NextResponse.json({ message: "No pudimos consultar el servicio de ubicaciones." }, { status: 502 });
  }
}
