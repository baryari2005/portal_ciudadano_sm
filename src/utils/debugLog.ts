export function dbg(scope: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === "production") return;

  const ts = new Date().toISOString().split("T")[1]?.replace("Z", "") ?? "";

  const isBrowser =
    typeof globalThis === "object" &&
    "window" in (globalThis as Record<string, unknown>) &&
    (globalThis as Record<string, unknown>).window === globalThis;

  if (isBrowser) {
    console.log(`[${ts}] ${scope}:`, ...args);
  }
}
