import { axiosInstance } from "@/lib/axios";
import { normalizeEmail } from "../libs/utils";

export async function requestPasswordReset(email: string) {
  const normalized = normalizeEmail(email);
  await axiosInstance.post(
    "/auth/forgot-password",
    { email: normalized },
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function resetPassword(token: string, newPassword: string) {
  await axiosInstance.post(
    "/auth/reset-password",
    { token, newPassword },
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function validateResetToken(token: string) {
  return axiosInstance.get(`/auth/reset-password/validate`, {
    params: { token },
  });
}
