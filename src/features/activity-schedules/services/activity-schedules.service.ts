import { axiosInstance } from "@/lib/axios";
import type { ActivitySchedule, ActivityScheduleFilters, CreateActivityScheduleInput, UpdateActivityScheduleInput, ActivityScheduleStatus } from "../types/activity-schedule.types";
type Item={data:ActivitySchedule}; type List={data:ActivitySchedule[]};
export const listActivitySchedulesClient=async(params?:ActivityScheduleFilters)=>(await axiosInstance.get<List>("/activity-schedules",{params})).data.data;
export const getActivityScheduleClient=async(id:string)=>(await axiosInstance.get<Item>(`/activity-schedules/${id}`)).data.data;
export const createActivityScheduleClient=async(input:CreateActivityScheduleInput)=>(await axiosInstance.post<Item>("/activity-schedules",input)).data.data;
export const updateActivityScheduleClient=async(id:string,input:UpdateActivityScheduleInput)=>(await axiosInstance.patch<Item>(`/activity-schedules/${id}`,input)).data.data;
export const changeActivityScheduleStatusClient=(id:string,estado:ActivityScheduleStatus)=>updateActivityScheduleClient(id,{estado});

