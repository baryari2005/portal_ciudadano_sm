import { axiosInstance } from "@/lib/axios";
import type { CreateRequirementInput, Requirement, RequirementFilters, UpdateRequirementInput } from "../types/requirement.types";
export async function listRequirementsClient(filters?: RequirementFilters) { return (await axiosInstance.get<{ data: Requirement[] }>("/requirements", { params: filters })).data.data; }
export async function getRequirementClient(id: string) { return (await axiosInstance.get<{ data: Requirement }>(`/requirements/${id}`)).data.data; }
export async function createRequirementClient(input: CreateRequirementInput) { return (await axiosInstance.post<{ data: Requirement }>("/requirements", input)).data.data; }
export async function updateRequirementClient(id: string, input: UpdateRequirementInput) { return (await axiosInstance.patch<{ data: Requirement }>(`/requirements/${id}`, input)).data.data; }
export async function deactivateRequirementClient(id: string) { return (await axiosInstance.delete<{ data: Requirement }>(`/requirements/${id}`)).data.data; }
export const reactivateRequirementClient = (id: string) => updateRequirementClient(id, { activo: true });
