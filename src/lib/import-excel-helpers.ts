import * as XLSX from "xlsx";

export function StringOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export function nullifyEmpty(v: string | null): string | null {
  return v && v.trim() ? v : null;
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

function parseYmdString(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yyyy, mm, dd] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  return isValidDate(date) ? date : null;
}

function parseDmyString(value: string): Date | null {
  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  return isValidDate(date) ? date : null;
}

/** Normaliza diversas representaciones de fecha Excel → "YYYY-MM-DD" | null */
export function normalizeExcelDate(input: unknown): string | null {
  if (input == null || input === "") return null;

  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;

    const ymdDate = parseYmdString(s);
    if (ymdDate) return toYmd(ymdDate);

    const dmyDate = parseDmyString(s);
    if (dmyDate) return toYmd(dmyDate);

    const fallbackDate = new Date(s);
    return isValidDate(fallbackDate) ? toYmd(fallbackDate) : null;
  }

  if (typeof input === "number") {
    const d = XLSX.SSF.parse_date_code(input);
    if (!d || !d.y || !d.m || !d.d) return null;

    const jsDate = new Date(d.y, d.m - 1, d.d);
    return isValidDate(jsDate) ? toYmd(jsDate) : null;
  }

  if (input instanceof Date) {
    return isValidDate(input) ? toYmd(input) : null;
  }

  return null;
}
