export type MapProvider = "openstreetmap" | "google" | "manual";

export type AddressLocation = {
  address: string;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  locality?: string;
  province?: string;
  postalCode?: string;
  provider?: MapProvider;
};

export type GeocodingResult = AddressLocation & { lat: number; lng: number };
