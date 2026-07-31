import { axiosInstance } from "@/lib/axios";
import type { AttendanceFilters, AttendanceRoster, AttendanceSession, MarkAttendanceBatchInput, MarkAttendanceInput, UpdateAttendanceInput } from "../types/attendance.types";

type List = { data: AttendanceSession[]; meta: { total: number; page: number; pageSize: number; pageCount: number } };

export const listAttendanceSessionsClient = async (params?: AttendanceFilters) => (await axiosInstance.get<List>("/attendance", { params })).data;
export const getAttendanceRosterClient = async (id: string, showTeacherAssignmentError = false) => (await axiosInstance.get<{ data: AttendanceRoster }>(`/attendance/${id}`, { showTeacherAssignmentError })).data.data;
export const markAttendanceClient = async (input: MarkAttendanceInput) => (await axiosInstance.post<{ data: AttendanceRoster }>("/attendance", input)).data.data;
export const markAttendanceBatchClient = async (input: MarkAttendanceBatchInput) => (await axiosInstance.post<{ data: AttendanceRoster }>("/attendance/batch", input)).data.data;
export const updateAttendanceClient = async (id: string, input: UpdateAttendanceInput) => (await axiosInstance.patch<{ data: AttendanceRoster }>(`/attendance/${id}`, input)).data.data;
export const closeAttendanceClient = async (activitySessionId: string) => (await axiosInstance.post<{ data: AttendanceRoster }>("/attendance/close", { activitySessionId })).data.data;
export const reopenAttendanceClient = async (activitySessionId: string, correctionReason: string) => (await axiosInstance.post<{ data: AttendanceRoster }>("/attendance/reopen", { activitySessionId, correctionReason })).data.data;
