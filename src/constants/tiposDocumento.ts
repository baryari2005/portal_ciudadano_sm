export const TIPOS_DOCUMENTO_OPCIONES = [
  "DNI",
  "PAS",
  "LE",
  "LC",
  "CI",
] as const;
export type TiposDocumento = (typeof TIPOS_DOCUMENTO_OPCIONES)[number];
