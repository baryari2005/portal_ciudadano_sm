import type { ActivityRequirementInput, RequirementInput, UpdateRequirementInput } from "../schemas/requirement.schema";

export type RequirementType = "INFORMACION" | "DOCUMENTO" | "CONSENTIMIENTO" | "ELEMENTO_PERSONAL" | "CONDICION";
export type RequirementObligatoriness = "OBLIGATORIO" | "RECOMENDADO";
export type Requirement = { id: string; nombre: string; slug: string; descripcion: string | null; tipo: RequirementType; requiereDocumento: boolean; documentoPersonal: boolean; tieneVencimiento: boolean; vigenciaDias: number | null; diasAvisoVencimiento: number; obligatoriedad: RequirementObligatoriness; provistoPorInstitucion: boolean; requiereConfirmacion: boolean; controlarAlIngreso: boolean; aplicaEnCadaClase: boolean; instrucciones: string | null; orden: number; activo: boolean; createdAt: string; updatedAt: string };
export type ActivityRequirement = { id: string; name: string; slug: string; type: RequirementType; requiresDocument: boolean; mandatory: boolean; obligatoriness: RequirementObligatoriness; suppliedByInstitution: boolean; requiresConfirmation: boolean; checkAtEntry: boolean; appliesEveryClass: boolean; observations: string | null; instructions: string | null; order: number; active: boolean };
export type CreateRequirementInput = RequirementInput;
export type { UpdateRequirementInput, ActivityRequirementInput };
export type RequirementFilters = { search?: string; type?: RequirementType; active?: boolean; requiresDocument?: boolean; orderBy?: "orden" | "nombre" | "createdAt" | "updatedAt"; orderDir?: "asc" | "desc" };
