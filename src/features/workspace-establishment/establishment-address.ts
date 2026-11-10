type Address = { direccion?: string | null; localidad?: string | null; provincia?: string | null };

export function establishmentAddress(value: Address) {
  const parts = (value.direccion ?? "").split(",").map(part => part.trim()).filter(Boolean);
  const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
  for (const part of [value.localidad, value.provincia]) {
    if (part?.trim() && !parts.some(existing => normalized(existing) === normalized(part.trim()))) parts.push(part.trim());
  }
  return parts.join(", ");
}
