import { messages } from "@/utils/messages";

/**
 * Capitaliza la primera letra de una string.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitaliza la primera letra de cada palabra.
 */
export function capitalizeEachWord(str: string): string {
  return str.toLowerCase().split(" ").map(capitalize).join(" ");
}

/**
 * Formatea mensajes de usuario:
 * - Capitaliza la primera letra de cada oración
 * - Agrega punto final si no lo tiene
 */
export function formatMessage(message: string): string {
  if (!message) return "";

  const cleaned = message.trim().replace(/\s*\.\s*/g, ". ");

  const sentences = cleaned
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());

  let result = sentences.join(". ");
  if (!result.endsWith(".")) {
    result += ".";
  }

  return result;
}

/**
 * Formatea una fecha a formato legible DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function formatApiMessage(path: string): string {
  const parts = path.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (!isRecord(current) || !(part in current)) {
      console.warn(
        `[formatMessage] Mensaje no encontrado para la ruta: ${path}`,
      );
      return path;
    }

    current = current[part];
  }

  return typeof current === "string" ? current : path;
}
