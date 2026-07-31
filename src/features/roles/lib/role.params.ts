export function parseRoleId(id: string) {
  const roleId = Number(id);

  if (!Number.isInteger(roleId) || roleId <= 0) {
    return null;
  }

  return roleId;
}
