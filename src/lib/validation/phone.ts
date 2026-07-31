export const PHONE_VALIDATION_MESSAGE =
  "El telefono debe tener entre 8 y 15 digitos.";

const PHONE_ALLOWED_CHARS_REGEX = /^[+]?[\d\s().-]{8,24}$/;

export function onlyPhoneDigits(value: string) {
  return value.replace(/\D+/g, "");
}

export function normalizePhone(value?: string | null) {
  return (value ?? "").trim();
}

export function cleanPhoneInput(value: string) {
  return value.replace(/[^\d+\s().-]/g, "").replace(/(?!^)\+/g, "");
}

export function formatPhoneForDisplay(value?: string | null) {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return "";
  }

  const digits = onlyPhoneDigits(normalized);

  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 12 && digits.startsWith("54")) {
    return `+54 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }

  if (normalized.startsWith("+")) {
    return `+${digits}`;
  }

  return normalized;
}

export function isValidPhone(value?: string | null) {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return true;
  }

  const digits = onlyPhoneDigits(normalized);
  return (
    PHONE_ALLOWED_CHARS_REGEX.test(normalized) &&
    digits.length >= 8 &&
    digits.length <= 15
  );
}

export function isRequiredValidPhone(value?: string | null) {
  return normalizePhone(value).length > 0 && isValidPhone(value);
}
