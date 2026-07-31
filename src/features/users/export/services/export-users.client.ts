import { ExportUsersStats } from "../types/export-users.types";

type ExportUsersResult = ExportUsersStats;

export async function exportUsersExcel(): Promise<ExportUsersResult> {
  const token = localStorage.getItem("token");
  const startedAt = performance.now();

  const response = await fetch("/api/users/export", {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const data = await response.json();
      message = data?.error || data?.message || message;
    } catch {
      const text = await response.text().catch(() => "");
      message = text || message;
    }

    throw new Error(message);
  }

  const users = Number(response.headers.get("X-Users-Count") || "0");
  const legajos = Number(response.headers.get("X-Legajos-Count") || "0");
  const elapsedServer = Number(response.headers.get("X-Elapsed-Ms") || "0");

  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename="(.+?)"/i);
  const filename = fileNameMatch?.[1] || "export_usuarios_legajos.xlsx";

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  const elapsedClient = Math.round(performance.now() - startedAt);

  return {
    users,
    legajos,
    elapsedMs: elapsedServer || elapsedClient,
    filename,
  };
}
