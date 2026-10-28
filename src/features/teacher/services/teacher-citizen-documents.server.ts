import { CatalogValidationError } from "@/lib/errors/catalog-errors";
import { searchEnrollmentCitizens } from "@/features/enrollments/services/enrollment-citizens.server";
import { requireTeacherProfile, teacherEnrollmentScope, TeacherSessionAccessError } from "./teacher.server";

/** Keep document authorization tied to the existing active teacher profile. */
export async function requireTeacherDocumentProfile(userId: string) {
  try {
    return await requireTeacherProfile(userId);
  } catch (error) {
    if (error instanceof CatalogValidationError) throw new TeacherSessionAccessError();
    throw error;
  }
}

export async function searchTeacherDocumentCitizens(userId: string, query: string, page = 1, pageSize = 6, establishmentId?: string) {
  const scope = await teacherEnrollmentScope(userId, establishmentId);
  return searchEnrollmentCitizens(query, page, pageSize, { inscripciones: { some: scope } });
}
