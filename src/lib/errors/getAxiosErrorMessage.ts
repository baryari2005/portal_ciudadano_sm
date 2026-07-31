import axios from "axios";

type ApiErrorData = {
  message?: string;
};

export function getAxiosMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorData | undefined;
    return data?.message ?? fallback;
  }

  return fallback;
}
