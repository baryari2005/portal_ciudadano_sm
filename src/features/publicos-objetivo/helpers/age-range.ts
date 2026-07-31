export function formatSuggestedAgeRange(
  minimum: number | null,
  maximum: number | null,
) {
  if (minimum == null && maximum == null) {
    return "Sin rango de edad";
  }

  if (minimum != null && maximum == null) {
    return `Desde ${minimum} años`;
  }

  if (minimum == null && maximum != null) {
    return `Hasta ${maximum} años`;
  }

  return `De ${minimum} a ${maximum} años`;
}
