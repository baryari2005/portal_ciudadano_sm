import { axiosInstance } from "@/lib/axios";
import type { ReceptionDashboardData } from "../types/reception-dashboard.types";

export async function getReceptionDashboard(establishmentId: string) {
  const response = await axiosInstance.get<{ data: ReceptionDashboardData }>("/access", {
    params: { view: "home", establishmentId },
  });
  return response.data.data;
}
