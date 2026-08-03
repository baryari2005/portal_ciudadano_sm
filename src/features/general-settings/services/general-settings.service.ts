import { axiosInstance } from "@/lib/axios";
import type { GeneralSettings } from "../types/general-settings.types";

export async function getGeneralSettingsClient() {
  return (await axiosInstance.get<{ data: GeneralSettings }>("/general-settings")).data.data;
}

export async function updateGeneralSettingsClient(input: GeneralSettings) {
  return (await axiosInstance.put<{ data: GeneralSettings }>("/general-settings", input)).data.data;
}
