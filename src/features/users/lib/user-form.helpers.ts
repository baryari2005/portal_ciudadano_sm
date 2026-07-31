export const CUIL_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

const SMALL_WORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "o",
  "u",
  "a",
  "en",
  "para",
  "por",
  "con",
  "sin",
  "al",
]);

export function onlyDigits(value: string) {
  return value.replace(/\D+/g, "");
}

export function normalizeDni(value: string) {
  return onlyDigits(value);
}

export function titleCaseEs(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\p{L}[\p{L}'-]*/gu, (word) => {
      const [first = "", ...rest] = word;
      return first.toUpperCase() + rest.join("");
    });
}

export function smartTitleCase(raw: string) {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  if (!value) {
    return "";
  }

  return value
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

export function toDisplayTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function isValidDni(value?: string) {
  if (value == null || value === "") {
    return true;
  }

  const digits = onlyDigits(value);
  return digits.length >= 7 && digits.length <= 8;
}

export function isValidCuil(value?: string) {
  if (value == null || value === "") {
    return true;
  }

  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return false;
  }

  const nums = digits.split("").map((digit) => parseInt(digit, 10));
  const check = nums[10];
  const sum = CUIL_WEIGHTS.reduce((acc, weight, index) => {
    return acc + weight * nums[index];
  }, 0);

  let verifier = 11 - (sum % 11);

  if (verifier === 11) {
    verifier = 0;
  } else if (verifier === 10) {
    verifier = 9;
  }

  return verifier === check;
}

export function cuilMatchesDni(cuil?: string, dni?: string) {
  const cuilDigits = onlyDigits(cuil || "");
  const dniDigits = onlyDigits(dni || "");

  if (!cuilDigits || !dniDigits) {
    return true;
  }

  if (cuilDigits.length !== 11) {
    return true;
  }

  return cuilDigits.slice(2, 10) === dniDigits;
}

export { isValidPhone } from "@/lib/validation/phone";

export function toInputDate(value?: string | null) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toYmdLocal(date);
}

export function fromYmdLocal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function ymdToLocalDate(value?: string | null) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

export function toYmdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toUpperTrim(value: string) {
  return value.trim().toUpperCase();
}
