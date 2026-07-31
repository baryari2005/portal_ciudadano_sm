import { axiosInstance } from "@/lib/axios";

import { CompleteProfileValues } from "../schemas/complete-profile.schema";

export async function completeProfile(payload: CompleteProfileValues) {
  const { data } = await axiosInstance.patch<{
    redirectTo?: string;
  }>("/auth/profile/complete", payload);

  return data;
}
