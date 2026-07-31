import type { z } from "zod";
import type { createActivityScheduleSchema, SCHEDULE_STATUSES, WEEK_DAYS } from "../schemas/activity-schedule.schema";

export type WeekDay = (typeof WEEK_DAYS)[number];
export type ActivityScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export type CreateActivityScheduleInput = z.input<typeof createActivityScheduleSchema>;
export type UpdateActivityScheduleInput = Partial<CreateActivityScheduleInput>;
export type ActivityScheduleProfessor = { id: string; fullName: string; specialty: string | null; status: string; isPrimary: boolean };
export type ActivitySchedule = {
  id: string; activityId: string; establishmentId: string; day: WeekDay; startTime: string; endTime: string;
  space: string | null; notes: string | null; maxCapacity: number; waitingListEnabled: boolean;
  overbookingEnabled: boolean; overbookingLimit: number | null; status: ActivityScheduleStatus;
  activity: { id: string; name: string }; establishment: { id: string; name: string; address: string };
  professors: ActivityScheduleProfessor[]; createdAt: string; updatedAt: string;
  slotDurationMinutes: number | null; slotGapMinutes: number;
  resources: Array<{ id: string; resourceId: string; name: string; code: string; quantity: number; assignmentStrategy: "AUTOMATICA" | "ELEGIDA_USUARIO" | "AL_INGRESAR"; exclusive: boolean }>;
};
export type ActivityScheduleFilters = { search?: string; activityId?: string; establishmentId?: string; professorId?: string; day?: WeekDay; status?: ActivityScheduleStatus };
