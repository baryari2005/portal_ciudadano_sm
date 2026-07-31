export const toYMD = (d?: Date | null) => {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const titleCase = (raw?: string | null): string | null => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;

  const cap = (w: string) =>
    w
      .split("-")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join("-");

  return s.split(/\s+/).map(cap).join(" ");
};

export const formatCuil = (v?: string | null): string | null => {
  if (!v) return null;
  const d = v.replace(/\D+/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
};

export const buildExportFilename = (now = new Date()) => {
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  return `export_usuarios_legajos_${stamp}.xlsx`;
};
