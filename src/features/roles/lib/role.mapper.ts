type RoleWithCount = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  _count?: {
    permisos: number;
    usuarios: number;
  };
};

export function toRoleListItem(role: RoleWithCount) {
  return {
    id: role.id,
    codigo: role.codigo,
    nombre: role.nombre,
    descripcion: role.descripcion,
    activo: role.activo,
    _count: {
      permisos: role._count?.permisos ?? 0,
      usuarios: role._count?.usuarios ?? 0,
    },
  };
}
