// src/lib/cuil.ts
/** Deja solo dígitos y recorta a 11 */
export function normalizeCuil(raw: string): string {
  return (raw || "").replace(/\D+/g, "").slice(0, 11);
}

/** Devuelve ##-########-# (si hay suficientes dígitos) */
export function formatCuil(raw: string): string {
  const d = normalizeCuil(raw);
  const a = d.slice(0, 2);
  const b = d.slice(2, 10);
  const c = d.slice(10, 11);
  if (d.length <= 2) return a;
  if (d.length <= 10) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

/** Valida largo y dígito verificador (módulo 11) */
export function isValidCuil(raw: string): boolean {
  const d = normalizeCuil(raw);
  if (d.length !== 11) return false;

  const nums = d.split("").map(Number);
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; // para los primeros 10 dígitos
  const sum = weights.reduce((acc, w, i) => acc + w * nums[i], 0);
  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 9;
  return dv === nums[10];
}

export function extractDniFromCuil(cuil: string): string | null {
  const only = (cuil || "").replace(/\D/g, "");
  if (only.length !== 11) return null;
  // devuelve los 8 del medio, preservando ceros a la izquierda
  return only.slice(2, 10);
}

/** Devuelve solo dígitos del CUIL/identificador. */
export function cuilDigits(input: string | number | null | undefined): string {
  return String(input ?? "").replace(/\D+/g, "");
}

/** Formatea a XX-XXXXXXXX-X si tiene 11 dígitos.
 *  Si no tiene 11 dígitos, devuelve el valor original (trim).
 */
export function cuilDashed(input: string | number | null | undefined): string {
  const d = cuilDigits(input);
  if (d.length !== 11) return String(input ?? "").trim();
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/** Normaliza a solo dígitos (11) o tira error si la longitud no es 11. */
export function assertCuil11Digits(input: string | number): string {
  const d = cuilDigits(input);
  if (d.length !== 11) {
    throw new Error(
      `CUIL inválido: se esperaban 11 dígitos y llegó "${input}"`,
    );
  }
  return d;
}

/** Valida formato con o sin guiones (solo longitud y dígitos, sin DV). */
export function isCuilFormat(input: string | number): boolean {
  const s = String(input ?? "").trim();
  return /^\d{11}$/.test(s.replace(/\D+/g, ""));
}

/** (Opcional) Valida dígito verificador.
 *  Si no usás esta verificación, podés borrar esta función.
 */
export function isValidCuilDV(input: string | number): boolean {
  const d = cuilDigits(input);
  if (d.length !== 11) return false;

  // Algoritmo de verificación AFIP
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const nums = d.split("").map(Number);
  const sum = weights.reduce((acc, w, i) => acc + w * nums[i], 0);
  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 9; // ajuste AFIP
  return dv === nums[10];
}

// cuilDigits("27-20442382-8");     // "27204423828"
// cuilDashed("27204423828");       // "27-20442382-8"
// cuilDashed("27-20442382-8");     // "27-20442382-8" (idempotente)
// isCuilFormat("27-20442382-8");   // true
// isValidCuilDV("27-20442382-8");  // true/false según DV
