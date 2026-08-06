import type { CSSProperties } from "react";

import type { ExperienceKey, ExperiencePalette, ExperiencePalettes } from "../types/general-settings.types";

export const EXPERIENCE_KEYS: ExperienceKey[] = ["administration", "reception", "teacher", "citizen"];

export const EXPERIENCE_LABELS: Record<ExperienceKey, string> = {
  administration: "Administración",
  reception: "Recepción",
  teacher: "Profesor",
  citizen: "Ciudadano",
};

export const DEFAULT_EXPERIENCE_PALETTE: ExperiencePalette = {
  primary: "#1D4F36",
  primaryHover: "#143A27",
  primaryStrong: "#00522C",
  secondary: "#819B56",
  accent: "#DDEF8F",
  highlight: "#DDEED2",
  neutral: "#B2B2B2",
  page: "#F7FBF5",
  panel: "#EEF6E9",
  control: "#F7FBF5",
  search: "#E5E7E5",
  border: "#C9D9C3",
  borderSoft: "#DDE8D7",
  heading: "#003A22",
  ink: "#173C2A",
  text: "#315644",
  muted: "#5F6F68",
};

export const DEFAULT_EXPERIENCE_PALETTES: ExperiencePalettes = Object.fromEntries(
  EXPERIENCE_KEYS.map((key) => [key, { ...DEFAULT_EXPERIENCE_PALETTE }]),
) as ExperiencePalettes;

export function paletteCssVariables(palette: ExperiencePalette): CSSProperties {
  return {
    "--brand-primary": palette.primary,
    "--brand-primary-hover": palette.primaryHover,
    "--brand-primary-strong": palette.primaryStrong,
    "--brand-secondary": palette.secondary,
    "--brand-accent": palette.accent,
    "--brand-highlight": palette.highlight,
    "--brand-neutral": palette.neutral,
    "--brand-page": palette.page,
    "--brand-panel": palette.panel,
    "--brand-control": palette.control,
    "--brand-search": palette.search,
    "--brand-border": palette.border,
    "--brand-border-soft": palette.borderSoft,
    "--brand-heading": palette.heading,
    "--brand-ink": palette.ink,
    "--brand-text": palette.text,
    "--brand-muted": palette.muted,
    "--primary": palette.primary,
    "--secondary": palette.secondary,
    "--border": palette.border,
    "--input": palette.border,
    "--ring": palette.secondary,
    "--accent": palette.panel,
    "--accent-foreground": palette.primary,
    "--muted": palette.control,
    "--muted-foreground": palette.muted,
    "--sidebar": palette.primary,
    "--sidebar-primary": palette.secondary,
    "--sidebar-accent": `color-mix(in srgb, ${palette.secondary} 18%, transparent)`,
    "--sidebar-ring": palette.secondary,
  } as CSSProperties;
}
