export function resolveRoleCode(role: { codigo?: string | null; nombre: string }) {
  if (role.codigo?.trim()) return role.codigo;

  const normalizedName = role.nombre.trim().toLocaleLowerCase("es-AR");
  const baseCodes: Record<string, string> = {
    administrador: "admin",
    ciudadano: "citizen",
    profesor: "teacher",
    recepción: "reception",
    recepcion: "reception",
  };

  return baseCodes[normalizedName] ?? normalizedName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
