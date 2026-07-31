import type { Genero } from "@prisma/client";

import { CatalogValidationError } from "@/lib/errors/catalog-errors";

export type EnrollmentAudience = {
  nombre: string;
  edadMinimaSugerida: number | null;
  edadMaximaSugerida: number | null;
  generosAdmitidos?: Genero[];
};

type AudienceRule = {
  birthDate: Date | null;
  referenceDate: Date;
  gender?: Genero | null;
  audiences: EnrollmentAudience[];
};

export function getAgeOnDate(birthDate: Date, referenceDate: Date) {
  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed =
    referenceDate.getUTCMonth() > birthDate.getUTCMonth() ||
    (referenceDate.getUTCMonth() === birthDate.getUTCMonth() &&
      referenceDate.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}

function audienceRangeText(audience: EnrollmentAudience) {
  const minimum = audience.edadMinimaSugerida;
  const maximum = audience.edadMaximaSugerida;
  if (minimum === null && maximum === null) return audience.nombre;
  if (maximum === null) return `${audience.nombre} de ${minimum ?? 0} años en adelante`;
  return `${audience.nombre.toLowerCase()} de ${minimum ?? 0} a ${maximum} años`;
}

function joinAudienceRanges(audiences: EnrollmentAudience[]) {
  const ranges = audiences.map(audienceRangeText);
  if (ranges.length <= 1) return ranges[0] ?? "públicos no configurados";
  return `${ranges.slice(0, -1).join(", ")} y ${ranges.at(-1)}`;
}

export function evaluateEnrollmentAge(rule: AudienceRule) {
  const age = rule.birthDate && !Number.isNaN(rule.birthDate.getTime())
    ? getAgeOnDate(rule.birthDate, rule.referenceDate)
    : null;
  if (rule.audiences.length === 0) {
    return { eligible: true as const, age, audiences: rule.audiences, reason: null };
  }
  const eligible = rule.audiences.some((audience) => {
    const requiresAge = audience.edadMinimaSugerida !== null || audience.edadMaximaSugerida !== null;
    const meetsMinimum = audience.edadMinimaSugerida === null || (age !== null && age >= audience.edadMinimaSugerida);
    const meetsMaximum = audience.edadMaximaSugerida === null || (age !== null && age <= audience.edadMaximaSugerida);
    const admittedGenders = audience.generosAdmitidos ?? [];
    const meetsGender = admittedGenders.length === 0 ||
      (rule.gender != null && admittedGenders.includes(rule.gender));
    return (!requiresAge || (meetsMinimum && meetsMaximum)) && meetsGender;
  });

  const requiresBirthDate = rule.audiences.every(
    (audience) => audience.edadMinimaSugerida !== null || audience.edadMaximaSugerida !== null,
  );
  const requiresGender = rule.audiences.every((audience) => (audience.generosAdmitidos?.length ?? 0) > 0);
  const reason = age === null && requiresBirthDate
    ? "La fecha de nacimiento es obligatoria para esta actividad."
    : rule.gender == null && requiresGender
      ? "El sexo o género es obligatorio para esta actividad."
      : `Esta actividad está dirigida a ${joinAudienceRanges(rule.audiences)} y no coincide con tu edad o sexo/género registrado.`;

  return eligible
    ? { eligible: true as const, age, audiences: rule.audiences, reason: null }
    : { eligible: false as const, age, audiences: rule.audiences, reason };
}

export function assertEnrollmentAge(rule: AudienceRule) {
  const result = evaluateEnrollmentAge(rule);
  if (!result.eligible) throw new CatalogValidationError(result.reason);
  return result;
}
