import { axiosInstance } from "@/lib/axios";
export type MedicalCoverage={id:string;nombre:string;imagenUrl:string|null;tipo:"OBRA_SOCIAL"|"PREPAGA";activo:boolean};
export const listMedicalCoveragesClient=async(active?:boolean)=>(await axiosInstance.get<{data:MedicalCoverage[]}>("/medical-coverages",{params:active===undefined?{}:{active}})).data.data;
export const listPublicMedicalCoveragesClient=async()=>(await axiosInstance.get<{data:MedicalCoverage[]}>("/public/medical-coverages",{skipAuthRedirect:true})).data.data;
export const createMedicalCoverageClient=async(input:Omit<MedicalCoverage,"id">)=>(await axiosInstance.post("/medical-coverages",input)).data.data;
export const updateMedicalCoverageClient=async(id:string,input:Partial<Omit<MedicalCoverage,"id">>)=>(await axiosInstance.patch(`/medical-coverages/${id}`,input)).data.data;
