import type { QrParseResult } from "../types/access.types";

export function sanitizeDni(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidDni(value: string) {
  return /^\d{7,9}$/.test(value);
}

export function parseQrPayload(payload: string): QrParseResult {
  const dni = sanitizeDni(payload.trim());

  if (!isValidDni(dni)) {
    return { type: "invalid", value: null };
  }

  return { type: "dni", value: dni };
}
