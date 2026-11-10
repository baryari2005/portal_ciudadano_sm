/** Compare spelling, never infer a different street, height or locality. */
export function normalizeTerritory(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeStreet(value: string) {
  return normalizeTerritory(value).replace(/^av\s+/, "avenida ").replace(/\bmtro\b/g, "maestro");
}

export function exactStreetAndNumber(address: string, street: string, number: string) {
  const requested = address.trim().match(/^(.*?)\s+(\d+[A-Za-z]?)$/);
  if (!requested || requested[2].toLowerCase() !== number.trim().toLowerCase()) return false;
  const expected = normalizeStreet(requested[1]), actual = normalizeStreet(street);
  const kind = /^(?:avenida|calle)\s+/;
  // An omitted prefix is acceptable; two explicitly different kinds are not.
  return expected === actual || (kind.test(expected) !== kind.test(actual) && expected.replace(kind, "") === actual.replace(kind, ""));
}
