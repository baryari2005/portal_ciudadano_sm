import { axiosInstance } from "@/lib/axios";import type { CreateEnrollmentInput,Enrollment,EnrollmentFilters,EnrollmentStatus,UpdateEnrollmentInput } from "../types/enrollment.types";
type Item={data:Enrollment};type List={data:Enrollment[];meta:{total:number;page:number;pageSize:number;pageCount:number}};
export const listEnrollmentsClient=async(params?:EnrollmentFilters)=>(await axiosInstance.get<List>("/enrollments",{params})).data;
export const getEnrollmentClient=async(id:string)=>(await axiosInstance.get<Item>(`/enrollments/${id}`)).data.data;
export const createEnrollmentClient=async(input:CreateEnrollmentInput)=>(await axiosInstance.post<Item>("/enrollments",input)).data.data;
export const updateEnrollmentClient=async(id:string,input:UpdateEnrollmentInput)=>(await axiosInstance.patch<Item>(`/enrollments/${id}`,input)).data.data;
export const changeEnrollmentStatusClient=(id:string,estado:EnrollmentStatus,input:Omit<UpdateEnrollmentInput,"estado">={})=>updateEnrollmentClient(id,{...input,estado});

