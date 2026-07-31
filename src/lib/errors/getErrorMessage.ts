export function getErrorMessage(
  err: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (
      err as {
        response?: {
          data?: {
            error?: string;
            message?: string;
          };
        };
      }
    ).response;

    return response?.data?.error || response?.data?.message || fallback;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
}
