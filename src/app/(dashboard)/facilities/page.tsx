"use client";

import AccessDenied403Page from "../403/page";
import { EstablecimientosPage } from "@/features/establecimientos/components/EstablecimientosPage";
import { useCan } from "@/hooks/useCan";

export default function FacilitiesRoutePage() {
  return useCan("establecimientos", "ver") ? <EstablecimientosPage /> : <AccessDenied403Page />;
}
