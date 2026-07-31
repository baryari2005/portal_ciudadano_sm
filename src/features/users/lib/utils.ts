export function normalize(value?: string): string {
  return value?.trim() ?? "";
}

export function pathFromPublicUrl(url?: string | null) {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return m?.[1] ?? null;
}
