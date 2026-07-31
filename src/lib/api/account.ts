import { axiosInstance } from "@/lib/axios";
import type { AxiosRequestConfig } from "axios";

type RequestConfigWithSkipAuthRedirect = AxiosRequestConfig & {
  skipAuthRedirect?: boolean;
};

const authSafeConfig: RequestConfigWithSkipAuthRedirect = {
  withCredentials: true,
  skipAuthRedirect: true,
};

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data } = await axiosInstance.post(
    "/auth/change-password",
    payload,
    authSafeConfig,
  );

  return data;
}

export async function changeEmail(payload: {
  email: string;
  password: string;
}) {
  const { data } = await axiosInstance.post(
    "/auth/change-email",
    payload,
    authSafeConfig,
  );

  return data;
}

export async function changeMyAvatar(payload: { avatarUrl: string }) {
  const { data } = await axiosInstance.post(
    "/auth/change-avatar",
    payload,
    authSafeConfig,
  );

  return data;
}
