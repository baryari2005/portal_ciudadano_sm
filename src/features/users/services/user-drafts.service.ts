import { axiosInstance } from "@/lib/axios";

export type DraftStepStatus = "pending" | "unsaved" | "valid" | "invalid";
export type UserDraft<T extends Record<string, unknown>> = {
  id: string;
  payload: T;
  currentStep: number;
  stepStatuses: Record<number, DraftStepStatus>;
  viewMode: "workflow" | "full";
  updatedAt: string;
};

export async function getUserDraft<T extends Record<string, unknown>>(scope: "citizen" | "personnel" | "profile", mode: "create" | "edit", subjectUserId?: string) {
  const { data } = await axiosInstance.get<{ data: UserDraft<T> | null }>("/user-drafts", { params: { scope, mode, subjectUserId } });
  return data.data;
}

export async function saveUserDraft<T extends Record<string, unknown>>(input: { id?: string; scope: "citizen" | "personnel" | "profile"; mode: "create" | "edit"; subjectUserId?: string; payload: T; currentStep: number; stepStatuses: Record<number, DraftStepStatus>; viewMode: "workflow" | "full" }) {
  const { data } = await axiosInstance.post<{ data: UserDraft<T> }>("/user-drafts", input);
  return data.data;
}

export async function deleteUserDraft(id: string) {
  await axiosInstance.delete("/user-drafts", { params: { id } });
}
