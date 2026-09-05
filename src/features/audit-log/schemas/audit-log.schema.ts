import { z } from "zod";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  AUDIT_ORIGINS,
} from "../types/audit-log.types";
export const auditLogIdSchema = z.string().min(1).max(100);
export const auditLogFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  actorId: z.string().uuid().optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.enum(AUDIT_ENTITIES).optional(),
  entityId: z.string().trim().max(100).optional(),
  origin: z.enum(AUDIT_ORIGINS).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;