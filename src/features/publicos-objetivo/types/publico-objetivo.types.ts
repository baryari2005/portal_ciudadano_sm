import type {
  PublicoObjetivoInput as PublicoObjetivoCreateSchemaInput,
  UpdatePublicoObjetivoInput as PublicoObjetivoUpdateSchemaInput,
} from "../schemas/publico-objetivo.schema";

export type PublicoObjetivo = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  edadMinimaSugerida: number | null;
  edadMaximaSugerida: number | null;
  generosAdmitidos: Array<"MASCULINO" | "FEMENINO" | "NO_BINARIO" | "OTRO" | "PREFIERE_NO_DECIR">;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePublicoObjetivoInput = PublicoObjetivoCreateSchemaInput;
export type UpdatePublicoObjetivoInput = PublicoObjetivoUpdateSchemaInput;

export type PublicoObjetivoListResponse = {
  data: PublicoObjetivo[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};
