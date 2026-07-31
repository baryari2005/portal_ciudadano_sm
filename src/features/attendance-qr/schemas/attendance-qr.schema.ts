import { z } from "zod";
export const userQrActionSchema=z.object({userId:z.string().uuid()}).strict();
export const attendanceQrRegisterSchema=z.object({activitySessionId:z.string().min(1).max(100),qrToken:z.string().min(32).max(512)}).strict();
