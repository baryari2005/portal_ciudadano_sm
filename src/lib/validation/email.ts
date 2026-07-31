export const EMAIL_VALIDATION_MESSAGE = "Email invalido";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function isValidEmail(value?: string | null) {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return true;
  }

  return EMAIL_REGEX.test(normalized);
}

export function isRequiredValidEmail(value?: string | null) {
  return normalizeEmail(value).length > 0 && isValidEmail(value);
}
