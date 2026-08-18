export type ExactAddressParts = {
  street: string;
  number: string;
  complement: string;
};

export function splitExactAddress(value: string): ExactAddressParts {
  const normalized = value.trim();
  const match = normalized.match(/^(.*?)(?:\s+(\d+[A-Za-z]?))(?:,\s*(.*))?$/);
  return match
    ? { street: match[1] ?? "", number: match[2] ?? "", complement: match[3] ?? "" }
    : { street: normalized, number: "", complement: "" };
}

export function joinExactAddress(street: string, number: string, complement: string) {
  const main = [street.trim(), number.trim()].filter(Boolean).join(" ");
  return [main, complement.trim()].filter(Boolean).join(", ");
}
