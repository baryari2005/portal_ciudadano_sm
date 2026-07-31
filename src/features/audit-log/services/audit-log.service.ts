import { axiosInstance } from "@/lib/axios";
import type{AuditLog,AuditLogFilters}from"../types/audit-log.types";
export async function listAuditLogsClient(filters:AuditLogFilters={}){const{data}=await axiosInstance.get("/audit-log",{params:filters});return data.data as{items:AuditLog[];meta:{total:number;page:number;pageSize:number;pageCount:number}};}
export async function getAuditLogClient(id:string){const{data}=await axiosInstance.get(`/audit-log/${id}`);return data.data as AuditLog;}
