import type {
  RequestAccessFormValues,
  RequestAccessPayload,
} from "../schemas/requestAccessSchema";

export type { RequestAccessFormValues, RequestAccessPayload };

export type RequestAccessResponse = {
  ok: boolean;
  message: string;
};
