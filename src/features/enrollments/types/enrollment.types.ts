import type { z } from "zod";
import type { EnrollmentDocumentationSummary } from "@/features/enrollment-documents/types/enrollment-document.types";
import type { createEnrollmentSchema, ENROLLMENT_STATUSES, enrollmentFiltersSchema, updateEnrollmentSchema } from "../schemas/enrollment.schema";
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type EnrollmentFilters = z.input<typeof enrollmentFiltersSchema>;
export type EnrollmentCapacity = { maxCapacity:number; overbookingLimit:number|null; totalCapacity:number; confirmedCount:number; normalAvailableCount:number; availableCount:number; waitlistCount:number };
export type Enrollment = { id:string; status:EnrollmentStatus; enrollmentDate:string; confirmationDate:string|null; waitlistDate:string|null; cancellationDate:string|null; waitlistPosition:number|null; observations:string|null; rejectionReason:string|null; cancellationReason:string|null; user:{id:string;firstName:string|null;lastName:string|null;documentNumber:string|null;email:string}; activitySchedule:{id:string;day:string;startTime:string;endTime:string;activity:{id:string;name:string};establishment:{id:string;name:string}}; selectedSchedules:Array<{id:string;day:string;startTime:string;endTime:string;establishment:{id:string;name:string}}>; capacity:EnrollmentCapacity; documentation:EnrollmentDocumentationSummary; createdAt:string;updatedAt:string };
