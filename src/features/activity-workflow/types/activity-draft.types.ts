import type { ActivityDraftPayload } from "../schemas/activity-draft.schema";
export type ActivityDraftPending = { step: number; key: string; label: string };
export type ActivityDraft = { id: string; activityId: string | null; name: string; modality: ActivityDraftPayload["modalidadOperacion"]; currentStep: number; status: string; payload: ActivityDraftPayload; pending: ActivityDraftPending[]; completion: number; updatedAt: string; createdAt: string };
export type { ActivityDraftPayload };
