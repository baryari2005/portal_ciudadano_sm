export function toYMD(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromYMD(value?: string | null) {
  return value && value.trim() ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function emptyToNull(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}
