"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { axiosInstance } from "@/lib/axios";
import type { GeneralSettings } from "../types/general-settings.types";
import { CatalogLoadingState, setCatalogPageSize } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { DEFAULT_EXPERIENCE_PALETTES, paletteCssVariables } from "../constants/experience-palettes";
import type { ExperienceKey } from "../types/general-settings.types";

const FALLBACK_PAGE_SIZE = 6;
const Context = createContext({ pageSize: FALLBACK_PAGE_SIZE, refresh: async () => {} });

export function GeneralSettingsProvider({ children, experience = "administration" }: { children: ReactNode; experience?: ExperienceKey }) {
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE);
  const [palettes, setPalettes] = useState(DEFAULT_EXPERIENCE_PALETTES);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      const settings = (await axiosInstance.get<{ data: GeneralSettings | null }>("/public/general-settings")).data.data;
      if (settings) { setCatalogPageSize(settings.pageSize); setPageSize(settings.pageSize); setPalettes(settings.experiencePalettes); }
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh().catch(() => undefined); }, []);
  if (loading) return <CatalogLoadingState label="configuración general" fullPage viewport />;
  return <Context.Provider value={{ pageSize, refresh }}><div className="contents" style={paletteCssVariables(palettes[experience])}>{children}</div></Context.Provider>;
}

export function useCatalogPageSize() {
  return useContext(Context).pageSize;
}

export function useGeneralSettingsRefresh() {
  return useContext(Context).refresh;
}
