import { z } from "zod";

const color = z.string().regex(/^#[0-9A-F]{6}$/i, "Ingresá un color hexadecimal válido.");

export const experiencePaletteSchema = z.object({
  primary: color,
  primaryHover: color,
  primaryStrong: color,
  secondary: color,
  accent: color,
  highlight: color,
  neutral: color,
  page: color,
  panel: color,
  control: color,
  search: color,
  border: color,
  borderSoft: color,
  heading: color,
  ink: color,
  text: color,
  muted: color,
}).strict();

export const experiencePalettesSchema = z.object({
  administration: experiencePaletteSchema,
  reception: experiencePaletteSchema,
  teacher: experiencePaletteSchema,
  citizen: experiencePaletteSchema,
}).strict();

export const generalSettingsSchema = z.object({
  pageSize: z.coerce.number().int().min(3).max(100),
  loginCollageImages: z.tuple([
    z.string().trim().url(), z.string().trim().url(),
    z.string().trim().url(), z.string().trim().url(),
  ]),
  experiencePalettes: experiencePalettesSchema,
});
