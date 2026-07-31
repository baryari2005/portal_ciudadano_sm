export type Role = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  _count: {
    permisos: number;
    usuarios: number;
  };
};

export type Props = {
  roles: Role[];
};

export interface RolesListProps {
  search?: string;
  refresh?: string | number;
}

export type Permiso = {
  id: number;
  modulo: string;
  accion: string;
  descripcion?: string | null;
  icono?: string | null;
};

export type PermisosGrupo = {
  modulo: string;
  permisos: Permiso[];
};

export type RoleUpdate = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  permisos: {
    permiso: Permiso;
  }[];
};
