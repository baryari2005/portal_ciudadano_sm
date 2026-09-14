import { activityDraftPayloadSchema, type ActivityDraftPayload } from "../schemas/activity-draft.schema";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function draftFingerprint(payload: ActivityDraftPayload): string {
  const parsed = activityDraftPayloadSchema.safeParse(payload);
  // A payload mid-edit can momentarily fail validation; canonical() sorts generically
  // by key/array without assuming the expected shape, so it can't throw here.
  if (!parsed.success) return JSON.stringify(canonical(payload));
  const normalized = parsed.data;
  return JSON.stringify(canonical({
    ...normalized,
    publicosObjetivoIds: [...normalized.publicosObjetivoIds].sort(),
    fechasExcluidas: [...normalized.fechasExcluidas].sort(),
    requirements: [...normalized.requirements].sort((a, b) => a.requisitoId.localeCompare(b.requisitoId)),
    schedules: normalized.schedules.map((schedule) => ({
      ...schedule,
      profesorIds: [...schedule.profesorIds].sort(),
      recursoIds: [...schedule.recursoIds].sort(),
      teacherAssignments: schedule.teacherAssignments.map((assignment) => ({ ...assignment, professorIds: [...assignment.professorIds].sort() })).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    })).sort((a, b) => `${a.id ?? ""}:${a.diaSemana}:${a.horaInicio}`.localeCompare(`${b.id ?? ""}:${b.diaSemana}:${b.horaInicio}`)),
  }));
}

// Private metadata stays in the existing JSON column and is never accepted from the client.
export type DraftMetadata = { baseline: string; activityUpdatedAt?: string };
export function readDraftMetadata(value: unknown): DraftMetadata | null {
  if (!value || typeof value !== "object" || !("__draft" in value)) return null;
  const metadata = value.__draft;
  if (!metadata || typeof metadata !== "object" || !("baseline" in metadata) || typeof metadata.baseline !== "string") return null;
  return { baseline: metadata.baseline, ...("activityUpdatedAt" in metadata && typeof metadata.activityUpdatedAt === "string" ? { activityUpdatedAt: metadata.activityUpdatedAt } : {}) };
}

export function draftHasChanges(payload: ActivityDraftPayload, metadata: DraftMetadata | null) {
  // Preserve legacy drafts whose original snapshot was not recorded.
  return !metadata || draftFingerprint(payload) !== metadata.baseline;
}

export function nextDraftTimestamp(previous: Date, now = Date.now()) {
  return new Date(Math.max(now, previous.getTime() + 1));
}
