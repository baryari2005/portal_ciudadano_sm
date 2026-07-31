import { prisma } from "@/lib/db";
import { CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import type { MedicalCoverageInput } from "../schemas/medical-coverage.schema";
export const listMedicalCoverages=(active?:boolean)=>prisma.coberturaMedica.findMany({where:{activo:active},orderBy:[{tipo:"asc"},{nombre:"asc"}]});
export const createMedicalCoverage=(input:MedicalCoverageInput)=>prisma.coberturaMedica.create({data:input});
export async function updateMedicalCoverage(id:string,input:Partial<MedicalCoverageInput>){const exists=await prisma.coberturaMedica.findUnique({where:{id},select:{id:true}});if(!exists)throw new CatalogNotFoundError("Cobertura médica no encontrada.");return prisma.coberturaMedica.update({where:{id},data:input});}
