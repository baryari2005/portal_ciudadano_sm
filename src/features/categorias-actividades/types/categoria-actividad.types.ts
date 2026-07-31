import type {
  CategoriaActividadInput as CategoriaActividadCreateSchemaInput,
  UpdateCategoriaActividadInput as CategoriaActividadUpdateSchemaInput,
} from "../schemas/categoria-actividad.schema";

export type CategoriaActividad = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoriaActividadInput = CategoriaActividadCreateSchemaInput;
export type UpdateCategoriaActividadInput = CategoriaActividadUpdateSchemaInput;

export type CategoriaActividadListResponse = {
  data: CategoriaActividad[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};
