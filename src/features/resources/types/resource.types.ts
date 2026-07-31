import type { ResourceInput, UpdateResourceInput } from "../schemas/resource.schema";
export type Resource = ResourceInput & { id: string; establecimiento: { id: string; nombre: string }; createdAt: string; updatedAt: string };
export type { ResourceInput, UpdateResourceInput };
