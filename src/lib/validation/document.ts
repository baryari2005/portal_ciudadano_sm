export const DOCUMENT_NUMBER_VALIDATION_MESSAGE =
  "El DNI debe tener entre 7 y 8 digitos.";

export function onlyDocumentDigits(value: string) {
  return value.replace(/\D+/g, "");
}

export function normalizeDocumentNumber(value?: string | null) {
  return onlyDocumentDigits(value ?? "");
}

export function isValidDni(value?: string | null) {
  const normalized = normalizeDocumentNumber(value);

  if (!normalized) {
    return true;
  }

  return normalized.length >= 7 && normalized.length <= 8;
}
