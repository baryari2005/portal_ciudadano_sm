import { type NextRequest, NextResponse } from "next/server";

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
};

const SAN_MIGUEL = { latitude: -34.5431, longitude: -58.7119 } as const;

function coordinate(value: string | null, min: number, max: number) {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const requestedLatitude = coordinate(request.nextUrl.searchParams.get("latitude"), -90, 90);
    const requestedLongitude = coordinate(request.nextUrl.searchParams.get("longitude"), -180, 180);
    const usesCurrentLocation = requestedLatitude !== null && requestedLongitude !== null;
    const latitude = requestedLatitude ?? SAN_MIGUEL.latitude;
    const longitude = requestedLongitude ?? SAN_MIGUEL.longitude;
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,weather_code,is_day",
      timezone: "America/Argentina/Buenos_Aires",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error("Weather provider unavailable");
    const payload = (await response.json()) as OpenMeteoResponse;
    if (typeof payload.current?.temperature_2m !== "number") throw new Error("Invalid weather response");
    return NextResponse.json({
      temperature: Math.round(payload.current.temperature_2m),
      weatherCode: payload.current.weather_code ?? 0,
      isDay: payload.current.is_day !== 0,
      location: usesCurrentLocation ? "Tu ubicación" : "San Miguel",
    });
  } catch {
    return NextResponse.json({ message: "Clima temporalmente no disponible." }, { status: 503 });
  }
}
