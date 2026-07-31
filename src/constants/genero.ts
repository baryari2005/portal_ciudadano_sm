export const GENERO_OPCIONES = [
  "MASCULINO",
  "FEMENINO",
  "NO_BINARIO",
  "OTRO",
  "PREFIERE_NO_DECIR",
] as const;
export type Genero = (typeof GENERO_OPCIONES)[number];
